import "./ui.js";
// MacBook Pro 14 (M5) model from Sketchfab, Free Standard licence; wallpaper texture and vertex colours stripped, normals quantised.
// Homepage: a laptop that turns around and opens on scroll, then shows each case on its screen.
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, PlaneGeometry, MeshPhysicalMaterial, MeshBasicMaterial,
  CanvasTexture, SRGBColorSpace, NeutralToneMapping, PMREMGenerator, Raycaster, Vector2, MathUtils,
  DataTexture, DataUtils, RGBAFormat, FloatType, EquirectangularReflectionMapping, LinearSRGBColorSpace, LinearFilter,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

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
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = SRGBColorSpace;
  const scene = new Scene();
  const camera = new PerspectiveCamera(30, 1, 1, 1000);
  camera.position.set(0, 0, 100);

  // ---------- studio light: a real studio HDRI (Poly Haven, CC0), desaturated, 512x256 half floats ----------
  const pmrem = new PMREMGenerator(renderer);
  scene.environmentIntensity = 0.85;
  scene.environmentRotation.y = 3;
  fetch('/models/studio-env.bin').then((r) => r.arrayBuffer()).then((buf) => {
    const h = new Uint16Array(buf), n = h.length, d = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { const v = DataUtils.fromHalfFloat(h[i]); d[i * 4] = v; d[i * 4 + 1] = v * 0.995; d[i * 4 + 2] = v * 0.985; d[i * 4 + 3] = 1; }
    const tx = new DataTexture(d, 512, 256, RGBAFormat, FloatType);
    tx.mapping = EquirectangularReflectionMapping; tx.colorSpace = LinearSRGBColorSpace; tx.flipY = true;
    tx.minFilter = LinearFilter; tx.magFilter = LinearFilter; tx.needsUpdate = true;
    scene.environment = pmrem.fromEquirectangular(tx).texture;
    tx.dispose(); dirty = true;
  });

  // ---------- MacBook model ----------
  const W = 31.2;                       // layout width in scene units (model is 0.312 m wide)
  const laptop = new Group(); scene.add(laptop);
  const holder = new Group(); laptop.add(holder);
  holder.scale.setScalar(W / 0.312);
  let lid = null, screen = null, glassMesh = null;
  const sc = document.createElement('canvas'); sc.width = 1600; sc.height = 1040;
  const g = sc.getContext('2d');
  const tex = new CanvasTexture(sc); tex.colorSpace = SRGBColorSpace; tex.flipY = false; tex.anisotropy = 8;
  new GLTFLoader().load('/models/macbook-m5.glb', (gl) => {
    const root = gl.scene;
    holder.add(root); holder.updateMatrixWorld(true);
    screen = root.getObjectByName('tfTbkkzhxqpKRgC');
    if (screen) {
      screen.material = new MeshBasicMaterial({ map: tex, toneMapped: false, color: 0xeeeeee });
      // glass over the display: catches the studio reflections like a real screen
      const glass = new Mesh(screen.geometry, new MeshPhysicalMaterial({ color: 0x000000, metalness: 0, roughness: 0.06, transparent: true, opacity: 0.1, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
      glass.position.copy(screen.position); glass.quaternion.copy(screen.quaternion); glass.scale.copy(screen.scale);
      screen.parent.add(glass); glass.renderOrder = 2; glassMesh = glass;
    }
    const lidNode = root.getObjectByName('RcexTyyhpuJYATQ');
    if (lidNode) {
      lid = new Group(); lid.position.set(0, 0, -0.108); holder.add(lid); lid.updateMatrixWorld(true);
      lid.attach(lidNode);
    }
    dirty = true;
    document.documentElement.classList.add('lt-ready');
  });
  // keeps references used below
  const lidOpen = (v) => { if (lid) lid.rotation.x = v; };

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
    const fit = wide ? Math.min(1.15, (halfW * 2 * 0.5) / W) : Math.min(1.2, (halfW * 2 * 0.8) / W);
    const endX = wide ? halfW * 0.3 : 0;
    const endY = wide ? -4 * fit - halfH * 0.12 : halfH * 0.32 - 9 * fit;
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
    lidOpen(lerp(1.92, 0.04, open));
    if (screen) { const vis = open > 0.03; screen.visible = vis; if (glassMesh) glassMesh.visible = vis; }
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
    if (screen && ray.intersectObject(screen).length) location.href = CASES[active].href;
  });
  canvas.addEventListener('mousemove', (e) => {
    if (active < 0) { canvas.style.cursor = ''; return; }
    const r = canvas.getBoundingClientRect();
    m.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(m, camera);
    canvas.style.cursor = screen && ray.intersectObject(screen).length ? 'pointer' : '';
  });
}
