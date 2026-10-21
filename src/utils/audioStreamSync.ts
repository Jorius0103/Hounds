// Gerenciador de Transmissão e Reprodução de Áudio WebRTC P2P para Trilha Sonora
// Permite que um usuário transmita áudio de uma aba (Spotify, YouTube, etc.) para todos os outros usuários online

export interface AudioStreamState {
  isBroadcasting: boolean;      // Se este usuário está transmitindo
  hasActiveBroadcast: boolean;  // Se há alguma transmissão ativa na sala
  broadcasterName: string | null;
  broadcasterClientId: string | null;
  trackTitle: string | null;    // Nome da música/artista capturado da aba (ex: "Black • Pearl Jam")
  volume: number;               // 0 a 100
  isMuted: boolean;
  needsInteraction: boolean;    // Verdadeiro se o navegador bloqueou o autoplay
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:stun.services.mozilla.com' },
    { urls: 'stun:stun.sipgate.net:3478' },
  ],
};

function cleanTrackTitle(label?: string): string {
  if (!label) return '';
  let t = String(label).trim();
  if (t.indexOf('web-contents-media-stream') >= 0 || t.indexOf('screen:') === 0 || t.indexOf('window:') === 0) {
    return '';
  }
  t = t.replace(/\s*[-–—|]\s*(Spotify|YouTube|Web Player|Brave|Google Chrome|Microsoft Edge).*$/i, '');
  t = t.replace(/^(Spotify|YouTube)\s*[-–—|]\s*(Web Player:\s*)?/i, '');
  return t.trim();
}

class AudioStreamSyncService {
  private localStream: MediaStream | null = null;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private pendingCandidates: Map<string, RTCIceCandidateInit[]> = new Map();
  private receiverPc: RTCPeerConnection | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private myClientId: string = '';
  private sendSignalCallback: ((payload: any) => void) | null = null;
  private listeners: ((state: AudioStreamState) => void)[] = [];
  private announceInterval: ReturnType<typeof setInterval> | null = null;

