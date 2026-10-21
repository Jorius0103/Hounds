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
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' },
      { urls: 'stun:stun.services.mozilla.com' },
      { urls: 'stun:stun.sipgate.net:3478' }
    ]
  };

  var state = {
    isBroadcasting: false,
    hasActiveBroadcast: false,
    broadcasterName: null,
    broadcasterClientId: null,
    trackTitle: null,
    volume: 80,
    isMuted: false,
    needsInteraction: false // Verdadeiro se o navegador bloqueou o autoplay
  };

  var localStream = null;
  var peerConnections = {};      // listenerClientId -> RTCPeerConnection
  var pendingCandidates = {};    // peerId -> [RTCIceCandidateInit, ...]
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

  function cleanTrackTitle(label) {
    if (!label) return '';
    var t = String(label).trim();
    if (t.indexOf('web-contents-media-stream') >= 0 || t.indexOf('screen:') === 0 || t.indexOf('window:') === 0) {
      return '';
    }
    // Limpa sufixos e prefixos de navegador e player
    t = t.replace(/\s*[-–—|]\s*(Spotify|YouTube|Web Player|Brave|Google Chrome|Microsoft Edge).*$/i, '');
    t = t.replace(/^(Spotify|YouTube)\s*[-–—|]\s*(Web Player:\s*)?/i, '');
    return t.trim();
  }

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
    var full = Object.assign({}, payload, {
      clientId: myClientId,
      senderClientId: myClientId,
      timestamp: Date.now()
    });
    if (typeof sendSignalFn === 'function') {
      try { sendSignalFn(full); } catch (e) {}
    }
    try {
      if (typeof window !== 'undefined' && window.parent && window.parent.hubMesaBus) {
        window.parent.hubMesaBus.publish(JSON.stringify(full));
      }
    } catch (e) {}
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        new BroadcastChannel('gurps_combat_sync_channel_v1').postMessage(full);
      }
    } catch (e) {}
  }

  async function flushCandidates(peerId, pc) {
    var q = pendingCandidates[peerId] || [];
    pendingCandidates[peerId] = [];
    for (var i = 0; i < q.length; i++) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(q[i]));
      } catch (e) {
        console.warn('Erro ao aplicar candidato ICE enfileirado:', e);
      }
    }
  }

  var AudioStreamSync = {
    init: function (cid, signalFn) {
      myClientId = cid;
      sendSignalFn = signalFn;
      ensureAudio();
      setTimeout(function () {
        sendSignal({ type: 'AUDIO_STREAM_QUERY' });
      }, 350);
    },

    promptEditTrackTitle: function () {
      var current = state.trackTitle || '';
      var updated = window.prompt('Nome da música e artista:', current);
      if (updated !== null && updated.trim()) {
        AudioStreamSync.setTrackTitle(updated.trim());
      }
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

    // Desbloqueia áudio se o navegador tiver bloqueado por autoplay
    unlockAudio: function () {
      var el = ensureAudio();
      if (el) {
        el.play().then(function () {
          state.needsInteraction = false;
          notify();
        }).catch(function (e) {
          console.warn('Falha ao desbloquear áudio:', e);
        });
      }
    },

    setTrackTitle: function (title) {
      state.trackTitle = title;
      notify();
      if (state.isBroadcasting) {
        sendSignal({
          type: 'AUDIO_STREAM_ANNOUNCE',
          active: true,
          broadcasterClientId: myClientId,
          broadcasterName: state.broadcasterName || 'Mestre',
          trackTitle: state.trackTitle
        });
      }
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

        // Obtém o nome da aba selecionada (ex: "Black • Pearl Jam - Spotify")
        var videoTrack = stream.getVideoTracks()[0];
        var rawLabel = videoTrack && videoTrack.label ? videoTrack.label : '';
        var tabTitle = cleanTrackTitle(rawLabel);

        // Se o navegador escondeu o título da aba por segurança ou se veio vazio, pergunta ao usuário
        if (!tabTitle || rawLabel.indexOf('web-contents-media-stream') >= 0) {
          var promptTitle = window.prompt('Nome da música e artista sendo tocados no Spotify / Browser (ex: Black • Pearl Jam):', 'Black • Pearl Jam');
          if (promptTitle && promptTitle.trim()) {
            tabTitle = promptTitle.trim();
          } else {
            tabTitle = 'Música / Spotify';
          }
        }

        localStream = stream;

        // Ao encerrar o compartilhamento pelo banner do navegador
        audioTracks[0].onended = function () {
          AudioStreamSync.stopBroadcasting();
        };
        if (videoTrack) {
          videoTrack.onended = function () {
            AudioStreamSync.stopBroadcasting();
          };
        }

        state.isBroadcasting = true;
        state.hasActiveBroadcast = true;
        state.broadcasterName = broadcasterName || 'Mestre';
        state.broadcasterClientId = myClientId;
        state.trackTitle = tabTitle;
        notify();

        // Anuncia para todos na sala
        sendSignal({
          type: 'AUDIO_STREAM_ANNOUNCE',
          active: true,
          broadcasterClientId: myClientId,
          broadcasterName: state.broadcasterName,
          trackTitle: state.trackTitle
        });

        // Reanuncia a cada 5s para novos jogadores que abrirem a página
        if (announceInterval) clearInterval(announceInterval);
        announceInterval = setInterval(function () {
          if (state.isBroadcasting && localStream && localStream.active) {
            sendSignal({
              type: 'AUDIO_STREAM_ANNOUNCE',
              active: true,
              broadcasterClientId: myClientId,
              broadcasterName: state.broadcasterName || 'Mestre',
              trackTitle: state.trackTitle || 'Música / Spotify'
            });
          }
        }, 5000);

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
      pendingCandidates = {};

      var was = state.isBroadcasting;
      state.isBroadcasting = false;
      state.hasActiveBroadcast = false;
      state.broadcasterName = null;
      state.broadcasterClientId = null;
      state.trackTitle = null;
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
        case 'AUDIO_STREAM_QUERY':
          if (state.isBroadcasting && localStream && localStream.active) {
            sendSignal({
              type: 'AUDIO_STREAM_ANNOUNCE',
              active: true,
              broadcasterClientId: myClientId,
              broadcasterName: state.broadcasterName || 'Mestre',
              trackTitle: state.trackTitle || 'Música / Spotify'
            });
          }
          break;

        case 'AUDIO_STREAM_ANNOUNCE':
          if (payload.active) {
            state.hasActiveBroadcast = true;
            state.broadcasterClientId = payload.broadcasterClientId;
            state.broadcasterName = payload.broadcasterName || 'Mestre';
            if (payload.trackTitle) state.trackTitle = payload.trackTitle;
            notify();

            // Se não sou o streamer e ainda não estabeleci áudio ativo, solicita conexão
            if (!state.isBroadcasting && payload.broadcasterClientId !== myClientId) {
              if (!receiverPc || receiverPc.connectionState === 'disconnected' || receiverPc.connectionState === 'failed') {
                sendSignal({
                  type: 'AUDIO_STREAM_REQUEST',
                  targetClientId: payload.broadcasterClientId
                });
              }
            }
          } else {
            if (state.broadcasterClientId === payload.broadcasterClientId) {
              state.hasActiveBroadcast = false;
              state.broadcasterClientId = null;
              state.broadcasterName = null;
              state.trackTitle = null;
              state.needsInteraction = false;
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
              pc.setRemoteDescription(new RTCSessionDescription(payload.answer)).then(function () {
                flushCandidates(payload.senderClientId, pc);
              }).catch(function (e) {
                console.warn('Erro ao aplicar RTC_ANSWER:', e);
              });
            }
          }
          break;

        case 'RTC_ICE_CANDIDATE':
          if (payload.targetClientId === myClientId && payload.candidate) {
            var targetPc = state.isBroadcasting ? peerConnections[payload.senderClientId] : receiverPc;
            if (targetPc && targetPc.remoteDescription && targetPc.remoteDescription.type) {
              targetPc.addIceCandidate(new RTCIceCandidate(payload.candidate)).catch(function (e) {
                console.warn('Erro ao adicionar ICE Candidate:', e);
              });
            } else {
              // Enfileira candidato para quando remoteDescription for setada
              var sid = payload.senderClientId;
              if (!pendingCandidates[sid]) pendingCandidates[sid] = [];
              pendingCandidates[sid].push(payload.candidate);
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

      // Adiciona APENAS as faixas de áudio para economizar banda
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
        console.warn('Erro ao criar RTC Offer:', e);
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
          var p = el.play();
          if (p !== undefined) {
            p.then(function () {
              state.needsInteraction = false;
              notify();
            }).catch(function (err) {
              console.warn('Autoplay bloqueado pelo navegador, aguardando clique do usuário:', err);
              state.needsInteraction = true;
              notify();
            });
          }
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
        await flushCandidates(broadcasterId, pc);

        var answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        sendSignal({
          type: 'RTC_ANSWER',
          targetClientId: broadcasterId,
          answer: answer
        });
      } catch (e) {
        console.warn('Erro ao responder RTC Offer:', e);
      }
    }
  };

  root.audioStreamSync = AudioStreamSync;
  if (typeof window !== 'undefined') {
    window.audioStreamSync = AudioStreamSync;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
