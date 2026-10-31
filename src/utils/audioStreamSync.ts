// Gerenciador de Transmissão e Reprodução de Áudio WebRTC P2P para Trilha Sonora
// Permite que um usuário transmita áudio de uma aba (Spotify, YouTube, etc.) para todos os outros usuários online

export interface AudioStreamState {
  isBroadcasting: boolean;      // Se este usuário está transmitindo
  hasActiveBroadcast: boolean;  // Se há alguma transmissão ativa na sala
  broadcasterName: string | null;
  broadcasterClientId: string | null;
  broadcastId: string | null;   // Identificador único da sessão de transmissão
  trackTitle: string | null;    // Nome da música/artista capturado da aba (ex: "Black • Pearl Jam")
  volume: number;               // 0 a 100
  isMuted: boolean;
  needsInteraction: boolean;    // Verdadeiro se o navegador bloqueou o autoplay
  isPlaying: boolean;           // Verdadeiro se o elemento de áudio está ativamente tocando som
  connectionStatus: 'idle' | 'connecting' | 'connected' | 'failed';
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
    // Servidores STUN & TURN Públicos OpenRelay (Metered) para ultrapassar CGNAT e NAT Simétrico (essencial para conexões residenciais brasileiras e 4G/5G)
    { urls: 'stun:stun.relay.metered.ca:80' },
    {
      urls: 'turn:standard.relay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:standard.relay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:standard.relay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
  iceCandidatePoolSize: 2,
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
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  private state: AudioStreamState = {
    isBroadcasting: false,
    hasActiveBroadcast: false,
    broadcasterName: null,
    broadcasterClientId: null,
    broadcastId: null,
    trackTitle: null,
    volume: 80,
    isMuted: false,
    needsInteraction: false,
    isPlaying: false,
    connectionStatus: 'idle',
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
        (el as any).playsInline = true;
        (el as any).webkitPlaysInline = true;
        // Evita display: none que suspende áudio em background no Chrome/Edge
        el.style.position = 'fixed';
        el.style.width = '1px';
        el.style.height = '1px';
        el.style.opacity = '0.01';
        el.style.pointerEvents = 'none';
        el.style.bottom = '0';
        el.style.left = '0';
        document.body.appendChild(el);
      }
      this.audioElement = el;
      this.audioElement.volume = this.state.volume / 100;
      this.audioElement.muted = this.state.isMuted;

      this.audioElement.onplaying = () => {
        this.state.isPlaying = true;
        this.state.needsInteraction = false;
        this.notify();
      };
      this.audioElement.onpause = () => {
        if (this.state.hasActiveBroadcast && !this.state.isMuted) {
          this.state.isPlaying = false;
          this.notify();
        }
      };
      this.audioElement.onended = () => {
        this.state.isPlaying = false;
        this.notify();
      };
      this.audioElement.onerror = () => {
        this.state.isPlaying = false;
        this.state.connectionStatus = 'failed';
        this.notify();
      };
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
    if (this.state.isMuted) {
      this.setMuted(false);
    }
    if (this.state.volume <= 0) {
      this.setVolume(70);
    }

    if (this.state.hasActiveBroadcast && !this.state.isBroadcasting) {
      if (!this.receiverPc || this.receiverPc.connectionState !== 'connected') {
        this.requestCurrentBroadcast();
      }
    }

    if (el) {
      const playPromise = el.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            this.state.needsInteraction = false;
            this.state.isPlaying = true;
            this.notify();
          })
          .catch((e) => {
            console.warn('[AudioStreamSync] Autoplay bloqueado ao desbloquear:', e);
            this.state.needsInteraction = true;
            this.notify();
          });
      }
    }
  }

  public requestCurrentBroadcast() {
    if (!this.state.hasActiveBroadcast || !this.state.broadcasterClientId || this.state.isBroadcasting) {
      return;
    }
    console.log('[AudioStreamSync] Solicitando conexão para o transmissor:', this.state.broadcasterClientId);
    this.state.connectionStatus = 'connecting';
    this.notify();

    if (this.receiverPc) {
      try {
        this.receiverPc.close();
      } catch {}
      this.receiverPc = null;
    }

    this.sendSignal({
      type: 'AUDIO_STREAM_REQUEST',
      targetClientId: this.state.broadcasterClientId,
      broadcastId: this.state.broadcastId,
    });
  }

  public setTrackTitle(title: string) {
    this.state.trackTitle = title;
    this.notify();
    if (this.state.isBroadcasting) {
      this.sendSignal({
        type: 'AUDIO_STREAM_ANNOUNCE',
        active: true,
        broadcastId: this.state.broadcastId,
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
          suppressLocalAudioPlayback: true,
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

      audioTracks[0].enabled = true;

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

      // Retorno de áudio local para o streamer:
      // O Hounds reproduz localmente com o volume definido pelo slider da aplicação.
      const el = this.ensureAudioElement();
      if (el) {
        try {
          el.srcObject = new MediaStream([audioTracks[0]]);
          el.volume = this.state.volume / 100;
          el.muted = this.state.isMuted;
          const p = el.play();
          if (p !== undefined) {
            p.catch((e) => {
              console.warn('Playback do monitor local bloqueado pelo navegador:', e);
            });
          }
        } catch (e) {
          console.warn('Erro ao configurar monitor de áudio local:', e);
        }
      }

      audioTracks[0].onended = () => {
        this.stopBroadcasting();
      };
      if (videoTrack) {
        videoTrack.onended = () => {
          this.stopBroadcasting();
        };
      }

      const newBroadcastId = `stream_${this.myClientId}_${Date.now()}`;
      this.state.isBroadcasting = true;
      this.state.hasActiveBroadcast = true;
      this.state.broadcasterName = broadcasterName;
      this.state.broadcasterClientId = this.myClientId;
      this.state.broadcastId = newBroadcastId;
      this.state.trackTitle = tabTitle;
      this.state.isPlaying = true;
      this.state.connectionStatus = 'connected';
      this.notify();

      this.sendSignal({
        type: 'AUDIO_STREAM_ANNOUNCE',
        active: true,
        broadcastId: newBroadcastId,
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
            broadcastId: this.state.broadcastId,
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
  public stopBroadcasting(silent: boolean = false) {
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
    const oldBroadcastId = this.state.broadcastId;
    this.state.isBroadcasting = false;
    if (this.audioElement && wasBroadcasting) {
      try {
        this.audioElement.srcObject = null;
      } catch {}
    }
    if (!silent) {
      this.state.hasActiveBroadcast = false;
      this.state.broadcasterName = null;
      this.state.broadcasterClientId = null;
      this.state.broadcastId = null;
      this.state.trackTitle = null;
      this.state.isPlaying = false;
      this.state.connectionStatus = 'idle';
    }
    this.notify();

    if (wasBroadcasting && !silent) {
      this.sendSignal({
        type: 'AUDIO_STREAM_ANNOUNCE',
        active: false,
        broadcastId: oldBroadcastId,
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
        console.warn('[AudioStreamSync] Erro ao aplicar candidato ICE:', e);
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
            broadcastId: this.state.broadcastId,
            broadcasterClientId: this.myClientId,
            broadcasterName: this.state.broadcasterName || 'Mestre',
            trackTitle: this.state.trackTitle || 'Música / Spotify',
          });
        }
        break;
      }

      case 'AUDIO_STREAM_ANNOUNCE': {
        if (payload.active) {
          // Se eu estava transmitindo e outro usuário assumiu a transmissão: encerra o meu stream local
          if (this.state.isBroadcasting && payload.broadcasterClientId !== this.myClientId) {
            console.log('Outro usuário assumiu a transmissão de áudio. Encerrando stream local.');
            this.stopBroadcasting(true /* silent */);
          }

          const isNewBroadcast = Boolean(payload.broadcastId && payload.broadcastId !== this.state.broadcastId);
          const isNewBroadcaster = payload.broadcasterClientId !== this.state.broadcasterClientId;

          this.state.hasActiveBroadcast = true;
          this.state.broadcasterClientId = payload.broadcasterClientId;
          this.state.broadcasterName = payload.broadcasterName || 'Mestre';
          if (payload.broadcastId) {
            this.state.broadcastId = payload.broadcastId;
          }
          if (payload.trackTitle) this.state.trackTitle = payload.trackTitle;
          this.notify();

          // Se não sou o streamer e mudou o streamer ou transmissão:
          if (!this.state.isBroadcasting && payload.broadcasterClientId !== this.myClientId) {
            if (isNewBroadcast || isNewBroadcaster) {
              console.log('[AudioStreamSync] Nova transmissão detectada. Conectando...');
              if (this.receiverPc) {
                try {
                  this.receiverPc.close();
                } catch {}
                this.receiverPc = null;
              }
              this.state.isPlaying = false;
              this.state.connectionStatus = 'connecting';
              this.notify();
              this.requestCurrentBroadcast();
            } else if (
              !this.receiverPc ||
              this.receiverPc.connectionState === 'disconnected' ||
              this.receiverPc.connectionState === 'failed' ||
              this.receiverPc.connectionState === 'closed'
            ) {
              this.requestCurrentBroadcast();
            }
          }
        } else {
          // Transmissão encerrada
          if (this.state.broadcasterClientId === payload.broadcasterClientId) {
            this.state.hasActiveBroadcast = false;
            this.state.broadcasterClientId = null;
            this.state.broadcasterName = null;
            this.state.broadcastId = null;
            this.state.trackTitle = null;
            this.state.needsInteraction = false;
            this.state.isPlaying = false;
            this.state.connectionStatus = 'idle';
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
                console.warn('[AudioStreamSync] Erro ao aplicar RTC_ANSWER:', e);
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
            try {
              pc.addIceCandidate(new RTCIceCandidate(payload.candidate)).catch((e) => {
                console.warn('[AudioStreamSync] Falha ao adicionar ICE Candidate:', e);
              });
            } catch (e) {
              console.warn('[AudioStreamSync] Erro ao instanciar candidato ICE:', e);
            }
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

    const audioTracks = this.localStream.getAudioTracks();
    if (!audioTracks || audioTracks.length === 0) {
      console.warn('[AudioStreamSync] Stream local não possui faixa de áudio.');
      return;
    }

    const existing = this.peerConnections.get(listenerClientId);
    if (existing) {
      try {
        existing.close();
      } catch {}
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    this.peerConnections.set(listenerClientId, pc);

    // Garante que a faixa esteja ativada e adicionada
    audioTracks.forEach((track) => {
      track.enabled = true;
      pc.addTrack(track, this.localStream!);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal({
          type: 'RTC_ICE_CANDIDATE',
          targetClientId: listenerClientId,
          candidate: event.candidate.toJSON ? event.candidate.toJSON() : event.candidate,
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
      console.warn('[AudioStreamSync] Erro ao criar RTC Offer para ouvinte:', e);
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
    this.state.connectionStatus = 'connecting';
    this.notify();

    pc.ontrack = (event) => {
      console.log('[AudioStreamSync] Faixa de áudio recebida do streamer:', event.track);
      const audioEl = this.ensureAudioElement();
      if (!audioEl) return;

      const remoteStream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);
      audioEl.srcObject = remoteStream;
      audioEl.volume = this.state.volume / 100;
      audioEl.muted = this.state.isMuted;

      const triggerPlayback = () => {
        const playPromise = audioEl.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              this.state.needsInteraction = false;
              this.state.isPlaying = true;
              this.state.connectionStatus = 'connected';
              this.notify();
            })
            .catch((err) => {
              console.warn('[AudioStreamSync] Autoplay bloqueado pelo navegador, aguardando clique do usuário:', err);
              this.state.needsInteraction = true;
              this.state.isPlaying = false;
              this.notify();
            });
        }
      };

      triggerPlayback();

      event.track.onunmute = () => {
        console.log('[AudioStreamSync] Faixa de áudio recebendo pacotes RTP (onunmute)');
        triggerPlayback();
      };

      event.track.onended = () => {
        this.state.isPlaying = false;
        this.notify();
      };
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal({
          type: 'RTC_ICE_CANDIDATE',
          targetClientId: broadcasterId,
          candidate: event.candidate.toJSON ? event.candidate.toJSON() : event.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('[AudioStreamSync] Estado da conexão receptor:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        this.state.connectionStatus = 'connected';
        this.notify();
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        this.state.connectionStatus = 'failed';
        this.state.isPlaying = false;
        this.notify();
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[AudioStreamSync] Estado ICE receptor:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        this.state.connectionStatus = 'connected';
        this.notify();
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
      console.warn('[AudioStreamSync] Erro ao responder RTC Offer:', e);
      this.state.connectionStatus = 'failed';
      this.notify();
    }
  }
}

export const audioStreamSync = new AudioStreamSyncService();
