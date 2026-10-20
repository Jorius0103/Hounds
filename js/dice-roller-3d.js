/**
 * Hounds - 3D Dice Roller Engine (Roll20 Style)
 * Renders realistic 3D yellow D6 dice rolling across the screen with physics,
 * shadows, and settling on exact predetermined results.
 * Completely transparent overlay with pointer-events: none.
 * Dismisses instantly on any user interaction so other tasks execute without hindrance.
 */
(function (global) {
  'use strict';

  // Sound effect using Web Audio API (tabletop wooden dice clatter)
  function playDiceClatterSound() {
    try {
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      var ctx = new AudioCtx();
      var now = ctx.currentTime;
      [0, 0.1, 0.24, 0.42, 0.62, 0.85, 1.02].forEach(function (t, i) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(170 + Math.random() * 80, now + t);
        osc.frequency.exponentialRampToValueAtTime(45, now + t + 0.05);
        gain.gain.setValueAtTime(0.14 / (i * 0.35 + 1), now + t);
        gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + t);
        osc.stop(now + t + 0.06);
      });
    } catch (e) {}
  }

  // Create canvas texture for a D6 face (1 to 6)
  function createD6FaceTexture(num) {
    var canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    var ctx = canvas.getContext('2d');

    // Warm golden yellow gradient (Roll20 style)
    var grad = ctx.createLinearGradient(0, 0, 256, 256);
    grad.addColorStop(0, '#ffca28'); // Amber 400
    grad.addColorStop(0.5, '#f59e0b'); // Amber 500
    grad.addColorStop(1, '#d97706'); // Amber 600
    ctx.fillStyle = grad;

    // Rounded rectangle face
    var r = 28;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(256 - r, 0);
    ctx.quadraticCurveTo(256, 0, 256, r);
    ctx.lineTo(256, 256 - r);
    ctx.quadraticCurveTo(256, 256, 256 - r, 256);
    ctx.lineTo(r, 256);
    ctx.quadraticCurveTo(0, 256, 0, 256 - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath();
    ctx.fill();

    // Darker bevel border
    ctx.lineWidth = 12;
    ctx.strokeStyle = '#b45309';
    ctx.stroke();

    // Inner bright bevel highlight
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.stroke();

    // Bold black number
    ctx.fillStyle = '#0a0a0c';
    ctx.font = '900 138px "Plus Jakarta Sans", "JetBrains Mono", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(num), 128, 126);

    // If number is 6, draw underline bar (to clearly distinguish 6 from 9, as in Roll20)
    if (num === 6) {
      ctx.fillStyle = '#0a0a0c';
      ctx.fillRect(80, 196, 96, 14);
    }

    var texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  // Create soft shadow texture
  function createShadowTexture() {
    var canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    var ctx = canvas.getContext('2d');
    var grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 60);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
    grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.35)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(canvas);
  }

  // Base Euler rotation that points the given face number (1-6) toward +Y (UP)
  // Three.js BoxGeometry face order: [+X (2), -X (5), +Y (1), -Y (6), +Z (3), -Z (4)]
  function getBaseEulerForFace(num) {
    switch (num) {
      case 1: return new THREE.Euler(0, 0, 0);
      case 6: return new THREE.Euler(Math.PI, 0, 0);
      case 2: return new THREE.Euler(0, 0, Math.PI / 2);
      case 5: return new THREE.Euler(0, 0, -Math.PI / 2);
      case 3: return new THREE.Euler(-Math.PI / 2, 0, 0);
      case 4: return new THREE.Euler(Math.PI / 2, 0, 0);
      default: return new THREE.Euler(0, 0, 0);
    }
  }

  var activeSession = null;

  function dismiss() {
    if (activeSession) {
      activeSession.cleanup();
      activeSession = null;
    }
  }

  function roll(rollData, onSettled) {
    if (!rollData || !Array.isArray(rollData.rolls) || rollData.rolls.length === 0) return;

    // Clean up previous session if any
    dismiss();

    if (typeof THREE === 'undefined') {
      console.warn('THREE.js is not loaded. Cannot render 3D dice.');
      if (typeof onSettled === 'function') onSettled();
      return;
    }

    playDiceClatterSound();

    // 1. Create transparent overlay container
    var overlay = document.createElement('div');
    overlay.id = 'dice-3d-overlay-' + Date.now();
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.pointerEvents = 'none'; // Pass through clicks immediately!
    overlay.style.zIndex = '999999';
    overlay.style.overflow = 'hidden';
    overlay.style.userSelect = 'none';
    document.body.appendChild(overlay);

    // 2. Setup Three.js WebGL Renderer
    var renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    overlay.appendChild(renderer.domElement);

    // 3. Setup Scene & Camera
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 300);
    camera.position.set(0, 28, 22);
    camera.lookAt(0, 0, -1);

    // 4. Lighting
    var ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    var dirLight = new THREE.DirectionalLight(0xfff6ea, 0.95);
    dirLight.position.set(-15, 35, 20);
    scene.add(dirLight);

    var softFillLight = new THREE.DirectionalLight(0xdbeafe, 0.4);
    softFillLight.position.set(15, 20, -10);
    scene.add(softFillLight);

    // 5. Shared Geometries and Materials (50% size reduction)
    var dieSize = 1.8;
    var cubeGeo = new THREE.BoxGeometry(dieSize, dieSize, dieSize);

    // Box face order: [+X, -X, +Y, -Y, +Z, -Z] -> [2, 5, 1, 6, 3, 4]
    var materials = [
      new THREE.MeshStandardMaterial({ map: createD6FaceTexture(2), roughness: 0.35, metalness: 0.05 }),
      new THREE.MeshStandardMaterial({ map: createD6FaceTexture(5), roughness: 0.35, metalness: 0.05 }),
      new THREE.MeshStandardMaterial({ map: createD6FaceTexture(1), roughness: 0.35, metalness: 0.05 }),
      new THREE.MeshStandardMaterial({ map: createD6FaceTexture(6), roughness: 0.35, metalness: 0.05 }),
      new THREE.MeshStandardMaterial({ map: createD6FaceTexture(3), roughness: 0.35, metalness: 0.05 }),
      new THREE.MeshStandardMaterial({ map: createD6FaceTexture(4), roughness: 0.35, metalness: 0.05 })
    ];

    var shadowGeo = new THREE.PlaneGeometry(2.6, 2.6);
    var shadowTex = createShadowTexture();
    var shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.75, depthWrite: false });

    // 6. Create Dice Meshes & Trajectory Data
    var dice = [];
    var count = rollData.rolls.length;
    var halfDie = dieSize / 2;

    // Resting positions (scattered naturally, scaled down by 50%)
    var targetPositions = [];
    if (count === 1) {
      targetPositions = [{ x: 0, z: 0 }];
    } else if (count === 3) {
      targetPositions = [
        { x: -3.8 + (Math.random() - 0.5) * 0.8, z: -1.8 + (Math.random() - 0.5) * 0.6 },
        { x: 0.2 + (Math.random() - 0.5) * 0.8, z: 1.8 + (Math.random() - 0.5) * 0.6 },
        { x: 4.0 + (Math.random() - 0.5) * 0.8, z: -1.0 + (Math.random() - 0.5) * 0.6 }
      ];
    } else {
      for (var i = 0; i < count; i++) {
        var ang = (i / count) * Math.PI * 2;
        targetPositions.push({
          x: Math.cos(ang) * 2.8 + (Math.random() - 0.5) * 0.5,
          z: Math.sin(ang) * 2.8 + (Math.random() - 0.5) * 0.5
        });
      }
    }

    rollData.rolls.forEach(function (val, idx) {
      var dieMesh = new THREE.Mesh(cubeGeo, materials);
      scene.add(dieMesh);

      var shadowMesh = new THREE.Mesh(shadowGeo, shadowMat.clone());
      shadowMesh.rotation.x = -Math.PI / 2;
      shadowMesh.position.y = 0.02;
      scene.add(shadowMesh);

      // Target resting orientation
      var baseEuler = getBaseEulerForFace(val);
      var qBase = new THREE.Quaternion().setFromEuler(baseEuler);
      // Random natural yaw tilt around the vertical Y-axis (preserves top face value!)
      var yaw = (Math.random() - 0.5) * 0.7 + (idx * 0.8);
      var qYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      var qFinal = qYaw.multiply(qBase);

      // Initial throw position (coming from bottom right/left)
      var throwFromX = 9 + idx * 2;
      var throwFromZ = 8 + idx * 1.5;
      var targetX = targetPositions[idx].x;
      var targetZ = targetPositions[idx].z;

      dice.push({
        mesh: dieMesh,
        shadow: shadowMesh,
        val: val,
        targetX: targetX,
        targetZ: targetZ,
        throwFromX: throwFromX,
        throwFromZ: throwFromZ,
        qFinal: qFinal,
        rotSpeedX: 18 + Math.random() * 8,
        rotSpeedY: 22 + Math.random() * 8,
        rotSpeedZ: 16 + Math.random() * 8,
        delay: idx * 0.05
      });
    });

    // 7. Floating Result Pill (appears at end of roll, non-blocking)
    var resultBadge = document.createElement('div');
    resultBadge.style.position = 'absolute';
    resultBadge.style.top = '22px';
    resultBadge.style.left = '50%';
    resultBadge.style.transform = 'translateX(-50%) translateY(-10px) scale(0.92)';
    resultBadge.style.pointerEvents = 'none';
    resultBadge.style.opacity = '0';
    resultBadge.style.transition = 'all 0.35s cubic-bezier(0.18, 0.89, 0.32, 1.25)';
    resultBadge.style.display = 'flex';
    resultBadge.style.alignItems = 'center';
    resultBadge.style.gap = '10px';
    resultBadge.style.background = 'rgba(15, 23, 42, 0.92)';
    resultBadge.style.border = '1px solid rgba(245, 158, 11, 0.5)';
    resultBadge.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.7), 0 0 15px rgba(245, 158, 11, 0.25)';
    resultBadge.style.borderRadius = '9999px';
    resultBadge.style.padding = '8px 18px';
    resultBadge.style.color = '#fff';
    resultBadge.style.fontFamily = '"Plus Jakarta Sans", system-ui, sans-serif';

    var is3D = count === 3;
    var isCritSuccess = is3D && rollData.total <= 4;
    var isCritFail = is3D && rollData.total >= 17;

    var badgeHtml = '<div style="display:flex;align-items:center;gap:8px;">';
    badgeHtml += '<span style="font-size:16px;">🎲</span>';
    badgeHtml += '<div style="display:flex;flex-direction:column;line-height:1.1;">';
    badgeHtml += '<div style="font-size:11px;font-weight:700;color:#cbd5e1;">' + (rollData.characterName || 'Mestre') + (rollData.playerName ? ' <span style="color:#fbbf24;font-size:10px;">(' + rollData.playerName + ')</span>' : '') + '</div>';
    badgeHtml += '<div style="font-size:10px;color:#94a3b8;font-family:monospace;">' + (count === 3 ? '3D6: [' + rollData.rolls.join(' + ') + ']' : '1D6') + '</div>';
    badgeHtml += '</div>';
    badgeHtml += '</div>';

    badgeHtml += '<div style="font-family:monospace;font-size:20px;font-weight:900;padding:2px 10px;border-radius:8px;' +
      (isCritSuccess ? 'background:rgba(5, 150, 105, 0.3);border:1px solid #10b981;color:#34d399;' :
       isCritFail ? 'background:rgba(225, 29, 72, 0.3);border:1px solid #f43f5e;color:#fb7185;' :
       'background:rgba(217, 119, 6, 0.25);border:1px solid #f59e0b;color:#fde047;') +
      '">' + rollData.total + '</div>';

    if (isCritSuccess) {
      badgeHtml += '<span style="font-size:11px;font-weight:800;color:#34d399;text-transform:uppercase;letter-spacing:0.05em;">★ Crítico!</span>';
    } else if (isCritFail) {
      badgeHtml += '<span style="font-size:11px;font-weight:800;color:#fb7185;text-transform:uppercase;letter-spacing:0.05em;">☠ Falha Crítica!</span>';
    }

    resultBadge.innerHTML = badgeHtml;
    overlay.appendChild(resultBadge);

    // 8. Animation Loop
    var startTime = performance.now();
    var animDuration = 1450; // ms
    var animFrameId = null;
    var hasSettled = false;

    function animate(now) {
      var elapsed = now - startTime;
      var allDone = true;

      dice.forEach(function (d) {
        var t = Math.max(0, elapsed / 1000 - d.delay);

        if (t < 1.35) {
          allDone = false;

          // Horizontal motion (Ease-out deceleration)
          var pHoriz = Math.min(1, t / 1.3);
          var easeHoriz = 1 - Math.pow(1 - pHoriz, 3);
          d.mesh.position.x = d.throwFromX + (d.targetX - d.throwFromX) * easeHoriz;
          d.mesh.position.z = d.throwFromZ + (d.targetZ - d.throwFromZ) * easeHoriz;

          // Vertical bouncing trajectory (scaled down by 50%)
          var y = halfDie;
          if (t < 0.42) {
            // First drop arc
            var arc = t / 0.42;
            y = halfDie + (1 - arc * arc) * 7.0;
          } else if (t < 0.78) {
            // First bounce
            var arc1 = (t - 0.42) / 0.36;
            y = halfDie + Math.sin(arc1 * Math.PI) * 2.4;
          } else if (t < 1.08) {
            // Second bounce
            var arc2 = (t - 0.78) / 0.3;
            y = halfDie + Math.sin(arc2 * Math.PI) * 0.9;
          } else if (t < 1.3) {
            // Third mini bounce
            var arc3 = (t - 1.08) / 0.22;
            y = halfDie + Math.sin(arc3 * Math.PI) * 0.3;
          }
          d.mesh.position.y = Math.max(halfDie, y);

          // Rotation motion
          if (t < 0.95) {
            // High speed tumbling
            d.mesh.rotation.x += d.rotSpeedX * 0.016;
            d.mesh.rotation.y += d.rotSpeedY * 0.016;
            d.mesh.rotation.z += d.rotSpeedZ * 0.016;
          } else {
            // Smoothly align to final resting orientation
            var settleProgress = Math.min(1, (t - 0.95) / 0.38);
            var smoothSettle = settleProgress * settleProgress * (3 - 2 * settleProgress);
            d.mesh.quaternion.slerp(d.qFinal, smoothSettle);
          }
        } else {
          // Settled on floor
          d.mesh.position.x = d.targetX;
          d.mesh.position.z = d.targetZ;
          d.mesh.position.y = halfDie;
          d.mesh.quaternion.copy(d.qFinal);
        }

        // Shadow tracking
        d.shadow.position.x = d.mesh.position.x;
        d.shadow.position.z = d.mesh.position.z;
        var heightAboveFloor = Math.max(0, d.mesh.position.y - halfDie);
        d.shadow.material.opacity = Math.max(0.12, 0.75 - heightAboveFloor * 0.06);
        var shadowScale = 1 + heightAboveFloor * 0.07;
        d.shadow.scale.set(shadowScale, shadowScale, 1);
      });

      renderer.render(scene, camera);

      if (!hasSettled && elapsed >= 1250) {
        hasSettled = true;
        resultBadge.style.opacity = '1';
        resultBadge.style.transform = 'translateX(-50%) translateY(0) scale(1)';
        if (typeof onSettled === 'function') onSettled();
      }

      if (!allDone) {
        animFrameId = requestAnimationFrame(animate);
      } else {
        // Keep rendering still dice until dismissed
      }
    }

    animFrameId = requestAnimationFrame(animate);

    // Handle window resize
    function onResize() {
      if (!camera || !renderer) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener('resize', onResize);

    // 9. Instant dismiss on ANY click / tap / keydown anywhere on the screen
    // The user can execute any task immediately with a single click, and the dice disappear!
    var sessionStartTime = Date.now();
    var dismissed = false;

    function cleanup() {
      if (dismissed) return;
      dismissed = true;

      window.removeEventListener('pointerdown', onUserInteraction, true);
      window.removeEventListener('keydown', onUserInteraction, true);
      window.removeEventListener('resize', onResize);

      if (animFrameId) cancelAnimationFrame(animFrameId);

      // Fade out smoothly
      overlay.style.transition = 'opacity 0.2s ease-out';
      overlay.style.opacity = '0';
      setTimeout(function () {
        if (overlay && overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
        renderer.dispose();
      }, 220);
    }

    function onUserInteraction(e) {
      // Don't close within first 300ms to avoid an accidental click during the click that rolled
      if (Date.now() - sessionStartTime < 300) return;
      cleanup();
    }

    window.addEventListener('pointerdown', onUserInteraction, true);
    window.addEventListener('keydown', onUserInteraction, true);

    // Auto-dismiss after 7.5 seconds if user stays idle
    var autoDismissTimer = setTimeout(function () {
      cleanup();
    }, 7500);

    activeSession = {
      cleanup: function () {
        clearTimeout(autoDismissTimer);
        cleanup();
      }
    };
  }

  global.DiceRoller3D = {
    roll: roll,
    dismiss: dismiss
  };

})(typeof window !== 'undefined' ? window : this);