  private state: AudioStreamState = {
    isBroadcasting: false,
    hasActiveBroadcast: false,
    broadcasterName: null,
    broadcasterClientId: null,
    trackTitle: null,
    volume: 80,
    isMuted: false,
    needsInteraction: false,
  };

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const savedVol = localStorage.getItem('gurps_music_volume');
        if (savedVol !== null) {
          const parsed = Number(savedVol);
          if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
            this.state.volume = parsed;
          }
        }
        const savedMute = localStorage.getItem('gurps_music_muted');
        if (savedMute !== null) {
          this.state.isMuted = savedMute === 'true';
        }
      } catch (e) {
        console.warn('Erro ao carregar configurações de volume', e);
      }
      this.ensureAudioElement();
    }
  }

  public init(myClientId: string, sendSignal: (payload: any) => void) {
    this.myClientId = myClientId;
    this.sendSignalCallback = sendSignal;
    this.ensureAudioElement();
    setTimeout(() => {
      this.sendSignal({ type: 'AUDIO_STREAM_QUERY' });
    }, 350);
  }

  public promptEditTrackTitle() {
    const current = this.state.trackTitle || '';
    const updated = window.prompt('Nome da música e artista:', current);
    if (updated !== null && updated.trim()) {
      this.setTrackTitle(updated.trim());
    }
  }

  private ensureAudioElement(): HTMLAudioElement | null {
    if (typeof document === 'undefined') return null;
    if (!this.audioElement) {
      let el = document.getElementById('gurps-stream-audio-player') as HTMLAudioElement;
      if (!el) {
        el = document.createElement('audio');
        el.id = 'gurps-stream-audio-player';
        el.autoplay = true;
        el.playsInline = true;
        (el as any).webkitPlaysInline = true;
        el.style.display = 'none';
        document.body.appendChild(el);
      }
      this.audioElement = el;
      this.audioElement.volume = this.state.volume / 100;
      this.audioElement.muted = this.state.isMuted;
    }
    return this.audioElement;
  }

  public getState(): AudioStreamState {
    return { ...this.state };
  }

  public subscribe(listener: (state: AudioStreamState) => void): () => void {
    this.listeners.push(listener);
    listener(this.getState());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    const s = this.getState();
    this.listeners.forEach((l) => l(s));
  }

  public setVolume(vol: number) {
    const clamped = Math.max(0, Math.min(100, Math.round(vol)));
    this.state.volume = clamped;
    try {
      localStorage.setItem('gurps_music_volume', String(clamped));
    } catch {}
    if (this.audioElement) {
      this.audioElement.volume = clamped / 100;
    }
    if (clamped > 0 && this.state.isMuted) {
      this.setMuted(false);
    } else {
      this.notify();
    }
  }

  public setMuted(muted: boolean) {
    this.state.isMuted = muted;
    try {
      localStorage.setItem('gurps_music_muted', String(muted));
    } catch {}
    if (this.audioElement) {
      this.audioElement.muted = muted;
    }
    this.notify();
  }

  public toggleMute() {
    this.setMuted(!this.state.isMuted);
  }

  public unlockAudio() {
    const el = this.ensureAudioElement();
    if (el) {
      el.play()
        .then(() => {
          this.state.needsInteraction = false;
          this.notify();
        })
        .catch((e) => {
          console.warn('Falha ao desbloquear áudio:', e);
        });
    }
  }

  public setTrackTitle(title: string) {
    this.state.trackTitle = title;
    this.notify();
    if (this.state.isBroadcasting) {
      this.sendSignal({
        type: 'AUDIO_STREAM_ANNOUNCE',
        active: true,
        broadcasterClientId: this.myClientId,
        broadcasterName: this.state.broadcasterName || 'Mestre',
        trackTitle: this.state.trackTitle,
      });
    }
  }

  // Inicia a captura de áudio da aba (Spotify, YouTube, etc.)
  public async startBroadcasting(broadcasterName: string = 'Mestre'): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) {
      alert('Seu navegador não suporta compartilhamento de áudio por getDisplayMedia.');
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      } as any);

      const audioTracks = stream.getAudioTracks();
      if (!audioTracks || audioTracks.length === 0) {
        stream.getTracks().forEach((t) => t.stop());
        alert(
          'Nenhum áudio foi detectado!\n\nCertifique-se de marcar a opção "Compartilhar áudio da aba" na janela de seleção do navegador.'
        );
        return false;
      }

      const videoTrack = stream.getVideoTracks()[0];
      const rawLabel = videoTrack?.label || '';
      let tabTitle = cleanTrackTitle(rawLabel);

      if (!tabTitle || rawLabel.indexOf('web-contents-media-stream') >= 0) {
        const promptTitle = window.prompt(
          'Nome da música e artista sendo tocados no Spotify / Browser (ex: Black • Pearl Jam):',
          'Black • Pearl Jam'
        );
        if (promptTitle && promptTitle.trim()) {
          tabTitle = promptTitle.trim();
        } else {
          tabTitle = 'Música / Spotify';
        }
      }

      this.localStream = stream;

      audioTracks[0].onended = () => {
        this.stopBroadcasting();
      };
      if (videoTrack) {
        videoTrack.onended = () => {
          this.stopBroadcasting();
        };
      }

      this.state.isBroadcasting = true;
      this.state.hasActiveBroadcast = true;
      this.state.broadcasterName = broadcasterName;
      this.state.broadcasterClientId = this.myClientId;
      this.state.trackTitle = tabTitle;
      this.notify();

      this.sendSignal({
        type: 'AUDIO_STREAM_ANNOUNCE',
        active: true,
        broadcasterClientId: this.myClientId,
        broadcasterName,
        trackTitle: this.state.trackTitle,
      });

      if (this.announceInterval) clearInterval(this.announceInterval);
      this.announceInterval = setInterval(() => {
        if (this.state.isBroadcasting && this.localStream?.active) {
          this.sendSignal({
            type: 'AUDIO_STREAM_ANNOUNCE',
            active: true,
            broadcasterClientId: this.myClientId,
            broadcasterName: this.state.broadcasterName || 'Mestre',
            trackTitle: this.state.trackTitle || 'Música / Spotify',
          });
        }
      }, 5000);

      return true;
    } catch (err: any) {
      if (err.name !== 'NotAllowedError') {
        console.error('Erro ao iniciar captura de áudio:', err);
        alert('Não foi possível iniciar a transmissão: ' + (err?.message || err));
      }
      return false;
    }
  }

  // Encerra a transmissão de áudio
  public stopBroadcasting() {
    if (this.announceInterval) {
      clearInterval(this.announceInterval);
      this.announceInterval = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }

    this.peerConnections.forEach((pc) => {
      try {
        pc.close();
      } catch {}
    });
    this.peerConnections.clear();
    this.pendingCandidates.clear();

    const wasBroadcasting = this.state.isBroadcasting;
    this.state.isBroadcasting = false;
    this.state.hasActiveBroadcast = false;
    this.state.broadcasterName = null;
    this.state.broadcasterClientId = null;
    this.state.trackTitle = null;
    this.notify();

    if (wasBroadcasting) {
      this.sendSignal({
        type: 'AUDIO_STREAM_ANNOUNCE',
        active: false,
        broadcasterClientId: this.myClientId,
      });
    }
  }

  private sendSignal(payload: any) {
    const full = {
      ...payload,
      clientId: this.myClientId,
      senderClientId: this.myClientId,
      timestamp: Date.now(),
    };
    if (this.sendSignalCallback) {
      try {
        this.sendSignalCallback(full);
      } catch (e) {}
    }
    try {
      if (typeof window !== 'undefined' && (window as any).parent?.hubMesaBus) {
        (window as any).parent.hubMesaBus.publish(JSON.stringify(full));
      }
    } catch (e) {}
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        new BroadcastChannel('gurps_combat_sync_channel_v1').postMessage(full);
      }
    } catch (e) {}
  }

  private async flushCandidates(peerId: string, pc: RTCPeerConnection) {
    const queue = this.pendingCandidates.get(peerId) || [];
    this.pendingCandidates.delete(peerId);
    for (const cand of queue) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(cand));
      } catch (e) {
        console.warn('Erro ao aplicar candidato ICE:', e);
      }
    }
  }

  // Trata mensagens de sinalização recebidas via MQTT
  public handleSignalMessage(payload: any) {
    if (!payload || payload.senderClientId === this.myClientId) return;

    switch (payload.type) {
      case 'AUDIO_STREAM_QUERY': {
        if (this.state.isBroadcasting && this.localStream && this.localStream.active) {
          this.sendSignal({
            type: 'AUDIO_STREAM_ANNOUNCE',
            active: true,
            broadcasterClientId: this.myClientId,
            broadcasterName: this.state.broadcasterName || 'Mestre',
            trackTitle: this.state.trackTitle || 'Música / Spotify',
          });
        }
        break;
      }

      case 'AUDIO_STREAM_ANNOUNCE': {
        if (payload.active) {
          this.state.hasActiveBroadcast = true;
          this.state.broadcasterClientId = payload.broadcasterClientId;
          this.state.broadcasterName = payload.broadcasterName || 'Mestre';
          if (payload.trackTitle) this.state.trackTitle = payload.trackTitle;
          this.notify();

          if (!this.state.isBroadcasting && payload.broadcasterClientId !== this.myClientId) {
            if (!this.receiverPc || this.receiverPc.connectionState === 'disconnected' || this.receiverPc.connectionState === 'failed') {
              this.sendSignal({
                type: 'AUDIO_STREAM_REQUEST',
                targetClientId: payload.broadcasterClientId,
              });
            }
          }
        } else {
          if (this.state.broadcasterClientId === payload.broadcasterClientId) {
            this.state.hasActiveBroadcast = false;
            this.state.broadcasterClientId = null;
            this.state.broadcasterName = null;
            this.state.trackTitle = null;
            this.state.needsInteraction = false;
            if (this.receiverPc) {
              try {
                this.receiverPc.close();
              } catch {}
              this.receiverPc = null;
            }
            if (this.audioElement) {
              this.audioElement.srcObject = null;
            }
            this.notify();
          }
        }
        break;
      }

      case 'AUDIO_STREAM_REQUEST': {
        if (this.state.isBroadcasting && this.localStream && payload.targetClientId === this.myClientId) {
          const listenerId = payload.senderClientId;
          this.setupTransmitterConnection(listenerId);
        }
        break;
      }

      case 'RTC_OFFER': {
        if (payload.targetClientId === this.myClientId) {
          this.handleRtcOffer(payload.senderClientId, payload.offer);
        }
        break;
      }

      case 'RTC_ANSWER': {
        if (payload.targetClientId === this.myClientId && this.state.isBroadcasting) {
          const pc = this.peerConnections.get(payload.senderClientId);
          if (pc) {
            pc.setRemoteDescription(new RTCSessionDescription(payload.answer))
              .then(() => {
                this.flushCandidates(payload.senderClientId, pc);
              })
              .catch((e) => {
                console.warn('Erro ao aplicar RTC_ANSWER:', e);
              });
          }
        }
        break;
      }

      case 'RTC_ICE_CANDIDATE': {
        if (payload.targetClientId === this.myClientId && payload.candidate) {
          const pc = this.state.isBroadcasting
            ? this.peerConnections.get(payload.senderClientId)
            : this.receiverPc;
          if (pc && pc.remoteDescription && pc.remoteDescription.type) {
            pc.addIceCandidate(new RTCIceCandidate(payload.candidate)).catch(() => {});
          } else {
            const sid = payload.senderClientId;
            if (!this.pendingCandidates.has(sid)) {
              this.pendingCandidates.set(sid, []);
            }
            this.pendingCandidates.get(sid)!.push(payload.candidate);
          }
        }
        break;
      }
    }
  }

  // Configura a conexão P2P de saída para um ouvinte específico
  private async setupTransmitterConnection(listenerClientId: string) {
    if (!this.localStream) return;

    const existing = this.peerConnections.get(listenerClientId);
    if (existing) {
      try {
        existing.close();
      } catch {}
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    this.peerConnections.set(listenerClientId, pc);

    // Apenas áudio
    this.localStream.getAudioTracks().forEach((track) => {
      pc.addTrack(track, this.localStream!);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal({
          type: 'RTC_ICE_CANDIDATE',
          targetClientId: listenerClientId,
          candidate: event.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        try {
          pc.close();
        } catch {}
        this.peerConnections.delete(listenerClientId);
      }
    };

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      this.sendSignal({
        type: 'RTC_OFFER',
        targetClientId: listenerClientId,
        offer,
      });
    } catch (e) {
      console.warn('Erro ao criar RTC Offer para ouvinte:', e);
    }
  }

  // O ouvinte processa a oferta recebida do streamer
  private async handleRtcOffer(broadcasterId: string, offer: RTCSessionDescriptionInit) {
    if (this.receiverPc) {
      try {
        this.receiverPc.close();
      } catch {}
      this.receiverPc = null;
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    this.receiverPc = pc;

    pc.ontrack = (event) => {
      const audioEl = this.ensureAudioElement();
      if (audioEl && event.streams && event.streams[0]) {
        audioEl.srcObject = event.streams[0];
        audioEl.volume = this.state.volume / 100;
        audioEl.muted = this.state.isMuted;
        const playPromise = audioEl.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              this.state.needsInteraction = false;
              this.notify();
            })
            .catch((err) => {
              console.warn('Autoplay bloqueado pelo navegador, aguardando clique do usuário:', err);
              this.state.needsInteraction = true;
              this.notify();
            });
        }
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal({
          type: 'RTC_ICE_CANDIDATE',
          targetClientId: broadcasterId,
          candidate: event.candidate,
        });
      }
    };

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      await this.flushCandidates(broadcasterId, pc);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      this.sendSignal({
        type: 'RTC_ANSWER',
        targetClientId: broadcasterId,
        answer,
      });
    } catch (e) {
      console.warn('Erro ao responder RTC Offer:', e);
    }
  }
}

export const audioStreamSync = new AudioStreamSyncService();
