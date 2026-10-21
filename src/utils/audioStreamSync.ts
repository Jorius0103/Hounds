// Gerenciador de Transmissão e Reprodução de Áudio WebRTC P2P para Trilha Sonora
// Permite que um usuário transmita áudio de uma aba (Spotify, YouTube, etc.) para todos os outros usuários online

export interface AudioStreamState {
  isBroadcasting: boolean;      // Se este usuário está transmitindo
  hasActiveBroadcast: boolean;  // Se há alguma transmissão ativa na sala
  broadcasterName: string | null;
  broadcasterClientId: string | null;
  volume: number;               // 0 a 100
  isMuted: boolean;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

class AudioStreamSyncService {
  private localStream: MediaStream | null = null;
  private peerConnections: Map<string, RTCPeerConnection> = new Map(); // Para transmissor: targetClientId -> RTCPeerConnection
  private receiverPc: RTCPeerConnection | null = null;                 // Para receptor: conexão com o transmissor
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
    volume: 80,
    isMuted: false,
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

  // Inicia a captura de áudio da aba (Spotify, YouTube, etc.)
  public async startBroadcasting(broadcasterName: string = 'Mestre'): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) {
      alert('Seu navegador não suporta compartilhamento de áudio por getDisplayMedia.');
      return false;
    }

    try {
      // Solicita captura de tela/aba com áudio
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true, // Necessário na maioria dos navegadores para selecionar abas
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

      // Desativa os tracks de vídeo imediatamente para economizar banda e CPU
      stream.getVideoTracks().forEach((t) => {
        t.stop();
        stream.removeTrack(t);
      });

      this.localStream = stream;

      // Monitora o encerramento do compartilhamento (ex: botão "Parar compartilhamento" do navegador)
      audioTracks[0].onended = () => {
        this.stopBroadcasting();
      };

      this.state.isBroadcasting = true;
      this.state.hasActiveBroadcast = true;
      this.state.broadcasterName = broadcasterName;
      this.state.broadcasterClientId = this.myClientId;
      this.notify();

      // Anuncia aos outros clientes que a transmissão iniciou
      this.sendSignal({
        type: 'AUDIO_STREAM_ANNOUNCE',
        active: true,
        broadcasterClientId: this.myClientId,
        broadcasterName,
      });

      // Re-anuncia periodicamente a cada 10s para novos jogadores que entrarem na sala
      if (this.announceInterval) clearInterval(this.announceInterval);
      this.announceInterval = setInterval(() => {
        if (this.state.isBroadcasting && this.localStream?.active) {
          this.sendSignal({
            type: 'AUDIO_STREAM_ANNOUNCE',
            active: true,
            broadcasterClientId: this.myClientId,
            broadcasterName: this.state.broadcasterName || 'Mestre',
          });
        }
      }, 10000);

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

    // Fecha todas as conexões P2P ativas de transmissão
    this.peerConnections.forEach((pc) => {
      try {
        pc.close();
      } catch {}
    });
    this.peerConnections.clear();

    const wasBroadcasting = this.state.isBroadcasting;
    this.state.isBroadcasting = false;
    this.state.hasActiveBroadcast = false;
    this.state.broadcasterName = null;
    this.state.broadcasterClientId = null;
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
    if (this.sendSignalCallback) {
      this.sendSignalCallback({
        ...payload,
        senderClientId: this.myClientId,
        timestamp: Date.now(),
      });
    }
  }

  // Trata mensagens de sinalização recebidas via MQTT
  public handleSignalMessage(payload: any) {
    if (!payload || payload.senderClientId === this.myClientId) return;

    switch (payload.type) {
      case 'AUDIO_STREAM_ANNOUNCE': {
        if (payload.active) {
          this.state.hasActiveBroadcast = true;
          this.state.broadcasterClientId = payload.broadcasterClientId;
          this.state.broadcasterName = payload.broadcasterName || 'Mestre';
          this.notify();

          // Se não sou o streamer e ainda não conectei o áudio, solicita ao streamer
          if (!this.state.isBroadcasting && payload.broadcasterClientId !== this.myClientId) {
            this.sendSignal({
              type: 'AUDIO_STREAM_REQUEST',
              targetClientId: payload.broadcasterClientId,
            });
          }
        } else {
          // Transmissão foi encerrada
          if (this.state.broadcasterClientId === payload.broadcasterClientId) {
            this.state.hasActiveBroadcast = false;
            this.state.broadcasterClientId = null;
            this.state.broadcasterName = null;
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
        // Recebido pelo streamer quando um ouvinte pede para receber o áudio
        if (this.state.isBroadcasting && this.localStream && payload.targetClientId === this.myClientId) {
          const listenerId = payload.senderClientId;
          this.setupTransmitterConnection(listenerId);
        }
        break;
      }

      case 'RTC_OFFER': {
        // Recebido pelo ouvinte com a oferta do streamer
        if (payload.targetClientId === this.myClientId) {
          this.handleRtcOffer(payload.senderClientId, payload.offer);
        }
        break;
      }

      case 'RTC_ANSWER': {
        // Recebido pelo streamer com a resposta do ouvinte
        if (payload.targetClientId === this.myClientId && this.state.isBroadcasting) {
          const pc = this.peerConnections.get(payload.senderClientId);
          if (pc) {
            pc.setRemoteDescription(new RTCSessionDescription(payload.answer)).catch((e) => {
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
          if (pc && pc.remoteDescription) {
            pc.addIceCandidate(new RTCIceCandidate(payload.candidate)).catch(() => {});
          }
        }
        break;
      }
    }
  }

  // Configura a conexão P2P de saída para um ouvinte específico
  private async setupTransmitterConnection(listenerClientId: string) {
    if (!this.localStream) return;

    // Se já existe uma conexão para este ouvinte, encerra a anterior
    const existing = this.peerConnections.get(listenerClientId);
    if (existing) {
      try {
        existing.close();
      } catch {}
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    this.peerConnections.set(listenerClientId, pc);

    // Adiciona os tracks de áudio da captura
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
        audioEl.play().catch((err) => {
          console.warn('Reprodução automática de áudio aguardando clique do usuário:', err);
        });
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

