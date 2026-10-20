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

  // Create canvas texture for polyhedral dice
  function createPolyhedralFaceTexture(val, sides) {
    var canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    var ctx = canvas.getContext('2d');

    // Rich golden amber gradient
    var grad = ctx.createLinearGradient(0, 0, 256, 256);
    grad.addColorStop(0, '#fef3c7');
    grad.addColorStop(0.2, '#f59e0b');
    grad.addColorStop(0.75, '#d97706');
    grad.addColorStop(1, '#b45309');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    // Bevel border
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#78350f';
    ctx.strokeRect(0, 0, 256, 256);

    // Inner bright highlight ring
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.strokeRect(8, 8, 240, 240);

    // Bold result number centered
    var str = String(val);
    var fontSize = str.length > 2 ? 88 : (str.length === 2 ? 104 : 124);
    ctx.font = '900 ' + fontSize + 'px "Plus Jakarta Sans", "JetBrains Mono", Arial, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(str, 128, 128);

    if (val === 6 || val === 9) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(88, 198, 80, 10);
    }

    var texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  // Exact mathematical polyhedral dice definitions (Teal / byWulf algorithm)
  var DIE_DEFINITIONS = {
    4: {
      tab: -0.1,
      af: Math.PI * 7 / 6,
      chamfer: 0.96,
      vertices: [[1, 1, 1], [-1, -1, 1], [-1, 1, -1], [1, -1, -1]],
      faces: [[1, 0, 2, 1], [0, 1, 3, 2], [0, 3, 2, 3], [1, 2, 3, 4]],
      scaleFactor: 1.2,
      values: 4
    },
    8: {
      tab: 0,
      af: -Math.PI / 4 / 2,
      chamfer: 0.965,
      vertices: [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]],
      faces: [[0, 2, 4, 1], [0, 4, 3, 2], [0, 3, 5, 3], [0, 5, 2, 4],
              [1, 3, 4, 5], [1, 4, 2, 6], [1, 2, 5, 7], [1, 5, 3, 8]],
      scaleFactor: 1.0,
      values: 8
    },
    10: {
      tab: 0,
      af: Math.PI * 6 / 5,
      chamfer: 0.945,
      vertices: (function () {
        var v = [];
        for (var i = 0, b = 0; i < 10; ++i, b += Math.PI * 2 / 10) {
          v.push([Math.cos(b), Math.sin(b), 0.105 * (i % 2 ? 1 : -1)]);
        }
        v.push([0, 0, -1]);
        v.push([0, 0, 1]);
        return v;
      })(),
      faces: [
        [5, 7, 11, 10], [4, 2, 10, 1], [1, 3, 11, 2], [0, 8, 10, 3], [7, 9, 11, 4],
        [8, 6, 10, 5], [9, 1, 11, 6], [2, 0, 10, 7], [3, 5, 11, 8], [6, 4, 10, 9],
        [1, 0, 2, -1], [1, 2, 3, -1], [3, 2, 4, -1], [3, 4, 5, -1], [5, 4, 6, -1],
        [5, 6, 7, -1], [7, 6, 8, -1], [7, 8, 9, -1], [9, 8, 0, -1], [9, 0, 1, -1]
      ],
      scaleFactor: 0.9,
      values: 10
    },
    12: {
      tab: 0.2,
      af: -Math.PI / 4 / 2,
      chamfer: 0.968,
      vertices: (function () {
        var p = (1 + Math.sqrt(5)) / 2;
        var q = 1 / p;
        return [
          [0, q, p], [0, q, -p], [0, -q, p], [0, -q, -p],
          [p, 0, q], [p, 0, -q], [-p, 0, q], [-p, 0, -q],
          [q, p, 0], [q, -p, 0], [-q, p, 0], [-q, -p, 0],
          [1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1],
          [-1, 1, 1], [-1, 1, -1], [-1, -1, 1], [-1, -1, -1]
        ];
      })(),
      faces: [
        [2, 14, 4, 12, 0, 1], [15, 9, 11, 19, 3, 2], [16, 10, 17, 7, 6, 3], [6, 7, 19, 11, 18, 4],
        [6, 18, 2, 0, 16, 5], [18, 11, 9, 14, 2, 6], [1, 17, 10, 8, 13, 7], [1, 13, 5, 15, 3, 8],
        [13, 8, 12, 4, 5, 9], [5, 4, 14, 9, 15, 10], [0, 12, 8, 10, 16, 11], [3, 19, 7, 17, 1, 12]
      ],
      scaleFactor: 0.9,
      values: 12
    },
    20: {
      tab: -0.2,
      af: -Math.PI / 4 / 2,
      chamfer: 0.955,
      vertices: (function () {
        var t = (1 + Math.sqrt(5)) / 2;
        return [
          [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
          [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
          [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]
        ];
      })(),
      faces: [
        [0, 11, 5, 1], [0, 5, 1, 2], [0, 1, 7, 3], [0, 7, 10, 4], [0, 10, 11, 5],
        [1, 5, 9, 6], [5, 11, 4, 7], [11, 10, 2, 8], [10, 7, 6, 9], [7, 1, 8, 10],
        [3, 9, 4, 11], [3, 4, 2, 12], [3, 2, 6, 13], [3, 6, 8, 14], [3, 8, 9, 15],
        [4, 9, 5, 16], [2, 4, 11, 17], [6, 2, 10, 18], [8, 6, 7, 19], [9, 8, 1, 20]
      ],
      scaleFactor: 1.0,
      values: 20
    }
  };

  function getChamferGeometry(vectors, faces, chamfer) {
    var chamfer_vectors = [], chamfer_faces = [], corner_faces = new Array(vectors.length);
    for (var i = 0; i < vectors.length; ++i) corner_faces[i] = [];
    for (var i = 0; i < faces.length; ++i) {
      var ii = faces[i], fl = ii.length - 1;
      var center_point = new THREE.Vector3();
      var face = new Array(fl);
      for (var j = 0; j < fl; ++j) {
        var vv = vectors[ii[j]].clone();
        center_point.add(vv);
        corner_faces[ii[j]].push(face[j] = chamfer_vectors.push(vv) - 1);
      }
      center_point.divideScalar(fl);
      for (var j = 0; j < fl; ++j) {
        var vv = chamfer_vectors[face[j]];
        vv.subVectors(vv, center_point).multiplyScalar(chamfer).addVectors(vv, center_point);
      }
      face.push(ii[fl]);
      chamfer_faces.push(face);
    }
    for (var i = 0; i < faces.length - 1; ++i) {
      for (var j = i + 1; j < faces.length; ++j) {
        var pairs = [], lastm = -1;
        for (var m = 0; m < faces[i].length - 1; ++m) {
          var n = faces[j].indexOf(faces[i][m]);
          if (n >= 0 && n < faces[j].length - 1) {
            if (lastm >= 0 && m !== lastm + 1) pairs.unshift([i, m], [j, n]);
            else pairs.push([i, m], [j, n]);
            lastm = m;
          }
        }
        if (pairs.length !== 4) continue;
        chamfer_faces.push([
          chamfer_faces[pairs[0][0]][pairs[0][1]],
          chamfer_faces[pairs[1][0]][pairs[1][1]],
          chamfer_faces[pairs[3][0]][pairs[3][1]],
          chamfer_faces[pairs[2][0]][pairs[2][1]],
          -1
        ]);
      }
    }
    for (var i = 0; i < corner_faces.length; ++i) {
      var cf = corner_faces[i], face = [cf[0]], count = cf.length - 1;
      while (count) {
        for (var m = faces.length; m < chamfer_faces.length; ++m) {
          var index = chamfer_faces[m].indexOf(face[face.length - 1]);
          if (index >= 0 && index < 4) {
            if (--index === -1) index = 3;
            var next_vertex = chamfer_faces[m][index];
            if (cf.indexOf(next_vertex) >= 0) {
              face.push(next_vertex);
              break;
            }
          }
        }
        --count;
      }
      face.push(-1);
      chamfer_faces.push(face);
    }
    return { vectors: chamfer_vectors, faces: chamfer_faces };
  }

  function makePolyhedronGeometry(vertices, faces, radius, tab, af) {
    var geom = new THREE.BufferGeometry();
    var positions = [];
    var normals = [];
    var uvs = [];
    var cb = new THREE.Vector3();
    var ab = new THREE.Vector3();
    var faceFirstVertexIndex = 0;

    for (var i = 0; i < faces.length; ++i) {
      var ii = faces[i], fl = ii.length - 1;
      var aa = Math.PI * 2 / fl;
      var materialIndex = ii[fl] === -1 ? 0 : ii[fl];

      for (var j = 0; j < fl - 2; ++j) {
        var v0 = vertices[ii[0]].clone().multiplyScalar(radius);
        var v1 = vertices[ii[j + 1]].clone().multiplyScalar(radius);
        var v2 = vertices[ii[j + 2]].clone().multiplyScalar(radius);

        positions.push(v0.x, v0.y, v0.z);
        positions.push(v1.x, v1.y, v1.z);
        positions.push(v2.x, v2.y, v2.z);

        cb.subVectors(v2, v1);
        ab.subVectors(v0, v1);
        cb.cross(ab).normalize();

        normals.push(cb.x, cb.y, cb.z);
        normals.push(cb.x, cb.y, cb.z);
        normals.push(cb.x, cb.y, cb.z);

        uvs.push((Math.cos(af) + 1 + tab) / 2 / (1 + tab), (Math.sin(af) + 1 + tab) / 2 / (1 + tab));
        uvs.push((Math.cos(aa * (j + 1) + af) + 1 + tab) / 2 / (1 + tab), (Math.sin(aa * (j + 1) + af) + 1 + tab) / 2 / (1 + tab));
        uvs.push((Math.cos(aa * (j + 2) + af) + 1 + tab) / 2 / (1 + tab), (Math.sin(aa * (j + 2) + af) + 1 + tab) / 2 / (1 + tab));
      }

      var numOfVertices = (fl - 2) * 3;
      for (var k = 0; k < numOfVertices / 3; k++) {
        geom.addGroup(faceFirstVertexIndex, 3, materialIndex);
        faceFirstVertexIndex += 3;
      }
    }

    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.boundingSphere = new THREE.Sphere(new THREE.Vector3(), radius);
    return geom;
  }

  var polyGeometryCache = {};

  function getPolyhedronData(sides, dieSize) {
    var defSides = sides;
    if (!DIE_DEFINITIONS[defSides]) {
      if (defSides <= 4) defSides = 4;
      else if (defSides <= 8) defSides = 8;
      else if (defSides <= 10) defSides = 10;
      else if (defSides <= 12) defSides = 12;
      else defSides = 20;
    }
    var cacheKey = defSides + '_' + dieSize;
    if (polyGeometryCache[cacheKey]) {
      return polyGeometryCache[cacheKey];
    }

    var def = DIE_DEFINITIONS[defSides];
    var vectors = [];
    for (var i = 0; i < def.vertices.length; ++i) {
      vectors.push(new THREE.Vector3().fromArray(def.vertices[i]).normalize());
    }

    var chamferGeom = getChamferGeometry(vectors, def.faces, def.chamfer);
    var radius = (dieSize / 2) * def.scaleFactor * 1.5;
    var geom = makePolyhedronGeometry(chamferGeom.vectors, chamferGeom.faces, radius, def.tab, def.af);

    var faceNormals = {};
    for (var f = 0; f < chamferGeom.faces.length; ++f) {
      var face = chamferGeom.faces[f];
      var fl = face.length - 1;
      var fVal = face[fl];
      if (fVal >= 0 && !faceNormals[fVal]) {
        var v0 = chamferGeom.vectors[face[0]];
        var v1 = chamferGeom.vectors[face[1]];
        var v2 = chamferGeom.vectors[face[2]];
        var cb = new THREE.Vector3().subVectors(v2, v1);
        var ab = new THREE.Vector3().subVectors(v0, v1);
        var norm = new THREE.Vector3().crossVectors(cb, ab).normalize();
        faceNormals[fVal] = norm;
      }
    }

    var result = {
      defSides: defSides,
      geometry: geom,
      faceNormals: faceNormals,
      maxVal: def.values
    };
    polyGeometryCache[cacheKey] = result;
    return result;
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
    var sides = rollData.diceSides || 6;
    var count = rollData.rolls.length;
    var halfDie = dieSize / 2;

    var cubeGeo = new THREE.BoxGeometry(dieSize, dieSize, dieSize);

    // Box face order: [+X, -X, +Y, -Y, +Z, -Z] -> [2, 5, 1, 6, 3, 4]
    var d6Materials = [
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
      var dieMesh;
      var qFinal;

      if (sides === 6) {
        dieMesh = new THREE.Mesh(cubeGeo, d6Materials);
        var baseEuler = getBaseEulerForFace(val);
        var qBase = new THREE.Quaternion().setFromEuler(baseEuler);
        var yaw = (Math.random() - 0.5) * 0.7 + (idx * 0.8);
        var qYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
        qFinal = qYaw.multiply(qBase);
      } else {
        var polyData = getPolyhedronData(sides, dieSize);
        var targetFaceIndex;
        if (val >= 1 && val <= polyData.maxVal) {
          targetFaceIndex = val;
        } else {
          targetFaceIndex = ((Math.abs(val) - 1) % polyData.maxVal) + 1;
        }

        var bodyMat = new THREE.MeshStandardMaterial({
          color: 0xd97706,
          roughness: 0.35,
          metalness: 0.05
        });
        var polyMats = [bodyMat];
        for (var f = 1; f <= polyData.maxVal; f++) {
          var faceDisplayVal = (f === targetFaceIndex) ? val : f;
          polyMats.push(new THREE.MeshStandardMaterial({
            map: createPolyhedralFaceTexture(faceDisplayVal, sides),
            roughness: 0.35,
            metalness: 0.05
          }));
        }

        dieMesh = new THREE.Mesh(polyData.geometry, polyMats);

        var faceNorm = polyData.faceNormals[targetFaceIndex] || new THREE.Vector3(0, 1, 0);
        var qAlign = new THREE.Quaternion().setFromUnitVectors(faceNorm, new THREE.Vector3(0, 1, 0));
        var pYaw = (Math.random() - 0.5) * 0.7 + (idx * 0.8);
        var qpYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), pYaw);
        qFinal = qpYaw.multiply(qAlign);
      }

      scene.add(dieMesh);

      var shadowMesh = new THREE.Mesh(shadowGeo, shadowMat.clone());
      shadowMesh.rotation.x = -Math.PI / 2;
      shadowMesh.position.y = 0.02;
      scene.add(shadowMesh);

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

    var is3D6 = count === 3 && sides === 6;
    var isCritSuccess = is3D6 ? rollData.total <= 4 : (sides === 20 && count === 1 && rollData.total === 20);
    var isCritFail = is3D6 ? rollData.total >= 17 : (sides === 20 && count === 1 && rollData.total === 1);

    var diceNotation = count + 'D' + sides;
    var rollsFormatted = rollData.rolls.join(' + ');

    var badgeHtml = '<div style="display:flex;align-items:center;gap:8px;">';
    badgeHtml += '<span style="font-size:16px;">🎲</span>';
    badgeHtml += '<div style="display:flex;flex-direction:column;line-height:1.1;">';
    badgeHtml += '<div style="font-size:11px;font-weight:700;color:#cbd5e1;">' + (rollData.characterName || 'Mestre') + (rollData.playerName ? ' <span style="color:#fbbf24;font-size:10px;">(' + rollData.playerName + ')</span>' : '') + '</div>';
    badgeHtml += '<div style="font-size:10px;color:#94a3b8;font-family:monospace;">' + diceNotation + ': [' + rollsFormatted + ']</div>';
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
