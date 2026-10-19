import "./ui.js";
// Homepage: a laptop that turns around and opens on scroll, then shows each case on its screen.
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, Shape, ExtrudeGeometry, ShapeGeometry,
  BoxGeometry, CylinderGeometry, PlaneGeometry, MeshPhysicalMaterial, MeshStandardMaterial, MeshBasicMaterial,
  CanvasTexture, SRGBColorSpace, ACESFilmicToneMapping, PMREMGenerator, Color, DoubleSide, BackSide,
  InstancedMesh, Object3D, HemisphereLight, DirectionalLight, Raycaster, Vector2, MathUtils,
} from 'three';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const seg = (p, a, b) => clamp((p - a) / (b - a));

const stage = document.querySelector('.lt-stage');
const track = document.querySelector('.lt-track');
const canvas = document.querySelector('.lt-canvas');
const caps = [...document.querySelectorAll('.lt-case')];
const dots = [...document.querySelectorAll('.lt-dots button')];
const hero = document.querySelector('.lt-hero');
const capWrap = document.querySelector('.lt-caps');
const CASES = caps.map((c) => ({ href: c.querySelector('a').getAttribute('href'), img: c.dataset.img }));

function webglOK() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!stage || !webglOK() || reduce) {
  document.documentElement.classList.add('no3d');
} else {
  init();
}

