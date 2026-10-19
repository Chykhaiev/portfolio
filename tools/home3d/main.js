import "./ui.js";
// MacBook Pro 14 (M5) model from Sketchfab, Free Standard licence; wallpaper texture and vertex colours stripped, normals quantised.
// Homepage: a laptop that turns around and opens on scroll, then shows each case on its screen.
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, MeshPhysicalMaterial, ShaderMaterial,
  CanvasTexture, SRGBColorSpace, NeutralToneMapping, PMREMGenerator, Raycaster, Vector2, MathUtils,
  DataTexture, DataUtils, RGBAFormat, FloatType, EquirectangularReflectionMapping, LinearSRGBColorSpace, LinearFilter,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import Lenis from 'lenis';

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
  // one texture per case, prepared once; switching cases only changes two uniforms (no texture uploads while scrolling)
  const blank = (() => { const c = document.createElement('canvas'); c.width = c.height = 4; c.getContext('2d').fillRect(0, 0, 4, 4); const tx = new CanvasTexture(c); tx.colorSpace = SRGBColorSpace; tx.flipY = false; return tx; })();
  const caseTex = CASES.map(() => blank);
  const screenMat = new ShaderMaterial({
    uniforms: { a: { value: blank }, b: { value: blank }, t: { value: 0 }, on: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform sampler2D a; uniform sampler2D b; uniform float t; uniform float on; varying vec2 vUv;\n'
      + 'void main(){ vec2 uvb = vUv + vec2(0.0, (1.0 - t) * 0.025); vec2 uva = vUv - vec2(0.0, t * 0.025);\n'
      + ' vec3 c = mix(texture2D(a, uva).rgb, texture2D(b, uvb).rgb, t) * 0.94 * on; gl_FragColor = vec4(c, 1.0);\n'
      + ' #include <colorspace_fragment>\n}',
    toneMapped: false,
  });
  new GLTFLoader().load('/models/macbook-m5.glb', (gl) => {
    const root = gl.scene;
    holder.add(root); holder.updateMatrixWorld(true);
    screen = root.getObjectByName('tfTbkkzhxqpKRgC');
    if (screen) {
      screen.material = screenMat;
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
  CASES.forEach((c, i) => {
    const im = new Image(); im.decoding = 'async'; im.src = c.img;
    im.onload = () => {
      const cv = document.createElement('canvas'); cv.width = 1600; cv.height = 1040;
      const x = cv.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, cv.width, cv.height);
      const s = Math.max(cv.width / im.naturalWidth, cv.height / im.naturalHeight);
      const w = im.naturalWidth * s, h = im.naturalHeight * s;
      x.drawImage(im, (cv.width - w) / 2, (cv.height - h) / 2, w, h);
      const tx = new CanvasTexture(cv); tx.colorSpace = SRGBColorSpace; tx.flipY = false; tx.anisotropy = 8;
      tx.generateMipmaps = true; caseTex[i] = tx; renderer.initTexture(tx); dirty = true;
    };
  });
  function paint(idx, t, on) {
    const a = Math.floor(idx), b = Math.min(a + 1, CASES.length - 1);
    screenMat.uniforms.a.value = caseTex[a];
    screenMat.uniforms.b.value = caseTex[b];
    screenMat.uniforms.t.value = a === b ? 0 : t;
    screenMat.uniforms.on.value = on;
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
  // smooth scrolling: wheel/trackpad input is eased, so the 3D follows it without steps
  const lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.9, anchors: true });
  function readScroll() {
    const r = track.getBoundingClientRect();
    target = clamp(-r.top / Math.max(1, r.height - window.innerHeight));
  }
  lenis.on('scroll', readScroll);
  addEventListener('scroll', readScroll, { passive: true });
  readScroll(); prog = target;

  // pointer parallax (desktop only)
  let px = 0, py = 0, mx = 0, my = 0;
  addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse') return; px = (e.clientX / innerWidth) * 2 - 1; py = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });

  // render only while the scene is on screen
  let visible = true;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(track);

  const N = CASES.length, C0 = 0.3, C1 = 0.97;
  const GLOW = ['163, 230, 53', '255, 107, 44', '203, 236, 121', '255, 122, 61', '41, 151, 255'];
  let active = -1;
  function setActive(i) {
    if (i === active) return; active = i;
    caps.forEach((c, k) => c.classList.toggle('on', k === i));
    dots.forEach((d, k) => d.setAttribute('aria-current', k === i ? 'true' : 'false'));
  }
  dots.forEach((d, k) => d.addEventListener('click', () => {
    const r = track.getBoundingClientRect(); const top = scrollY + r.top; const len = r.height - innerHeight;
    lenis.scrollTo(top + len * (C0 + (k + 0.5) * (C1 - C0) / N), { duration: 1.4 });
  }));
  const glowEl = document.querySelector('.lt-glow');
  const easeOutBack = (x, k = 1.15) => 1 + (k + 1) * Math.pow(x - 1, 3) + k * Math.pow(x - 1, 2);
  const easeInOut = (x) => (x < 0.5 ? 16 * x ** 5 : 1 - Math.pow(-2 * x + 2, 5) / 2); // quintic: slow start, slow landing

  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    lenis.raf(now);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!visible || !lid) { if (!lid && dirty) { renderer.render(scene, camera); dirty = false; } return; }
    // frame-rate independent damping
    prog += (target - prog) * (1 - Math.exp(-dt * 7));
    mx += (px - mx) * (1 - Math.exp(-dt * 3)); my += (py - my) * (1 - Math.exp(-dt * 3));
    const p = prog, time = now / 1000;

    const turn = easeInOut(seg(p, 0.0, 0.24));
    const open = easeOutBack(seg(p, 0.1, 0.27), 0.9);
    const on = seg(p, 0.17, 0.27);
    const fit = wide ? Math.min(1.3, (halfW * 2 * 0.52) / W) : Math.min(1.25, (halfW * 2 * 0.76) / W);
    const endX = wide ? halfW * 0.36 : 0;
    const endY = wide ? -4 * fit - halfH * 0.1 : halfH * 0.3 - 9 * fit;
    const startS = wide ? fit * 0.88 : fit * 0.95;
    const startY = wide ? -halfH * 0.6 : -halfH * 0.36;
    // a little lift in the middle of the turn, like the laptop is picked up
    const lift = Math.sin(Math.PI * turn) * halfH * 0.06;
    laptop.scale.setScalar(lerp(startS, fit, turn));
    const idle = 1 - turn;                       // alive while waiting for the first scroll
    const bob = Math.sin(time * 1.1) * 0.35 * (0.35 + 0.65 * idle);
    laptop.position.set(lerp(0, endX, turn), lerp(startY, endY, turn) + lift + bob, 0);

    const cp = seg(p, C0, C1) * N;
    const idx = clamp(Math.floor(cp), 0, N - 1);
    const local = cp - idx;
    const tr = idx < N - 1 ? ease(seg(local, 0.62, 1)) : 0;
    // between cases the laptop leans a little and comes back
    const cases01 = seg(p, C0, C1);
    const sway = (Math.sin(cases01 * Math.PI * 2) * 0.07 + Math.sin(time * 0.6) * 0.012) * turn;
    const yaw0 = -Math.PI * 1.12 + Math.sin(time * 0.5) * 0.06 * idle;
    laptop.rotation.set(
      lerp(0.78, 0.26, turn) + my * 0.05 * turn,
      lerp(yaw0, wide ? -0.24 : 0, turn) + sway + mx * 0.12,
      lerp(-0.08, 0, turn),
    );
    // studio light sweeps across the body while it turns
    scene.environmentRotation.y = 3 + turn * 1.4 + mx * 0.15;
    lidOpen(lerp(1.92, 0.04, Math.min(1.02, open)));
    if (screen) { const vis = open > 0.03; screen.visible = vis; if (glassMesh) glassMesh.visible = vis; }
    paint(idx, tr, on);

    // soft coloured glow behind the laptop, picks up each case
    if (glowEl) {
      const ga = GLOW[idx].split(',').map(Number), gb = GLOW[Math.min(N - 1, idx + 1)].split(',').map(Number);
      glowEl.style.setProperty('--glow', ga.map((v, k) => Math.round(lerp(v, gb[k], tr))).join(', '));
      glowEl.style.opacity = (on * 0.9 * (1 - seg(p, 0.985, 1))).toFixed(3);
      const sp = laptop.position.clone().project(camera);
      glowEl.style.transform = `translate3d(${((sp.x + 1) / 2 * vw).toFixed(1)}px, ${((1 - sp.y) / 2 * vh - vh * 0.05).toFixed(1)}px, 0) translate(-50%, -50%) scale(${(0.6 + 0.4 * turn).toFixed(3)})`;
    }

    const hf = 1 - seg(p, 0.0, 0.09);
    hero.style.opacity = hf.toFixed(3);
    hero.style.transform = `translate3d(0, ${(-60 * (1 - hf)).toFixed(1)}px, 0) scale(${(1 - 0.04 * (1 - hf)).toFixed(4)})`;
    hero.style.visibility = hf <= 0.001 ? 'hidden' : 'visible';
    const cf = seg(p, 0.25, 0.31) * (1 - seg(p, 0.985, 1));
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
