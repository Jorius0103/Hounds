/* =====================================================================
   Hounds — Transmissão e Reprodução de Áudio WebRTC P2P (Trilha Sonora / Spotify)
   Captura áudio de abas do navegador (Spotify Web Player, YouTube, etc.)
   e faz streaming direto ponto-a-ponto via WebRTC para todos os clientes online.
   ===================================================================== */
(function (root) {
  'use strict';

  var ICE_SERVERS = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ]
  };

  var state = {
    isBroadcasting: false,
    hasActiveBroadcast: false,
    broadcasterName: null,
    broadcasterClientId: null,
    volume: 80,
    isMuted: false
  };

  var localStream = null;
  var peerConnections = {}; // listenerClientId -> RTCPeerConnection
  var receiverPc = null;
  var audioElement = null;
  var myClientId = '';
  var sendSignalFn = null;
  var listeners = [];
  var announceInterval = null;

  try {
    var v = localStorage.getItem('gurps_music_volume');
    if (v !== null) {
      var num = Number(v);
      if (!isNaN(num) && num >= 0 && num <= 100) state.volume = num;
    }
    var m = localStorage.getItem('gurps_music_muted');
    if (m !== null) state.isMuted = (m === 'true');
  } catch (e) {}

  function ensureAudio() {
    if (typeof document === 'undefined') return null;
    if (!audioElement) {
      var el = document.getElementById('gurps-stream-audio-player');
      if (!el) {
        el = document.createElement('audio');
        el.id = 'gurps-stream-audio-player';
        el.autoplay = true;
        el.playsInline = true;
        el.style.display = 'none';
        document.body.appendChild(el);
      }
      audioElement = el;
      audioElement.volume = state.volume / 100;
      audioElement.muted = state.isMuted;
    }
    return audioElement;
  }

  function notify() {
    var s = Object.assign({}, state);
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](s); } catch (e) { console.error(e); }
    }
  }

  function sendSignal(payload) {
    if (typeof sendSignalFn === 'function') {
      sendSignalFn(Object.assign({}, payload, {
        senderClientId: myClientId,
        timestamp: Date.now()
      }));
    }
  }

  var AudioStreamSync = {
    init: function (cid, signalFn) {
      myClientId = cid;
      sendSignalFn = signalFn;
      ensureAudio();
    },

    getState: function () {
      return Object.assign({}, state);
    },

    subscribe: function (fn) {
      listeners.push(fn);
      try { fn(AudioStreamSync.getState()); } catch (e) {}
      return function () {
        listeners = listeners.filter(function (l) { return l !== fn; });
      };
    },

    setVolume: function (vol) {
      var clamped = Math.max(0, Math.min(100, Math.round(vol)));
      state.volume = clamped;
      try { localStorage.setItem('gurps_music_volume', String(clamped)); } catch (e) {}
      if (audioElement) {
        audioElement.volume = clamped / 100;
      }
      if (clamped > 0 && state.isMuted) {
        AudioStreamSync.setMuted(false);
      } else {
        notify();
      }
    },

    setMuted: function (muted) {
      state.isMuted = !!muted;
      try { localStorage.setItem('gurps_music_muted', String(state.isMuted)); } catch (e) {}
      if (audioElement) {
        audioElement.muted = state.isMuted;
      }
      notify();
    },

    toggleMute: function () {
      AudioStreamSync.setMuted(!state.isMuted);
    },

    startBroadcasting: async function (broadcasterName) {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        alert('Seu navegador não suporta compartilhamento de áudio por getDisplayMedia.');
        return false;
      }

      try {
        var stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          }
        });

        var audioTracks = stream.getAudioTracks();
        if (!audioTracks || audioTracks.length === 0) {
          stream.getTracks().forEach(function (t) { t.stop(); });
          alert('Nenhum áudio foi detectado!\n\nCertifique-se de marcar a opção "Compartilhar áudio da aba" na janela de seleção do navegador.');
          return false;
        }

        // Para os tracks de vídeo para economizar CPU e banda
        stream.getVideoTracks().forEach(function (t) {
          t.stop();
          stream.removeTrack(t);
        });

        localStream = stream;

        audioTracks[0].onended = function () {
          AudioStreamSync.stopBroadcasting();
        };

        state.isBroadcasting = true;
        state.hasActiveBroadcast = true;
        state.broadcasterName = broadcasterName || 'Mestre';
        state.broadcasterClientId = myClientId;
        notify();

        sendSignal({
          type: 'AUDIO_STREAM_ANNOUNCE',
          active: true,
          broadcasterClientId: myClientId,
          broadcasterName: state.broadcasterName
        });

        if (announceInterval) clearInterval(announceInterval);
        announceInterval = setInterval(function () {
          if (state.isBroadcasting && localStream && localStream.active) {
            sendSignal({
              type: 'AUDIO_STREAM_ANNOUNCE',
              active: true,
              broadcasterClientId: myClientId,
              broadcasterName: state.broadcasterName || 'Mestre'
            });
          }
        }, 10000);

        return true;
      } catch (err) {
        if (err && err.name !== 'NotAllowedError') {
          console.error('Erro ao iniciar transmissão:', err);
          alert('Não foi possível iniciar a transmissão: ' + (err.message || err));
        }
        return false;
      }
    },

    stopBroadcasting: function () {
      if (announceInterval) {
        clearInterval(announceInterval);
        announceInterval = null;
      }

      if (localStream) {
        localStream.getTracks().forEach(function (t) { t.stop(); });
        localStream = null;
      }

      Object.keys(peerConnections).forEach(function (pid) {
        try { peerConnections[pid].close(); } catch (e) {}
      });
      peerConnections = {};

      var was = state.isBroadcasting;
      state.isBroadcasting = false;
      state.hasActiveBroadcast = false;
      state.broadcasterName = null;
      state.broadcasterClientId = null;
      notify();

      if (was) {
        sendSignal({
          type: 'AUDIO_STREAM_ANNOUNCE',
          active: false,
          broadcasterClientId: myClientId
        });
      }
    },

    handleSignalMessage: function (payload) {
      if (!payload || payload.senderClientId === myClientId) return;

      switch (payload.type) {
        case 'AUDIO_STREAM_ANNOUNCE':
          if (payload.active) {
            state.hasActiveBroadcast = true;
            state.broadcasterClientId = payload.broadcasterClientId;
            state.broadcasterName = payload.broadcasterName || 'Mestre';
            notify();

            if (!state.isBroadcasting && payload.broadcasterClientId !== myClientId) {
              sendSignal({
                type: 'AUDIO_STREAM_REQUEST',
                targetClientId: payload.broadcasterClientId
              });
            }
          } else {
            if (state.broadcasterClientId === payload.broadcasterClientId) {
              state.hasActiveBroadcast = false;
              state.broadcasterClientId = null;
              state.broadcasterName = null;
              if (receiverPc) {
                try { receiverPc.close(); } catch (e) {}
                receiverPc = null;
              }
              if (audioElement) {
                audioElement.srcObject = null;
              }
              notify();
            }
          }
          break;

        case 'AUDIO_STREAM_REQUEST':
          if (state.isBroadcasting && localStream && payload.targetClientId === myClientId) {
            AudioStreamSync.setupTransmitter(payload.senderClientId);
          }
          break;

        case 'RTC_OFFER':
          if (payload.targetClientId === myClientId) {
            AudioStreamSync.handleRtcOffer(payload.senderClientId, payload.offer);
          }
          break;

        case 'RTC_ANSWER':
          if (payload.targetClientId === myClientId && state.isBroadcasting) {
            var pc = peerConnections[payload.senderClientId];
            if (pc) {
              pc.setRemoteDescription(new RTCSessionDescription(payload.answer)).catch(function (e) {
                console.warn('Erro ao aplicar RTC_ANSWER', e);
              });
            }
          }
          break;

        case 'RTC_ICE_CANDIDATE':
          if (payload.targetClientId === myClientId && payload.candidate) {
            var conn = state.isBroadcasting ? peerConnections[payload.senderClientId] : receiverPc;
            if (conn && conn.remoteDescription) {
              conn.addIceCandidate(new RTCIceCandidate(payload.candidate)).catch(function () {});
            }
          }
          break;
      }
    },

    setupTransmitter: async function (listenerId) {
      if (!localStream) return;
      if (peerConnections[listenerId]) {
        try { peerConnections[listenerId].close(); } catch (e) {}
      }

      var pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnections[listenerId] = pc;

      localStream.getAudioTracks().forEach(function (track) {
        pc.addTrack(track, localStream);
      });

      pc.onicecandidate = function (evt) {
        if (evt.candidate) {
          sendSignal({
            type: 'RTC_ICE_CANDIDATE',
            targetClientId: listenerId,
            candidate: evt.candidate
          });
        }
      };

      pc.onconnectionstatechange = function () {
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          try { pc.close(); } catch (e) {}
          delete peerConnections[listenerId];
        }
      };

      try {
        var offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignal({
          type: 'RTC_OFFER',
          targetClientId: listenerId,
          offer: offer
        });
      } catch (e) {
        console.warn('Erro ao criar RTC Offer', e);
      }
    },

    handleRtcOffer: async function (broadcasterId, offer) {
      if (receiverPc) {
        try { receiverPc.close(); } catch (e) {}
        receiverPc = null;
      }

      var pc = new RTCPeerConnection(ICE_SERVERS);
      receiverPc = pc;

      pc.ontrack = function (evt) {
        var el = ensureAudio();
        if (el && evt.streams && evt.streams[0]) {
          el.srcObject = evt.streams[0];
          el.volume = state.volume / 100;
          el.muted = state.isMuted;
          el.play().catch(function (err) {
            console.warn('Reprodução de áudio aguardando interação do usuário', err);
          });
        }
      };

      pc.onicecandidate = function (evt) {
        if (evt.candidate) {
          sendSignal({
            type: 'RTC_ICE_CANDIDATE',
            targetClientId: broadcasterId,
            candidate: evt.candidate
          });
        }
      };

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        var answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal({
          type: 'RTC_ANSWER',
          targetClientId: broadcasterId,
          answer: answer
        });
      } catch (e) {
        console.warn('Erro ao responder RTC Offer', e);
      }
    }
  };

  root.audioStreamSync = AudioStreamSync;
  if (typeof window !== 'undefined') {
    window.audioStreamSync = AudioStreamSync;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);