function init() {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.outputColorSpace = SRGBColorSpace;
  const scene = new Scene();
  const camera = new PerspectiveCamera(30, 1, 1, 1000);
  camera.position.set(0, 0, 100);

  // ---------- studio light (soft boxes baked into an environment map) ----------
  const env = new Scene();
  env.add(new Mesh(new BoxGeometry(300, 300, 300), new MeshBasicMaterial({ color: 0x141418, side: BackSide })));
  const box = (w, h, pos, k) => {
    const m = new Mesh(new PlaneGeometry(w, h), new MeshBasicMaterial({ color: new Color(0xffffff).multiplyScalar(k), side: DoubleSide }));
    m.position.set(...pos); m.lookAt(0, 0, 0); env.add(m);
  };
  box(220, 60, [0, 120, 20], 4.0);    // big top softbox
  box(50, 200, [-130, 20, 50], 3.2);   // left strip, edge highlight
  box(50, 200, [130, 20, -10], 2.4);   // right rim
  box(160, 70, [0, 40, 140], 1.6);     // front fill
  box(200, 40, [0, -110, 60], 0.5);    // floor bounce
  box(260, 120, [0, 110, -140], 3.0);  // back-top softbox: lights flat tops seen from the front
  box(120, 80, [-120, 60, -100], 1.6);
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(env, 0.03).texture;
  scene.add(new HemisphereLight(0xffffff, 0x222226, 0.6));
  const sun = new DirectionalLight(0xffffff, 1.2); sun.position.set(-30, 60, 50); scene.add(sun);

  // ---------- laptop (units: cm) ----------
  const W = 31.2, D = 22, T = 1.45, R = 1.4, LT = 0.55, LH = 21.4;
  const rr = (w, h, r) => {
    const s = new Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0);
    s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2);
    s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
    s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
    return s;
  };
  const alu = new MeshPhysicalMaterial({ color: 0xc9ccd1, metalness: 1, roughness: 0.38, clearcoat: 0.3, clearcoatRoughness: 0.25 });
  const dark = new MeshStandardMaterial({ color: 0x0b0b0c, roughness: 0.55, metalness: 0.2 });
  const black = new MeshBasicMaterial({ color: 0x030303 });

  const laptop = new Group(); scene.add(laptop);
  const body = new Group(); laptop.add(body);
  body.position.set(0, -T / 2, 0);

  const bev = 0.35;
  const baseGeo = new ExtrudeGeometry(rr(W - bev * 2, D - bev * 2, R - bev), { depth: T - bev * 2, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 6, curveSegments: 32 });
  baseGeo.rotateX(-Math.PI / 2); baseGeo.translate(0, bev, 0);
  body.add(new Mesh(baseGeo, alu));
  const top = T + 0.002;

  // keyboard well + keys
  const well = new Mesh(new ShapeGeometry(rr(27.6, 11.4, 0.5), 8), dark);
  well.rotation.x = -Math.PI / 2; well.position.set(0, top, -4.2); body.add(well);
  const keys = [];
  const kw = 1.62, gap = 0.3;
  const rowY = [-8.95, -7.45, -5.8, -4.15, -2.5, -0.85];
  for (let r = 0; r < 6; r++) {
    const cols = r === 0 ? 14 : 14;
    const h = r === 0 ? 0.9 : 1.45;
    let x = -13.25;
    for (let c = 0; c < cols; c++) {
      let w = kw;
      if (r === 5 && c === 4) w = kw * 5 + gap * 4; // space bar
      if (r === 5 && c > 4 && c < 9) continue;
      if (r === 0) w = 1.7;
      keys.push([x + w / 2, rowY[r] + (r === 0 ? 0.28 : 0), w, h]);
      x += w + gap;
    }
  }
  const keyGeo = new BoxGeometry(1, 0.16, 1);
  const keyMesh = new InstancedMesh(keyGeo, new MeshStandardMaterial({ color: 0x1e1e21, roughness: 0.55, metalness: 0.2 }), keys.length);
  const o = new Object3D();
  keys.forEach(([x, z, w, h], i) => { o.position.set(x, top + 0.04, z + 0.3); o.scale.set(w, 1, h); o.updateMatrix(); keyMesh.setMatrixAt(i, o.matrix); });
  body.add(keyMesh);
  // trackpad
  const pad = new Mesh(new ShapeGeometry(rr(13.2, 8.2, 0.55), 8), new MeshPhysicalMaterial({ color: 0x7c7e83, metalness: 1, roughness: 0.22 }));
  pad.rotation.x = -Math.PI / 2; pad.position.set(0, top + 0.001, 6.1); body.add(pad);
  // hinge
  const hinge = new Mesh(new CylinderGeometry(0.45, 0.45, W - 6, 24), dark);
  hinge.rotation.z = Math.PI / 2; hinge.position.set(0, T, -D / 2 + 0.5); body.add(hinge);

  // lid: pivot at hinge, screen faces +z when upright
  const lid = new Group(); lid.position.set(0, T, -D / 2 + 0.5); body.add(lid);
  const lidGeo = new ExtrudeGeometry(rr(W - 0.3, LH, R), { depth: LT, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.12, bevelSegments: 4, curveSegments: 32 });
  lidGeo.translate(0, LH / 2, -LT - 0.12);
  lid.add(new Mesh(lidGeo, alu));
  const bezel = new Mesh(new ShapeGeometry(rr(W - 0.6, LH - 0.3, R - 0.2), 16), black);
  bezel.position.set(0, LH / 2, 0.005); lid.add(bezel);
  const SW = 29.2, SH = SW / 1.6;
  const sc = document.createElement('canvas'); sc.width = 1600; sc.height = 1000;
  const g = sc.getContext('2d');
  const tex = new CanvasTexture(sc); tex.colorSpace = SRGBColorSpace; tex.anisotropy = 8;
  const screen = new Mesh(new PlaneGeometry(SW, SH), new MeshBasicMaterial({ map: tex, toneMapped: false }));
  const screenY = LH / 2 + 0.25;
  screen.position.set(0, screenY, 0.02); lid.add(screen);
  const glass = new Mesh(new PlaneGeometry(SW, SH), new MeshPhysicalMaterial({ color: 0x000000, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.12 }));
  glass.position.set(0, screenY, 0.03); lid.add(glass);
  const cam = new Mesh(new CylinderGeometry(0.12, 0.12, 0.02, 16), new MeshBasicMaterial({ color: 0x1a1d24 }));
  cam.rotation.x = Math.PI / 2; cam.position.set(0, LH - 0.55, 0.02); lid.add(cam);

  // ---------- screen content ----------
  const imgs = CASES.map((c) => { const im = new Image(); im.decoding = 'async'; im.src = c.img; im.onload = () => { dirty = true; }; return im; });
  function drawCover(im, alpha, dy) {
    if (!im.complete || !im.naturalWidth) return;
    const s = Math.max(sc.width / im.naturalWidth, sc.height / im.naturalHeight);
    const w = im.naturalWidth * s, h = im.naturalHeight * s;
    g.globalAlpha = alpha;
    g.drawImage(im, (sc.width - w) / 2, (sc.height - h) / 2 + dy, w, h);
    g.globalAlpha = 1;
  }
  let lastKey = '';
  function paint(idx, t, on) {
    const key = `${idx}|${t.toFixed(3)}|${on.toFixed(3)}|${imgs.map((i) => i.complete).join('')}`;
    if (key === lastKey) return; lastKey = key;
    g.fillStyle = '#000'; g.fillRect(0, 0, sc.width, sc.height);
    const a = Math.floor(idx), b = Math.min(a + 1, CASES.length - 1);
    if (t <= 0 || a === b) drawCover(imgs[a], 1, 0);
    else { drawCover(imgs[a], 1 - t, -t * 60); drawCover(imgs[b], t, (1 - t) * 60); }
    if (on < 1) { g.fillStyle = `rgba(0,0,0,${1 - on})`; g.fillRect(0, 0, sc.width, sc.height); }
    tex.needsUpdate = true;
  }

  // ---------- layout + scroll ----------
  let vw = 1, vh = 1, halfH = 1, halfW = 1, wide = true;
  function resize() {
    vw = stage.clientWidth; vh = stage.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, vw < 760 ? 1.75 : 2);
    renderer.setPixelRatio(dpr); renderer.setSize(vw, vh, false);
    camera.aspect = vw / vh; camera.updateProjectionMatrix();
    halfH = 100 * Math.tan(MathUtils.degToRad(15)); halfW = halfH * camera.aspect;
    wide = vw >= 900;
    dirty = true;
  }
  new ResizeObserver(resize).observe(stage);

  let target = 0, prog = 0, dirty = true;
  function readScroll() {
    const r = track.getBoundingClientRect();
    target = clamp(-r.top / Math.max(1, r.height - window.innerHeight));
  }
  addEventListener('scroll', () => { readScroll(); }, { passive: true });
  readScroll(); prog = target;

  const N = CASES.length, C0 = 0.3, C1 = 0.97;
  let active = -1;
  function setActive(i) {
    if (i === active) return; active = i;
    caps.forEach((c, k) => c.classList.toggle('on', k === i));
    dots.forEach((d, k) => d.setAttribute('aria-current', k === i ? 'true' : 'false'));
  }
  dots.forEach((d, k) => d.addEventListener('click', () => {
    const r = track.getBoundingClientRect(); const top = scrollY + r.top; const len = r.height - innerHeight;
    scrollTo({ top: top + len * (C0 + (k + 0.5) * (C1 - C0) / N), behavior: 'smooth' });
  }));

  function frame() {
    requestAnimationFrame(frame);
    const d = target - prog;
    if (Math.abs(d) > 0.00005) { prog += d * 0.12; dirty = true; }
    if (!dirty) return; dirty = false;
    const p = prog;

    // phase A -> B: turn around and open
    const turn = ease(seg(p, 0.02, 0.24));
    const open = ease(seg(p, 0.1, 0.28));
    const on = seg(p, 0.16, 0.26);
    // where the laptop sits once open
    const fit = wide ? Math.min(1.3, (halfW * 2 * 0.6) / W) : Math.min(1.2, (halfW * 2 * 0.8) / W);
    const endX = wide ? halfW * 0.3 : 0;
    const endY = wide ? -7 * fit - halfH * 0.14 : halfH * 0.32 - 9 * fit;
    const startS = wide ? fit * 0.7 : fit * 0.85;
    const s = lerp(startS, fit, turn);
    laptop.scale.setScalar(s);
    laptop.position.set(lerp(0, endX, turn), lerp(-halfH * 0.62, endY, turn), 0);
    // cases: index from scroll, gentle sway between them
    const cp = seg(p, C0, C1) * N;
    const idx = clamp(Math.floor(cp), 0, N - 1);
    const local = cp - idx;
    const tr = idx < N - 1 ? ease(seg(local, 0.82, 1)) : 0;
    const sway = Math.sin(seg(p, C0, C1) * Math.PI * N) * 0.06 * on;
    laptop.rotation.set(lerp(0.7, 0.3, turn), lerp(-Math.PI * 1.15, wide ? -0.22 : 0, turn) + sway, 0);
    lid.rotation.x = lerp(Math.PI / 2, -0.18, open);
    paint(idx, tr, on);

    // overlays
    const hf = 1 - seg(p, 0.0, 0.1);
    hero.style.opacity = hf.toFixed(3);
    hero.style.transform = `translate3d(0, ${(-40 * (1 - hf)).toFixed(1)}px, 0)`;
    hero.style.visibility = hf <= 0.001 ? 'hidden' : 'visible';
    const cf = seg(p, 0.26, 0.31) * (1 - seg(p, 0.985, 1));
    capWrap.style.opacity = cf.toFixed(3);
    capWrap.style.pointerEvents = cf > 0.5 ? 'auto' : 'none';
    setActive(p >= C0 - 0.04 ? Math.min(N - 1, idx + (tr > 0.5 ? 1 : 0)) : -1);

    renderer.render(scene, camera);
  }
  resize();
  requestAnimationFrame(frame);

  // click on the screen opens the current case
  const ray = new Raycaster(), m = new Vector2();
  canvas.addEventListener('click', (e) => {
    if (active < 0) return;
    const r = canvas.getBoundingClientRect();
    m.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(m, camera);
    if (ray.intersectObject(screen).length) location.href = CASES[active].href;
  });
  canvas.addEventListener('mousemove', (e) => {
    if (active < 0) { canvas.style.cursor = ''; return; }
    const r = canvas.getBoundingClientRect();
    m.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(m, camera);
    canvas.style.cursor = ray.intersectObject(screen).length ? 'pointer' : '';
  });
}
