import * as THREE from 'three';

(function () {
  const canvas = document.getElementById('island-canvas');
  if (!canvas) return;

  const W = 110, H = 140;
  const dpr = Math.min(window.devicePixelRatio, 2);
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(W, H);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
  camera.position.set(1.8, 5.5, 7.5);
  camera.lookAt(0.2, 0.6, 0);

  // Lighting
  const ambient = new THREE.AmbientLight(0xfff8f0, 0.8);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfffde8, 1.4);
  sun.position.set(4, 8, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.width  = 512;
  sun.shadow.mapSize.height = 512;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far  = 30;
  sun.shadow.camera.left = sun.shadow.camera.bottom = -6;
  sun.shadow.camera.right = sun.shadow.camera.top   =  6;
  scene.add(sun);

  scene.add(new THREE.HemisphereLight(0xaaddff, 0x553310, 0.35));

  // Shared helper
  function M(geo, color, opts = {}) {
    const mat = new THREE.MeshLambertMaterial({ color, ...opts });
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  // ─── Island body ───
  const body = M(new THREE.CylinderGeometry(1.85, 2.35, 1.4, 14), 0x7a4a1a);
  body.position.y = -0.35;
  scene.add(body);

  // Grass cap
  const grass = M(new THREE.CylinderGeometry(1.9, 1.9, 0.18, 14), 0x52b81a);
  grass.position.y = 0.38;
  scene.add(grass);

  // Darker soil ring at grass edge
  const soilRing = M(new THREE.TorusGeometry(1.88, 0.14, 6, 14), 0x5a3810);
  soilRing.rotation.x = Math.PI / 2;
  soilRing.position.y = 0.37;
  scene.add(soilRing);

  // ─── Rocks ───
  const rockData = [
    [-1.55, 0.36, 0.75],
    [ 1.45, 0.36,-0.95],
    [-0.65, 0.36,-1.65],
    [ 1.68, 0.36, 0.55],
    [-1.3,  0.36,-1.1 ],
  ];
  rockData.forEach(([x, y, z]) => {
    const r = M(new THREE.DodecahedronGeometry(0.18 + Math.random() * 0.08, 0), 0x9a9490);
    r.position.set(x, y, z);
    r.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    scene.add(r);
  });

  // ─── Tree ───
  const trunk = M(new THREE.CylinderGeometry(0.12, 0.18, 2.2, 7), 0x7c4c1c);
  trunk.position.set(0.15, 1.48, 0.05);
  scene.add(trunk);

  // Crown: 3 layered cones
  const crownData = [
    { y: 3.3, r: 0.95, h: 0.9,  col: 0x4ab824 },
    { y: 2.75, r: 1.32, h: 1.1, col: 0x3aa81a },
    { y: 2.1,  r: 1.7,  h: 1.3, col: 0x329018 },
  ];
  crownData.forEach(({ y, r, h, col }) => {
    const cone = M(new THREE.ConeGeometry(r, h, 9), col);
    cone.position.set(0.15, y, 0.05);
    scene.add(cone);
  });

  // ─── Flowers ───
  function addFlower(x, z, centerCol, petalCol) {
    const stem = M(new THREE.CylinderGeometry(0.035, 0.035, 0.52, 5), 0x4a8020);
    stem.position.set(x, 0.66, z);
    scene.add(stem);

    const center = M(new THREE.SphereGeometry(0.13, 8, 6), centerCol);
    center.position.set(x, 0.95, z);
    scene.add(center);

    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const petal = M(new THREE.SphereGeometry(0.1, 6, 5), petalCol);
      petal.position.set(x + Math.cos(a) * 0.2, 0.94, z + Math.sin(a) * 0.2);
      scene.add(petal);
    }
  }

  addFlower(-0.82, 0.62, 0xffe040, 0xff6888);
  addFlower( 1.10, 0.52, 0xffd030, 0xff70c0);

  // ─── Butterflies ───
  const butterflies = [];

  function addButterfly(x, y, z, color1, color2, phase) {
    const g = new THREE.Group();
    g.position.set(x, y, z);

    // Body
    const bod = M(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 5), 0x221100);
    g.add(bod);

    const mat1 = new THREE.MeshLambertMaterial({ color: color1, side: THREE.DoubleSide, transparent: true, opacity: 0.92 });
    const mat2 = new THREE.MeshLambertMaterial({ color: color2, side: THREE.DoubleSide, transparent: true, opacity: 0.80 });

    // Left wing pivot
    const lp = new THREE.Group();
    g.add(lp);
    const luWing = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.34), mat1);
    luWing.rotation.x = -Math.PI / 2;
    luWing.position.set(-0.28, 0.04, -0.04);
    lp.add(luWing);
    const llWing = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.26), mat2);
    llWing.rotation.x = -Math.PI / 2;
    llWing.position.set(-0.23, 0.04, 0.13);
    lp.add(llWing);

    // Right wing pivot
    const rp = new THREE.Group();
    g.add(rp);
    const ruWing = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.34), mat1);
    ruWing.rotation.x = -Math.PI / 2;
    ruWing.position.set(0.28, 0.04, -0.04);
    rp.add(ruWing);
    const rlWing = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.26), mat2);
    rlWing.rotation.x = -Math.PI / 2;
    rlWing.position.set(0.23, 0.04, 0.13);
    rp.add(rlWing);

    scene.add(g);
    butterflies.push({ g, lp, rp, phase, baseY: y });
  }

  // Glow sprite helper — soft radial circle texture
  function makeGlowSprite(color) {
    const size = 64;
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const ctx = cv.getContext('2d');
    const r = size / 2;
    const grad = ctx.createRadialGradient(r, r, 0, r, r, r);
    const hex = '#' + color.toString(16).padStart(6, '0');
    grad.addColorStop(0,   hex + 'ff');
    grad.addColorStop(0.35, hex + 'aa');
    grad.addColorStop(1,   hex + '00');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(cv);
    return new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  }

  // Orbiting butterflies around tree
  const orbitButterflies = [];

  const orbitDefs = [
    { radius: 1.4, height: 2.8, speed: 0.7,  phase: 0,    flapSpeed: 6,   color1: 0x00eeff, color2: 0x0088cc, glowCol: 0x00eeff },
    { radius: 1.1, height: 2.1, speed: -0.55, phase: 2.1,  flapSpeed: 7,   color1: 0xff40ff, color2: 0xaa00cc, glowCol: 0xff40ff },
    { radius: 1.6, height: 3.4, speed: 0.45,  phase: 4.2,  flapSpeed: 5.5, color1: 0xffee00, color2: 0xff9900, glowCol: 0xffee00 },
    { radius: 1.2, height: 1.7, speed: -0.9,  phase: 1.0,  flapSpeed: 8,   color1: 0x44ff88, color2: 0x118844, glowCol: 0x44ff88 },
    { radius: 1.5, height: 3.0, speed: 0.6,   phase: 5.0,  flapSpeed: 6.5, color1: 0xff6644, color2: 0xff2200, glowCol: 0xff6644 },
  ];

  orbitDefs.forEach(({ radius, height, speed, phase, flapSpeed, color1, color2, glowCol }) => {
    const g = new THREE.Group();

    // Body
    const bod = M(new THREE.CylinderGeometry(0.035, 0.035, 0.22, 5), 0x110800);
    g.add(bod);

    const mat1 = new THREE.MeshLambertMaterial({ color: color1, side: THREE.DoubleSide, transparent: true, opacity: 0.95, emissive: color1, emissiveIntensity: 0.6 });
    const mat2 = new THREE.MeshLambertMaterial({ color: color2, side: THREE.DoubleSide, transparent: true, opacity: 0.80, emissive: color2, emissiveIntensity: 0.4 });

    const lp = new THREE.Group();
    g.add(lp);
    const luW = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.28), mat1);
    luW.rotation.x = -Math.PI / 2;
    luW.position.set(-0.22, 0.03, -0.03);
    lp.add(luW);
    const llW = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.22), mat2);
    llW.rotation.x = -Math.PI / 2;
    llW.position.set(-0.19, 0.03, 0.11);
    lp.add(llW);

    const rp = new THREE.Group();
    g.add(rp);
    const ruW = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.28), mat1);
    ruW.rotation.x = -Math.PI / 2;
    ruW.position.set(0.22, 0.03, -0.03);
    rp.add(ruW);
    const rlW = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.22), mat2);
    rlW.rotation.x = -Math.PI / 2;
    rlW.position.set(0.19, 0.03, 0.11);
    rp.add(rlW);

    // Glow aura
    const glow = makeGlowSprite(glowCol);
    glow.scale.set(0.9, 0.9, 0.9);
    g.add(glow);

    scene.add(g);
    orbitButterflies.push({ g, lp, rp, phase, radius, height, speed, flapSpeed });
  });

  addButterfly(-1.1, 1.95, 0.35, 0xff7720, 0xffaa40, 0);
  addButterfly( 1.28, 1.88, 0.2, 0x9930cc, 0xbb55e8, 1.4);

  // ─── Animation loop ───
  let t = 0;
  function animate() {
    requestAnimationFrame(animate);
    t += 0.04;

    // Ground butterflies flap
    butterflies.forEach(b => {
      const flap = Math.cos(t * 5 + b.phase) * 0.8;
      b.lp.rotation.z =  flap;
      b.rp.rotation.z = -flap;
      b.g.position.y = b.baseY + Math.sin(t * 1.8 + b.phase) * 0.08;
    });

    // Orbiting glowing butterflies
    orbitButterflies.forEach(b => {
      const angle = t * b.speed + b.phase;
      b.g.position.set(
        0.15 + Math.cos(angle) * b.radius,
        b.height + Math.sin(t * 1.2 + b.phase) * 0.15,
        0.05 + Math.sin(angle) * b.radius
      );
      b.g.rotation.y = -angle + Math.PI / 2;
      const flap = Math.cos(t * b.flapSpeed) * 0.85;
      b.lp.rotation.z =  flap;
      b.rp.rotation.z = -flap;
    });

    renderer.render(scene, camera);
  }

  animate();
})();
