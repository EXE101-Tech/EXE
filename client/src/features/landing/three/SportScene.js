import * as THREE from 'three';

// Scroll story for the landing page. `beat` is a float from 0 (hero) to 7 (finale):
// 0 hero, 1 matchmaking, 2-4 sports (badminton, pickleball, football), 5 reputation,
// 6 community, 7 finale. Every animated value is sampled from keyframes on that axis.

const COURT = { width: 6.1, length: 13.4 };
const SPORT_COLORS = [new THREE.Color('#38bdf8'), new THREE.Color('#a3e635'), new THREE.Color('#f8fafc')];
// Halloween keeps one colour per sport but in pumpkin orange, witch purple and bone white.
const HALLOWEEN_COLORS = [new THREE.Color('#ff8a1f'), new THREE.Color('#c084fc'), new THREE.Color('#fde8c8')];
// Court surface per sport: badminton blue, pickleball deep blue, football turf.
const COURT_SURFACES = {
  dark: ['#0b3a52', '#123d6b', '#14532d'].map((hex) => new THREE.Color(hex)),
  light: ['#2b6c8f', '#2f5f9e', '#2f7a46'].map((hex) => new THREE.Color(hex)),
  halloween: ['#2b1238', '#25123f', '#173322'].map((hex) => new THREE.Color(hex)),
};

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const smooth = (edge0, edge1, value) => {
  const t = clamp((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};
// Rises over [a, b], holds, falls over [c, d].
const window4 = (a, b, c, d, value) => smooth(a, b, value) * (1 - smooth(c, d, value));
const catmull = (p0, p1, p2, p3, t) => {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
};

// keys: [{ c, v: [x, y, z, ...] }] sorted by c. Returns a smooth Catmull-Rom sample.
function sampleKeys(keys, c, out = []) {
  const last = keys.length - 1;
  if (c <= keys[0].c) return keys[0].v.slice();
  if (c >= keys[last].c) return keys[last].v.slice();
  let index = 0;
  while (index < last - 1 && c > keys[index + 1].c) index += 1;
  const k0 = keys[Math.max(0, index - 1)].v;
  const k1 = keys[index].v;
  const k2 = keys[index + 1].v;
  const k3 = keys[Math.min(last, index + 2)].v;
  const t = (c - keys[index].c) / (keys[index + 1].c - keys[index].c);
  for (let i = 0; i < k1.length; i += 1) out[i] = catmull(k0[i], k1[i], k2[i], k3[i], t);
  return out;
}

// [posX, posY, posZ, lookX, lookY, lookZ, screenShift]. Positive shift moves the subject right.
const CAMERA_KEYS = [
  { c: 0, v: [0, 6.2, 12.5, 0, 1.6, 0, 2.6] },
  { c: 0.6, v: [6.2, 2.6, 8.5, 1, 1.6, 2, 0] },
  { c: 1, v: [7.2, 2.3, 0.8, 0, 2.4, 0, 0] },
  { c: 1.4, v: [-4, 2, -9.5, -0.6, 1.6, -3.5, 0] },
  { c: 1.8, v: [0, 2.8, 5.6, 0, 2.1, 0, 1.4] },
  { c: 2.2, v: [1.2, 3.2, 6.4, 0, 1.6, 0, 1.6] },
  { c: 3, v: [-1.4, 3.4, 6.6, 0, 1.6, 0, 1.6] },
  { c: 4, v: [1.6, 3.8, 7.6, 0, 1.6, 0, 1.6] },
  { c: 5, v: [0, 3.6, 8.4, 0, 2, 0, -2.5] },
  { c: 6, v: [-8, 8.5, 10, 0, 2.2, 0, 2.2] },
  { c: 7, v: [0, 17, 4.5, 0, 0, 0, 0] },
];
// [x, y, z, scale]
const BALL_KEYS = [
  { c: 0, v: [0, 2.4, 0, 2.3] },
  { c: 0.6, v: [2.4, 1.5, 5.2, 0.95] },
  { c: 1, v: [0, 3.7, 0, 0.95] },
  { c: 1.4, v: [-1.3, 1.3, -5.2, 0.95] },
  { c: 1.8, v: [0, 2.05, 0, 1.35] },
  { c: 4.2, v: [0, 2.05, 0, 1.35] },
  { c: 5, v: [0, 2, 0, 1.05] },
  { c: 6, v: [0, 1.5, 0, 0.85] },
  { c: 7, v: [0, 0.9, 0, 1.5] },
];

function canvasTexture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Glassy "hologram" cards used in the reputation chapter.
function drawCard(ctx, w, h, { accent, title, value, caption, initials, bar }) {
  const font = "'Inter Variable', Inter, system-ui, sans-serif";
  ctx.clearRect(0, 0, w, h);
  roundRect(ctx, 6, 6, w - 12, h - 12, 34);
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, 'rgba(15, 28, 58, .92)');
  bg.addColorStop(1, 'rgba(8, 16, 36, .92)');
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.lineWidth = 4;
  const border = ctx.createLinearGradient(0, 0, w, 0);
  border.addColorStop(0, accent);
  border.addColorStop(1, 'rgba(255,255,255,.25)');
  ctx.strokeStyle = border;
  ctx.stroke();

  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(74, 78, 38, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#06101f';
  ctx.font = `800 30px ${font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initials, 74, 80);

  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(214, 226, 255, .8)';
  ctx.font = `600 24px ${font}`;
  ctx.fillText(title, 130, 64);
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 46px ${font}`;
  ctx.fillText(value, 130, 104);

  ctx.fillStyle = 'rgba(214, 226, 255, .72)';
  ctx.font = `500 22px ${font}`;
  ctx.fillText(caption, 40, h - 84);
  if (bar != null) {
    roundRect(ctx, 40, h - 56, w - 80, 14, 7);
    ctx.fillStyle = 'rgba(255,255,255,.12)';
    ctx.fill();
    roundRect(ctx, 40, h - 56, (w - 80) * bar, 14, 7);
    ctx.fillStyle = accent;
    ctx.fill();
  }
}

export default class SportScene {
  constructor(canvas, { dark = true, lowPower = false, reducedMotion = false, halloween = false } = {}) {
    this.canvas = canvas;
    this.lowPower = lowPower;
    this.reducedMotion = reducedMotion;
    this.pointer = new THREE.Vector2();
    this.pointerSmooth = new THREE.Vector2();
    this.disposables = [];

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowPower, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1.25 : 1.75));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog('#050a18', 14, 46);
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);

    this.buildLights();
    this.buildArena();
    this.buildCourt();
    this.buildNet();
    this.buildBalls();
    this.buildParticles();
    this.buildBeams();
    this.buildCards();
    this.buildNetwork();
    this.dark = dark;
    this.setMode(halloween);
  }

  track(...items) {
    this.disposables.push(...items);
    return items[0];
  }

  buildLights() {
    this.hemi = new THREE.HemisphereLight('#9cc7ff', '#0a1430', 0.9);
    const key = new THREE.DirectionalLight('#ffffff', 2.2);
    key.position.set(6, 12, 8);
    this.rim = new THREE.PointLight('#38bdf8', 30, 18, 2);
    this.rim.position.set(-4, 4, -3);
    this.warm = new THREE.PointLight('#f472b6', 18, 16, 2);
    this.warm.position.set(4, 3, 4);
    this.scene.add(this.hemi, key, this.rim, this.warm);
  }

  buildArena() {
    const floorMaterial = this.track(new THREE.MeshStandardMaterial({ color: '#081226', roughness: 0.85, metalness: 0.1 }));
    const floor = new THREE.Mesh(this.track(new THREE.PlaneGeometry(120, 120)), floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    this.floorMaterial = floorMaterial;
    this.grid = new THREE.GridHelper(80, 80, '#1d4ed8', '#1e3a8a');
    this.grid.material.transparent = true;
    this.grid.material.opacity = 0.18;
    this.grid.position.y = 0.002;
    this.track(this.grid.geometry, this.grid.material);
    this.scene.add(floor, this.grid);
  }

  buildCourt() {
    const { width, length } = COURT;
    this.courtMaterial = this.track(new THREE.MeshStandardMaterial({ color: '#0b3a52', roughness: 0.6, metalness: 0.05, emissive: '#07263a', emissiveIntensity: 0.6 }));
    const surface = new THREE.Mesh(this.track(new THREE.PlaneGeometry(width + 1.2, length + 1.6)), this.courtMaterial);
    surface.rotation.x = -Math.PI / 2;
    surface.position.y = 0.004;
    this.scene.add(surface);

    // One line set per sport; they cross-fade while the ball morphs.
    const lineGeometry = this.track(new THREE.BoxGeometry(1, 0.012, 1));
    const hw = width / 2;
    const hl = length / 2;
    const makeLines = (color, draw) => {
      const material = this.track(new THREE.MeshBasicMaterial({ color, transparent: true, toneMapped: false, depthWrite: false }));
      const group = new THREE.Group();
      const addLine = (x1, z1, x2, z2) => {
        const mesh = new THREE.Mesh(lineGeometry, material);
        const horizontal = z1 === z2;
        mesh.scale.set(horizontal ? Math.abs(x2 - x1) + 0.05 : 0.05, 1, horizontal ? 0.05 : Math.abs(z2 - z1) + 0.05);
        mesh.position.set((x1 + x2) / 2, 0.012, (z1 + z2) / 2);
        group.add(mesh);
      };
      addLine(-hw, -hl, hw, -hl);
      addLine(-hw, hl, hw, hl);
      addLine(-hw, -hl, -hw, hl);
      addLine(hw, -hl, hw, hl);
      draw(addLine, group, material);
      this.scene.add(group);
      return group;
    };

    // Badminton: singles sidelines, short and long service lines, centre lines.
    const badminton = makeLines(SPORT_COLORS[0], (addLine) => {
      addLine(-2.59, -hl, -2.59, hl);
      addLine(2.59, -hl, 2.59, hl);
      for (const sign of [-1, 1]) {
        addLine(-hw, sign * 1.98, hw, sign * 1.98);
        addLine(-hw, sign * 5.94, hw, sign * 5.94);
        addLine(0, sign * 1.98, 0, sign * hl);
      }
    });
    // Pickleball: same footprint, 2.13 m non-volley zone ("kitchen") each side, centre lines behind it.
    const pickleball = makeLines(SPORT_COLORS[1], (addLine, group) => {
      for (const sign of [-1, 1]) {
        addLine(-hw, sign * 2.13, hw, sign * 2.13);
        addLine(0, sign * 2.13, 0, sign * hl);
      }
      const kitchen = this.track(new THREE.MeshBasicMaterial({ color: SPORT_COLORS[1], transparent: true, opacity: 0.12, depthWrite: false }));
      group.userData.kitchen = kitchen;
      const zone = new THREE.Mesh(this.track(new THREE.PlaneGeometry(width, 4.26)), kitchen);
      zone.rotation.x = -Math.PI / 2;
      zone.position.y = 0.008;
      group.add(zone);
    });
    // Small-sided football: halfway line, centre circle and penalty boxes.
    const football = makeLines(SPORT_COLORS[2], (addLine, group, material) => {
      addLine(-hw, 0, hw, 0);
      for (const sign of [-1, 1]) {
        addLine(-1.8, sign * 5.1, 1.8, sign * 5.1);
        addLine(-1.8, sign * 5.1, -1.8, sign * hl);
        addLine(1.8, sign * 5.1, 1.8, sign * hl);
      }
      const circle = new THREE.Mesh(this.track(new THREE.RingGeometry(1.15, 1.2, 64)), material);
      circle.rotation.x = -Math.PI / 2;
      circle.position.y = 0.014;
      group.add(circle);
    });
    this.courtLines = [badminton, pickleball, football];

    // Soft glow under the lines.
    const glowTexture = this.track(canvasTexture(256, 256, (ctx, w, h) => {
      const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      gradient.addColorStop(0, 'rgba(255,255,255,.55)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
    }));
    this.glowMaterial = this.track(new THREE.MeshBasicMaterial({ map: glowTexture, color: SPORT_COLORS[0].clone(), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
    const glow = new THREE.Mesh(this.track(new THREE.PlaneGeometry(width * 2.6, length * 1.6)), this.glowMaterial);
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.02;
    this.scene.add(glow);
  }

  buildNet() {
    // Built at badminton height (1.55 m); squashed to 0.91 m for pickleball, lowered away for football.
    const net = new THREE.Group();
    const postMaterial = this.track(new THREE.MeshStandardMaterial({ color: '#e2e8f0', metalness: 0.6, roughness: 0.3 }));
    const postGeometry = this.track(new THREE.CylinderGeometry(0.035, 0.035, 1.55, 12));
    for (const x of [-3.1, 3.1]) {
      const post = new THREE.Mesh(postGeometry, postMaterial);
      post.position.set(x, 0.775, 0);
      net.add(post);
    }
    const meshTexture = this.track(canvasTexture(64, 64, (ctx, w, h) => {
      ctx.strokeStyle = 'rgba(255,255,255,.9)';
      ctx.lineWidth = 3;
      ctx.strokeRect(0, 0, w, h);
    }));
    meshTexture.wrapS = THREE.RepeatWrapping;
    meshTexture.wrapT = THREE.RepeatWrapping;
    meshTexture.repeat.set(48, 6);
    const netMaterial = this.track(new THREE.MeshBasicMaterial({ map: meshTexture, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
    const mesh = new THREE.Mesh(this.track(new THREE.PlaneGeometry(6.2, 0.76)), netMaterial);
    mesh.position.y = 1.17;
    const tape = new THREE.Mesh(this.track(new THREE.BoxGeometry(6.2, 0.05, 0.02)), this.track(new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false })));
    tape.position.y = 1.55;
    net.add(mesh, tape);
    this.net = net;
    this.scene.add(net);

    // Football goals at both ends, raised from the floor when football is active.
    const goalMaterial = this.track(new THREE.MeshStandardMaterial({ color: '#f8fafc', metalness: 0.3, roughness: 0.35 }));
    const goalNetMaterial = this.track(new THREE.MeshBasicMaterial({ map: meshTexture.clone(), transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false }));
    goalNetMaterial.map.repeat.set(12, 6);
    this.track(goalNetMaterial.map);
    const postGeo = this.track(new THREE.CylinderGeometry(0.04, 0.04, 1, 12));
    const barGeo = this.track(new THREE.CylinderGeometry(0.04, 0.04, 2.4, 12));
    barGeo.rotateZ(Math.PI / 2);
    this.goals = new THREE.Group();
    for (const sign of [-1, 1]) {
      const goal = new THREE.Group();
      for (const x of [-1.2, 1.2]) {
        const post = new THREE.Mesh(postGeo, goalMaterial);
        post.position.set(x, 0.5, 0);
        goal.add(post);
      }
      const bar = new THREE.Mesh(barGeo, goalMaterial);
      bar.position.y = 1;
      const back = new THREE.Mesh(this.track(new THREE.PlaneGeometry(2.4, 1)), goalNetMaterial);
      back.position.set(0, 0.5, sign * 0.6);
      goal.add(bar, back);
      goal.position.z = sign * (COURT.length / 2);
      this.goals.add(goal);
    }
    this.scene.add(this.goals);
  }

  buildBalls() {
    this.ball = new THREE.Group();
    this.scene.add(this.ball);

    // Shuttlecock: cork pointing down the flight direction (-Y in local space).
    const shuttle = new THREE.Group();
    const corkMaterial = this.track(new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.5 }));
    const cork = new THREE.Mesh(this.track(new THREE.SphereGeometry(0.13, 24, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2)), corkMaterial);
    cork.position.y = -0.2;
    const band = new THREE.Mesh(this.track(new THREE.CylinderGeometry(0.13, 0.13, 0.05, 24)), this.track(new THREE.MeshStandardMaterial({ color: '#3b82f6', roughness: 0.4 })));
    band.position.y = -0.18;
    const skirtMaterial = this.track(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.35, transparent: true, opacity: 0.82, side: THREE.DoubleSide, emissive: '#bfe3ff', emissiveIntensity: 0.25 }));
    const skirt = new THREE.Mesh(this.track(new THREE.CylinderGeometry(0.36, 0.12, 0.56, 16, 1, true)), skirtMaterial);
    skirt.position.y = 0.12;
    const featherMaterial = this.track(new THREE.LineBasicMaterial({ color: '#7dd3fc', transparent: true, opacity: 0.9 }));
    const featherPoints = [];
    for (let i = 0; i < 16; i += 1) {
      const a = (i / 16) * Math.PI * 2;
      featherPoints.push(new THREE.Vector3(Math.cos(a) * 0.12, -0.16, Math.sin(a) * 0.12), new THREE.Vector3(Math.cos(a) * 0.365, 0.4, Math.sin(a) * 0.365));
    }
    const feathers = new THREE.LineSegments(this.track(new THREE.BufferGeometry().setFromPoints(featherPoints)), featherMaterial);
    const rim = new THREE.Mesh(this.track(new THREE.TorusGeometry(0.36, 0.012, 8, 40)), this.track(new THREE.MeshBasicMaterial({ color: '#7dd3fc', toneMapped: false })));
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.4;
    shuttle.add(cork, band, skirt, feathers, rim);

    // Pickleball: lime ball with holes.
    const pickle = new THREE.Group();
    const pickleBody = new THREE.Mesh(this.track(new THREE.SphereGeometry(0.36, 40, 28)), this.track(new THREE.MeshStandardMaterial({ color: '#d9f23d', roughness: 0.45, emissive: '#6b7f0c', emissiveIntensity: 0.25 })));
    const holeGeometry = this.track(new THREE.CircleGeometry(0.035, 16));
    const holeMaterial = this.track(new THREE.MeshBasicMaterial({ color: '#3d4a08' }));
    const holes = new THREE.InstancedMesh(holeGeometry, holeMaterial, 40);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 40; i += 1) {
      const y = 1 - (i + 0.5) * (2 / 40);
      const r = Math.sqrt(1 - y * y);
      const theta = i * Math.PI * (3 - Math.sqrt(5));
      dummy.position.set(Math.cos(theta) * r * 0.362, y * 0.362, Math.sin(theta) * r * 0.362);
      dummy.lookAt(dummy.position.clone().multiplyScalar(2));
      dummy.updateMatrix();
      holes.setMatrixAt(i, dummy.matrix);
    }
    pickle.add(pickleBody, holes);

    // Football: white ball with 12 black pentagon patches.
    const football = new THREE.Group();
    const footballBody = new THREE.Mesh(this.track(new THREE.SphereGeometry(0.415, 48, 32)), this.track(new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.38 })));
    const patchGeometry = this.track(new THREE.CircleGeometry(0.13, 5));
    const patchMaterial = this.track(new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.5, side: THREE.DoubleSide }));
    const ico = new THREE.IcosahedronGeometry(1, 0);
    const position = ico.getAttribute('position');
    const seen = new Set();
    for (let i = 0; i < position.count; i += 1) {
      const v = new THREE.Vector3().fromBufferAttribute(position, i).normalize();
      const id = v.toArray().map((n) => n.toFixed(3)).join(',');
      if (seen.has(id)) continue;
      seen.add(id);
      const patch = new THREE.Mesh(patchGeometry, patchMaterial);
      patch.position.copy(v.multiplyScalar(0.418));
      patch.lookAt(patch.position.clone().multiplyScalar(2));
      football.add(patch);
    }
    ico.dispose();
    football.add(footballBody);

    this.sports = [shuttle, pickle, football];
    this.ball.add(...this.sports);

    // Community chapter: all three balls circle each other inside the constellation.
    // Clones share geometry and materials with the originals, so nothing extra to dispose.
    this.orbit = new THREE.Group();
    this.orbitBalls = this.sports.map((mesh) => {
      const copy = mesh.clone();
      this.orbit.add(copy);
      return copy;
    });
    this.scene.add(this.orbit);

    // Halo ring under the hero object.
    this.halo = new THREE.Mesh(this.track(new THREE.TorusGeometry(0.75, 0.01, 8, 80)), this.track(new THREE.MeshBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.6, toneMapped: false })));
    this.halo.rotation.x = Math.PI / 2;
    this.scene.add(this.halo);

    // Motion trail for the flying shuttle.
    this.trailGeometry = this.track(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 28 }, () => new THREE.Vector3())));
    this.trailMaterial = this.track(new THREE.LineBasicMaterial({ color: '#7dd3fc', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.trail = new THREE.Line(this.trailGeometry, this.trailMaterial);
    this.scene.add(this.trail);
  }

  buildParticles() {
    const count = this.lowPower ? 700 : 1600;
    const positions = new Float32Array(count * 3);
    this.particleSpeed = new Float32Array(count);
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 1] = Math.random() * 22;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 60;
      this.particleSpeed[i] = 0.2 + Math.random() * 0.6;
    }
    const geometry = this.track(new THREE.BufferGeometry());
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const dot = this.track(canvasTexture(64, 64, (ctx, w, h) => {
      const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      gradient.addColorStop(0, 'rgba(255,255,255,1)');
      gradient.addColorStop(0.4, 'rgba(255,255,255,.5)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
    }));
    this.particleMaterial = this.track(new THREE.PointsMaterial({ size: 0.16, map: dot, color: '#7dd3fc', transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.particles = new THREE.Points(geometry, this.particleMaterial);
    this.scene.add(this.particles);
  }

  buildBeams() {
    const alpha = this.track(canvasTexture(4, 256, (ctx, w, h) => {
      const gradient = ctx.createLinearGradient(0, 0, 0, h);
      gradient.addColorStop(0, 'rgba(255,255,255,0)');
      gradient.addColorStop(1, 'rgba(255,255,255,1)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
    }));
    const height = 20;
    const geometry = this.track(new THREE.ConeGeometry(2.2, height, 40, 1, true));
    geometry.translate(0, -height / 2, 0);
    this.beams = [];
    const lamp = this.track(new THREE.SphereGeometry(0.35, 16, 12));
    const lampMaterial = this.track(new THREE.MeshBasicMaterial({ color: '#e0f2fe', toneMapped: false }));
    for (const [x, z] of [[-11, -14], [11, -14], [-11, 14], [11, 14]]) {
      const material = this.track(new THREE.MeshBasicMaterial({ color: '#7cc4ff', alphaMap: alpha, transparent: true, opacity: 0.06, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
      const beam = new THREE.Mesh(geometry, material);
      const origin = new THREE.Vector3(x, 15, z);
      beam.position.copy(origin);
      beam.userData.origin = origin;
      beam.userData.phase = Math.random() * Math.PI * 2;
      this.scene.add(beam);
      const bulb = new THREE.Mesh(lamp, lampMaterial);
      bulb.position.copy(origin);
      this.scene.add(bulb);
      this.beams.push(beam);
    }
  }

  buildCards() {
    const specs = [
      { accent: '#38bdf8', title: 'Uy tín tham gia', value: '98/100', caption: '24 buổi đã xác minh', initials: 'TL', bar: 0.98 },
      { accent: '#a3e635', title: 'Mã check-in', value: '482 913', caption: 'Tự đổi sau mỗi 60 giây', initials: '✓', bar: 0.62 },
      { accent: '#f472b6', title: 'Xác nhận chéo', value: '3 người', caption: 'Đã gặp nhau tại sân', initials: 'MA', bar: 1 },
      { accent: '#fbbf24', title: 'Trình độ', value: 'Khá', caption: 'Cầu lông · 56 trận', initials: 'PN', bar: 0.75 },
    ];
    const geometry = this.track(new THREE.PlaneGeometry(1.7, 1.06));
    this.cards = specs.map((spec, index) => {
      const texture = this.track(canvasTexture(512, 320, (ctx, w, h) => drawCard(ctx, w, h, spec)));
      const material = this.track(new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
      const card = new THREE.Mesh(geometry, material);
      card.userData.angle = (index / specs.length) * Math.PI * 2;
      this.scene.add(card);
      return card;
    });
  }

  buildNetwork() {
    const count = 42;
    const nodes = [];
    for (let i = 0; i < count; i += 1) {
      const y = 0.15 + 0.85 * ((i + 0.5) / count);
      const r = Math.sqrt(1 - y * y);
      const theta = i * Math.PI * (3 - Math.sqrt(5));
      nodes.push(new THREE.Vector3(Math.cos(theta) * r * 7, 1 + y * 5.5, Math.sin(theta) * r * 7));
    }
    const nodeMaterial = this.track(new THREE.MeshBasicMaterial({ color: '#e0f2fe', transparent: true, opacity: 0, toneMapped: false }));
    this.nodeMesh = new THREE.InstancedMesh(this.track(new THREE.SphereGeometry(0.11, 12, 10)), nodeMaterial, count);
    const dummy = new THREE.Object3D();
    nodes.forEach((node, index) => { dummy.position.copy(node); dummy.updateMatrix(); this.nodeMesh.setMatrixAt(index, dummy.matrix); });
    const linePoints = [];
    nodes.forEach((node, index) => {
      nodes.map((other, j) => [j, node.distanceTo(other)]).filter(([j]) => j > index).sort((a, b) => a[1] - b[1]).slice(0, 3)
        .forEach(([j]) => linePoints.push(node, nodes[j]));
    });
    this.linkMaterial = this.track(new THREE.LineBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.links = new THREE.LineSegments(this.track(new THREE.BufferGeometry().setFromPoints(linePoints)), this.linkMaterial);
    this.network = new THREE.Group();
    this.network.add(this.nodeMesh, this.links);
    this.scene.add(this.network);
  }

  setTheme(dark) {
    this.dark = dark;
    this.applyPalette();
  }

  // Halloween is always a night scene, whatever the page theme.
  setMode(halloween) {
    this.halloween = halloween;
    if (halloween && !this.spooky) this.buildHalloween();
    if (this.spooky) this.spooky.visible = halloween;
    this.applyPalette();
  }

  applyPalette() {
    const spooky = Boolean(this.halloween);
    const dark = this.dark || spooky;
    this.night = dark;
    this.lineColors = spooky ? HALLOWEEN_COLORS : SPORT_COLORS;
    this.courtLines.forEach((group, index) => {
      group.children[0].material.color.copy(this.lineColors[index]);
      group.userData.kitchen?.color.copy(this.lineColors[index]);
    });
    this.grid.material.color.set(spooky ? '#ff9a5a' : '#ffffff');
    this.rim.color.set(spooky ? '#a855f7' : '#38bdf8');
    this.warm.color.set(spooky ? '#ff7a1a' : '#f472b6');
    this.hemi.color.set(spooky ? '#c4a1ff' : '#9cc7ff');
    for (const beam of this.beams) beam.material.color.set(spooky ? '#c084fc' : '#7cc4ff');
    const background = new THREE.Color(spooky ? '#0d0614' : dark ? '#050a18' : '#dbe8fb');
    this.scene.background = background;
    this.scene.fog.color.copy(background);
    this.floorMaterial.color.set(spooky ? '#120a1c' : dark ? '#081226' : '#c9daf3');
    this.courtMaterial.emissive.set(spooky ? '#1a0a24' : dark ? '#07263a' : '#0d3550');
    this.grid.material.opacity = dark ? 0.18 : 0.3;
    this.hemi.intensity = dark ? 0.9 : 1.6;
    this.particleMaterial.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending;
    this.particleMaterial.color.set(spooky ? '#ffa94d' : dark ? '#7dd3fc' : '#3b82f6');
    this.particleMaterial.needsUpdate = true;
    // Additive glow vanishes on a light sky, so switch the network to solid blue there.
    this.nodeMesh.material.color.set(spooky ? '#ffd29a' : dark ? '#e0f2fe' : '#1d4ed8');
    this.linkMaterial.color.set(spooky ? '#c084fc' : dark ? '#38bdf8' : '#2563eb');
    this.linkMaterial.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending;
    this.linkMaterial.needsUpdate = true;
  }

  // Halloween night: moon, glowing jack-o'-lanterns around the court and a flock of bats.
  // Built on first use so the default mode pays nothing for it.
  buildHalloween() {
    this.spooky = new THREE.Group();
    this.scene.add(this.spooky);

    const moonTexture = this.track(canvasTexture(256, 256, (ctx, w, h) => {
      const halo = ctx.createRadialGradient(w / 2, h / 2, w * 0.18, w / 2, h / 2, w / 2);
      halo.addColorStop(0, 'rgba(255, 214, 150, .55)');
      halo.addColorStop(1, 'rgba(255, 214, 150, 0)');
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, w, h);
      const disc = ctx.createRadialGradient(w * 0.44, h * 0.42, 4, w / 2, h / 2, w * 0.2);
      disc.addColorStop(0, '#fff7e0');
      disc.addColorStop(1, '#f5c97a');
      ctx.fillStyle = disc;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, w * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(190, 130, 70, .28)';
      for (const [x, y, r] of [[0.45, 0.44, 0.035], [0.56, 0.53, 0.025], [0.47, 0.58, 0.018], [0.58, 0.41, 0.015]]) {
        ctx.beginPath();
        ctx.arc(w * x, h * y, w * r, 0, Math.PI * 2);
        ctx.fill();
      }
    }));
    this.moon = new THREE.Sprite(this.track(new THREE.SpriteMaterial({ map: moonTexture, fog: false, depthWrite: false, toneMapped: false })));
    this.moon.scale.setScalar(14);
    // Drawn last: it writes no depth, so the far floor grid would otherwise paint over it.
    this.moon.renderOrder = 10;
    this.moon.position.set(-16, 18, -32);
    this.spooky.add(this.moon);

    // Jack-o'-lantern: ribbed orange body with a carved face that glows (face sits at +Z, see lookAt below).
    const body = this.track(new THREE.SphereGeometry(0.5, 40, 28));
    const position = body.getAttribute('position');
    for (let i = 0; i < position.count; i += 1) {
      const x = position.getX(i);
      const z = position.getZ(i);
      const ribs = 1 - 0.07 * (1 - Math.abs(Math.cos(Math.atan2(z, x) * 4)));
      position.setXYZ(i, x * ribs, position.getY(i) * 0.82, z * ribs);
    }
    body.computeVertexNormals();
    const face = this.track(canvasTexture(512, 256, (ctx, w, h) => {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#ffd36b';
      const cx = w * 0.25;
      const eye = (x) => { ctx.beginPath(); ctx.moveTo(x - 20, 112); ctx.lineTo(x + 20, 112); ctx.lineTo(x, 80); ctx.closePath(); ctx.fill(); };
      eye(cx - 34);
      eye(cx + 34);
      ctx.beginPath();
      ctx.moveTo(cx - 8, 128); ctx.lineTo(cx + 8, 128); ctx.lineTo(cx, 116); ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx - 60, 140);
      const teeth = [[-46, 160], [-34, 148], [-20, 166], [-6, 150], [8, 166], [22, 150], [36, 164], [48, 146], [60, 140]];
      for (const [dx, y] of teeth) ctx.lineTo(cx + dx, y);
      ctx.quadraticCurveTo(cx, 198, cx - 60, 140);
      ctx.fill();
    }));
    const stem = this.track(new THREE.CylinderGeometry(0.04, 0.06, 0.18, 8));
    const stemMaterial = this.track(new THREE.MeshStandardMaterial({ color: '#4d3b1f', roughness: 0.9 }));
    this.pumpkinMaterial = this.track(new THREE.MeshStandardMaterial({ color: '#ff7a1a', roughness: 0.55, emissive: '#ffb347', emissiveMap: face, emissiveIntensity: 1.6 }));
    const spots = [[-4.3, -5.5, 0.9], [4.4, -3.2, 0.7], [-4.6, 1.6, 0.6], [4.2, 3.8, 0.85], [-3.9, 6.8, 0.7], [3.6, 7.6, 0.55], [0, -8.6, 1.1], [-1.8, 8.9, 0.6]];
    this.pumpkins = spots.map(([x, z, size]) => {
      const pumpkin = new THREE.Group();
      const mesh = new THREE.Mesh(body, this.pumpkinMaterial);
      const top = new THREE.Mesh(stem, stemMaterial);
      top.position.y = 0.45;
      top.rotation.z = 0.2;
      pumpkin.add(mesh, top);
      pumpkin.position.set(x, 0.41 * size, z);
      pumpkin.scale.setScalar(size);
      this.spooky.add(pumpkin);
      return pumpkin;
    });
    this.pumpkinLights = [[-4.3, -5.5], [4.2, 3.8]].map(([x, z]) => {
      const light = new THREE.PointLight('#ff8a1f', 8, 7, 2);
      light.position.set(x, 0.6, z);
      this.spooky.add(light);
      return light;
    });

    // Bats: a body and two scalloped wings that flap around the body.
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.quadraticCurveTo(0.25, 0.22, 0.62, 0.12);
    wingShape.quadraticCurveTo(0.5, 0.02, 0.48, -0.08);
    wingShape.quadraticCurveTo(0.38, 0.0, 0.3, -0.07);
    wingShape.quadraticCurveTo(0.22, 0.0, 0.14, -0.06);
    wingShape.quadraticCurveTo(0.08, -0.02, 0, -0.05);
    const wing = this.track(new THREE.ShapeGeometry(wingShape));
    const batMaterial = this.track(new THREE.MeshBasicMaterial({ color: '#120818', side: THREE.DoubleSide }));
    const batBody = this.track(new THREE.SphereGeometry(0.07, 10, 8));
    const count = this.lowPower ? 8 : 16;
    this.bats = Array.from({ length: count }, (_, index) => {
      const bat = new THREE.Group();
      bat.add(new THREE.Mesh(batBody, batMaterial));
      // Each wing lies flat (span along ±X) inside a hinge that rotates about the bat's forward (Z) axis.
      const [left, right] = [1, -1].map((side) => {
        const hinge = new THREE.Group();
        const mesh = new THREE.Mesh(wing, batMaterial);
        mesh.rotation.x = -Math.PI / 2;
        mesh.scale.x = side;
        hinge.add(mesh);
        bat.add(hinge);
        return hinge;
      });
      bat.userData = {
        left, right,
        radius: 5 + (index % 5) * 1.6,
        height: 3.5 + ((index * 37) % 50) / 10,
        speed: (0.25 + ((index * 13) % 10) / 30) * (index % 2 ? 1 : -1),
        phase: (index / count) * Math.PI * 2,
        flap: 9 + (index % 4) * 1.5,
      };
      bat.scale.setScalar(0.9 + (index % 3) * 0.25);
      this.spooky.add(bat);
      return bat;
    });
  }

  animateHalloween(time) {
    if (!this.spooky?.visible) return;
    const t = this.reducedMotion ? 0 : time;
    // The camera mostly looks down at the court, so the moon rides along in the upper corner of the view.
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    const right = new THREE.Vector3().crossVectors(forward, this.camera.up).normalize();
    const wide = this.camera.aspect > 1.1;
    // Place it on the horizon line just under the top edge; it must stay above the floor or the grid covers it.
    const flat = new THREE.Vector3(forward.x, 0, forward.z).normalize();
    const elevation = Math.asin(forward.y) + THREE.MathUtils.degToRad(this.camera.fov / 2 - 10);
    this.moon.position.copy(this.camera.position).addScaledVector(flat, 40).addScaledVector(right, wide ? 13 : 3);
    this.moon.position.y = Math.max(3, this.camera.position.y + Math.tan(elevation) * 40);
    const flicker = 1.35 + Math.sin(t * 9) * 0.12 + Math.sin(t * 23) * 0.08;
    this.pumpkinMaterial.emissiveIntensity = flicker;
    this.pumpkinLights.forEach((light, index) => { light.intensity = 7 + Math.sin(t * 11 + index) * 1.5; });
    // Carved faces turn toward the viewer.
    const look = new THREE.Vector3();
    for (const pumpkin of this.pumpkins) {
      look.set(this.camera.position.x, pumpkin.position.y, this.camera.position.z);
      pumpkin.lookAt(look);
    }
    for (const bat of this.bats) {
      const { left, right, radius, height, speed, phase, flap } = bat.userData;
      const angle = phase + t * speed;
      bat.position.set(Math.cos(angle) * radius, height + Math.sin(t * 1.3 + phase) * 0.6, Math.sin(angle) * radius);
      // Point the bat's Z axis along its velocity on the circle.
      bat.rotation.set(0, Math.atan2(-Math.sin(angle) * speed, Math.cos(angle) * speed), Math.sin(t * 2 + phase) * 0.15);
      const beat = Math.sin(t * flap + phase) * 0.8;
      left.rotation.z = beat;
      right.rotation.z = -beat;
    }
  }

  setPointer(x, y) {
    this.pointer.set(x, y);
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    // Portrait screens need a wider lens so the court still fits.
    this.camera.fov = this.camera.aspect < 0.8 ? 62 : this.camera.aspect < 1.2 ? 50 : 42;
    this.camera.updateProjectionMatrix();
  }

  update(beat, time, velocity = 0) {
    const c = clamp(beat, 0, 7);
    const wide = this.camera.aspect > 1.1;
    const portrait = this.camera.aspect < 0.8;

    // Camera path + side shift so the subject sits next to the copy on wide screens.
    const [px, py, pz, lx, ly, lz, shift] = sampleKeys(CAMERA_KEYS, c);
    const position = new THREE.Vector3(px, py, pz);
    const look = new THREE.Vector3(lx, ly, lz);
    const forward = look.clone().sub(position).normalize();
    const right = new THREE.Vector3().crossVectors(forward, this.camera.up).normalize();
    const up = new THREE.Vector3().crossVectors(right, forward);
    const offset = right.clone().multiplyScalar(-(wide ? shift : 0));
    if (portrait) {
      // Copy sits in the lower half on phones, so lift the subject into the upper half.
      position.add(forward.clone().multiplyScalar(-2.6));
      offset.add(up.clone().multiplyScalar(-2));
    }
    this.pointerSmooth.lerp(this.pointer, 0.05);
    const parallax = right.clone().multiplyScalar(this.pointerSmooth.x * 0.45).add(up.clone().multiplyScalar(this.pointerSmooth.y * 0.25));
    this.camera.position.copy(position).add(offset).add(parallax);
    this.camera.lookAt(look.add(offset));

    // Ball flight / pose. In the community chapter the single ball hands over to the orbiting trio.
    const networkIn = window4(5.5, 5.95, 6.45, 6.85, c);
    const [bx, by, bz, scale] = sampleKeys(BALL_KEYS, c);
    const bob = this.reducedMotion ? 0 : Math.sin(time * 1.6) * 0.08 * (1 - window4(0.4, 0.6, 1.4, 1.6, c));
    this.ball.position.set(bx, by + bob, bz);
    this.ball.scale.setScalar(Math.max(0.0001, scale * (1 - networkIn)));
    this.ball.visible = networkIn < 0.99;

    // Sport morph: 0 shuttle → 1 pickleball → 2 football, then back to the shuttle for the finale.
    const sport = smooth(2.42, 2.62, c) + smooth(3.42, 3.62, c) - 2 * smooth(5.5, 5.9, c);
    this.sports.forEach((mesh, index) => {
      const weight = clamp(1 - Math.abs(sport - index) * 1.8);
      const pop = weight <= 0 ? 0 : weight < 1 ? weight + Math.sin(weight * Math.PI) * 0.25 : 1;
      mesh.visible = pop > 0.001;
      mesh.scale.setScalar(Math.max(0.0001, pop));
    });

    // Orientation: spin when hovering, align with velocity while flying.
    const flying = window4(0.45, 0.6, 1.4, 1.6, c);
    const ahead = sampleKeys(BALL_KEYS, Math.min(7, c + 0.02));
    const direction = new THREE.Vector3(ahead[0] - bx, ahead[1] - by, ahead[2] - bz);
    const spin = this.reducedMotion ? 0 : time * 0.6;
    const idle = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.35 + Math.sin(time * 0.7) * 0.1, spin, 0.25));
    if (direction.lengthSq() > 1e-6) {
      const flight = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), direction.normalize());
      flight.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), time * 4));
      this.ball.quaternion.copy(idle).slerp(flight, flying);
    } else {
      this.ball.quaternion.copy(idle);
    }

    // Trail behind the shuttle.
    const trail = this.trailGeometry.getAttribute('position');
    for (let index = 0; index < trail.count; index += 1) {
      const sample = sampleKeys(BALL_KEYS, Math.max(0, c - index * 0.012));
      trail.setXYZ(index, sample[0], sample[1], sample[2]);
    }
    trail.needsUpdate = true;
    this.trailMaterial.opacity = flying * 0.85;

    // Sport colour on court lines.
    const color = this.lineColors[0].clone().lerp(this.lineColors[1], clamp(sport)).lerp(this.lineColors[2], clamp(sport - 1));
    this.glowMaterial.color.copy(color);
    // Court markings, surface, net height and goals follow the active sport.
    const weights = [1 - clamp(sport), clamp(1 - Math.abs(sport - 1)), clamp(sport - 1)];
    this.courtLines.forEach((group, index) => {
      group.visible = weights[index] > 0.01;
      group.children[0].material.opacity = weights[index];
      if (group.userData.kitchen) group.userData.kitchen.opacity = 0.14 * weights[index];
    });
    const surfaces = this.halloween ? COURT_SURFACES.halloween : this.night ? COURT_SURFACES.dark : COURT_SURFACES.light;
    this.courtMaterial.color.copy(surfaces[0]).lerp(surfaces[1], clamp(sport)).lerp(surfaces[2], clamp(sport - 1));
    // Net: 1.55 m badminton → 0.91 m pickleball, gone for football and while the trio orbits.
    const netHeight = (1 - 0.41 * clamp(sport)) * (1 - weights[2]) * (1 - networkIn);
    this.net.scale.y = Math.max(0.001, netHeight);
    this.net.visible = netHeight > 0.01;
    this.goals.scale.y = Math.max(0.001, weights[2]);
    this.goals.visible = weights[2] > 0.01;
    this.halo.material.color.copy(color);
    this.halo.position.set(bx, 0.03, bz);
    this.halo.scale.setScalar(scale * (1.1 + Math.sin(time * 2) * 0.05));
    // Only in the hero: on the court it would read as a centre circle badminton and pickleball do not have.
    this.halo.material.opacity = 0.35 * (1 - smooth(0.2, 0.5, c));
    this.halo.visible = c < 0.5;

    // Reputation cards orbit the ball (beat 5).
    const cardsIn = window4(4.55, 4.95, 5.45, 5.8, c);
    this.cards.forEach((card, index) => {
      const angle = card.userData.angle + (this.reducedMotion ? 0 : time * 0.25) + c * 0.9;
      const radius = 1.95 + (1 - cardsIn) * 2;
      card.position.set(Math.cos(angle) * radius, 2 + Math.sin(time * 0.9 + index) * 0.12 + (index % 2 ? 0.5 : -0.25), Math.sin(angle) * radius);
      card.lookAt(this.camera.position);
      card.material.opacity = cardsIn * (0.55 + 0.45 * clamp((Math.sin(angle) + 1) / 1.2));
      card.visible = cardsIn > 0.01;
    });

    // Community constellation (beat 6) with the three balls orbiting at its centre.
    this.nodeMesh.material.opacity = networkIn;
    this.linkMaterial.opacity = networkIn * (0.45 + Math.sin(time * 2.2) * 0.15);
    this.network.rotation.y = (this.reducedMotion ? 0 : time * 0.06) + c * 0.4;
    this.network.scale.setScalar(0.7 + networkIn * 0.3);
    this.network.visible = networkIn > 0.01;
    const orbitTime = this.reducedMotion ? 0 : time;
    this.orbit.visible = networkIn > 0.01;
    this.orbit.position.set(0, 2.6, 0);
    this.orbitBalls.forEach((orbitBall, index) => {
      const angle = orbitTime * 0.9 + index * ((Math.PI * 2) / 3) + c * 1.2;
      const radius = 0.3 + 1.4 * networkIn;
      orbitBall.position.set(Math.cos(angle) * radius, Math.sin(orbitTime * 1.4 + index * 2) * 0.3, Math.sin(angle) * radius);
      orbitBall.rotation.set(orbitTime * 0.7 + index, orbitTime * 1.1 + index, 0.35);
      orbitBall.scale.setScalar(Math.max(0.0001, networkIn * 1.7));
    });

    // Stadium beams sweep and flare up for the finale.
    const finale = smooth(6.2, 6.9, c);
    for (const beam of this.beams) {
      const sway = this.reducedMotion ? 0 : Math.sin(time * 0.5 + beam.userData.phase) * 2.5;
      const target = new THREE.Vector3(sway, 0, sway * 0.6);
      const dir = target.sub(beam.userData.origin).normalize();
      beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
      beam.material.opacity = this.night ? 0.05 + finale * 0.16 : 0.015 + finale * 0.05;
    }
    this.rim.intensity = 30 + finale * 40;

    // Ambient particles drift upward; scrolling fast stretches them into speed.
    const positions = this.particles.geometry.getAttribute('position');
    const boost = 1 + Math.min(6, Math.abs(velocity) * 40);
    for (let i = 0; i < positions.count; i += 1) {
      let y = positions.getY(i) + this.particleSpeed[i] * 0.01 * boost;
      if (y > 22) y = 0;
      positions.setY(i, y);
    }
    positions.needsUpdate = true;
    this.particleMaterial.size = 0.16 * (1 + Math.min(1.5, Math.abs(velocity) * 10));

    this.animateHalloween(time);
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    for (const item of this.disposables) item.dispose?.();
    this.nodeMesh.dispose();
    this.renderer.dispose();
  }
}
