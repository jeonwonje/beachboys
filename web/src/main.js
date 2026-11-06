import '@fontsource-variable/big-shoulders-display';
import '@fontsource-variable/instrument-sans';
import '@fontsource/jetbrains-mono/500.css';
import './styles.css';
import * as THREE from 'three';
import { createWorld, PATH_Z } from './scene/world.js';
import { GROUND_Y, loadRover } from './scene/rover.js';
import { createDebris, createFlow } from './scene/debris.js';
import { blend, PINS, resolve } from './story.js';
import { initBench, initScore } from './ui/bench.js';
import { initGantt } from './ui/gantt.js';

const BASE = import.meta.env.BASE_URL;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const params = new URLSearchParams(location.search);

const sections = [...document.querySelectorAll('section[data-ch]:not([hidden])')];
const settings = sections.map((s) => resolve(s.dataset.ch));
const roverBase = { z: PATH_Z };

initBench();
initScore();
initGantt(`${BASE}data/gantt.json`);
buildRail();
wireVideos();

let layout = [];
function measure() {
  layout = sections.map((s) => {
    const r = s.getBoundingClientRect();
    return { top: r.top + scrollY, height: r.height };
  });
}
measure();
addEventListener('resize', measure);
new ResizeObserver(measure).observe(document.body);

// Scroll position, as a fractional section index measured at mid-screen.
function chapterAt(y) {
  const mid = y + innerHeight / 2;
  for (let i = 0; i < layout.length; i++) {
    const { top, height } = layout[i];
    if (mid < top + height) return i + Math.max(0, (mid - top) / height);
  }
  return layout.length;
}

function buildRail() {
  const rail = document.querySelector('.rail');
  rail.innerHTML = sections
    .map((s) => `<a href="#${s.id}" data-rail="${s.id}"><span>${s.dataset.label}</span></a>`)
    .join('');
}

function wireVideos() {
  const io = new IntersectionObserver(
    (es) => {
      for (const e of es) {
        if (reduced) continue;
        if (e.isIntersecting) e.target.play().catch(() => {});
        else e.target.pause();
      }
    },
    { threshold: 0.2 },
  );
  document.querySelectorAll('video[data-autoplay]').forEach((v) => io.observe(v));
}

// ── 3D ──────────────────────────────────────────────────────────────────────
function supportsWebGL() {
  if (params.has('nogl')) return false;
  try {
    const c = document.createElement('canvas');
    return !!c.getContext('webgl2');
  } catch {
    return false;
  }
}

async function start3D() {
  const canvas = document.getElementById('stage');
  const mobile = innerWidth < 760;
  // Above about 1.5x the pixels are already small enough that MSAA adds little.
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile && devicePixelRatio < 1.5, powerPreference: 'high-performance' });
  // Spend pixels up to a budget. Beyond it the extra sharpness can't be seen on
  // a moving scene, but the cost still scales with every pixel.
  const budget = mobile ? 2.2e6 : 4.6e6;
  const fitDpr = () =>
    Math.min(devicePixelRatio, mobile ? 1.5 : 1.75, Math.sqrt(budget / (innerWidth * innerHeight)));
  let dprScale = 1;
  let dpr = fitDpr();
  renderer.setPixelRatio(dpr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 2400);
  const world = createWorld(scene, renderer);
  scene.environment = makeEnvironment(renderer);

  const bar = document.querySelector('.loader-bar i');
  const rover = await loadRover(`${BASE}models/beachboy.glb`, (p) => {
    bar.style.transform = `scaleX(${p})`;
  });
  rover.root.position.z = PATH_Z;
  scene.add(rover.root);

  const debris = createDebris(scene);
  const flow = createFlow(rover.lift);

  const pinsEl = document.getElementById('pins');
  for (const p of PINS) {
    const el = document.createElement('div');
    el.className = 'pin';
    el.dataset.pin = p.id;
    el.innerHTML = `<i></i><span>${p.label}</span>`;
    pinsEl.append(el);
    p.el = el;
    p.v = new THREE.Vector3().fromArray(p.p);
  }

  // Hovering a line of the text lights up that part of the machine.
  let highlight = null;
  document.querySelectorAll('[data-part]').forEach((el) => {
    el.addEventListener('pointerenter', () => (highlight = el.dataset.part));
    el.addEventListener('pointerleave', () => (highlight = null));
    el.addEventListener('focusin', () => (highlight = el.dataset.part));
  });

  // Drag anywhere that isn't UI to look around.
  let drag = null;
  let yaw = 0;
  let pitch = 0;
  const isUI = (t) => t.closest?.('.panel, .sheet, a, button, video, nav, header');
  addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || isUI(e.target)) return;
    drag = { x: e.clientX, y: e.clientY, yaw, pitch };
    document.body.classList.add('dragging');
  });
  addEventListener('pointermove', (e) => {
    if (!drag) return;
    yaw = drag.yaw + (e.clientX - drag.x) * 0.006;
    pitch = THREE.MathUtils.clamp(drag.pitch + (e.clientY - drag.y) * 0.004, -0.4, 0.7);
  });
  addEventListener('pointerup', () => {
    drag = null;
    document.body.classList.remove('dragging');
  });

  function resize() {
    const w = innerWidth;
    const h = innerHeight;
    dpr = fitDpr() * dprScale;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  resize();

  const clock = new THREE.Clock();
  let chapter = chapterAt(scrollY);
  let rollDist = 0;
  let lastRover = 0;
  let visible = true;
  const startX = 0.9;
  const passIdx = sections.findIndex((s) => s.dataset.ch === 'pass');
  const railLinks = [...document.querySelectorAll('[data-rail]')];
  const grade = document.getElementById('grade');
  const look = new THREE.Vector3();
  const pinP = new THREE.Vector3();
  let activeRail = -1;
  let slowSum = 0;
  let slowCount = 0;
  let frameNo = 0;
  let shadowKey = '';
  let lastGrade = -1;

  function frame() {
    if (!visible) return;
    requestAnimationFrame(frame);
    const rawDt = clock.getDelta();
    const dt = Math.min(rawDt, 0.05);
    const time = clock.elapsedTime;
    frameNo++;

    const targetCh = chapterAt(scrollY);
    chapter = reduced || params.has('snap') ? targetCh : chapter + (targetCh - chapter) * Math.min(1, dt * 5);
    // Each chapter's settings apply at its middle.
    const c = THREE.MathUtils.clamp(chapter - 0.5, 0, settings.length - 1);
    const i = Math.min(Math.floor(c), settings.length - 2);
    const s = blend(settings[i], settings[i + 1], c - i, roverBase);

    // Motion: the rover only rolls when the scroll moves it.
    const dRover = s.rover - lastRover;
    rollDist += dRover;
    lastRover = s.rover;
    rover.root.position.x = s.rover;

    const motion = reduced ? 0 : 1;
    rover.update(dt, {
      explode: s.explode,
      focus: s.focus,
      belt: Math.max(s.belt, Math.abs(dRover) > 0.0005 ? 1 : 0) * motion,
      rock: 1,
      rockAmp: Math.max(s.rock, Math.min(1, Math.abs(dRover) * 80)) * motion,
      roll: rollDist,
      highlight,
    });
    // Behind a full paper sheet only the margins show, so draw less often.
    const covered = s.dim > 0.9;
    if (covered && frameNo % 3 !== 0) return;
    const passP = THREE.MathUtils.clamp(chapter - passIdx, 0, 1);
    flow.update(dt, { flow: s.flow * motion, fill: Math.max(passP, chapter > passIdx + 1 ? 1 : 0) });
    debris.update(dt, { tide: s.tide, roverX: s.rover });

    world.setTime(s.time);
    world.shared.uRoverX.value = s.rover + 0.5;
    world.shared.uStartX.value = startX;
    world.shared.uHighlight.value = s.band;

    // Camera, with drag offset that eases back when released.
    const az = THREE.MathUtils.degToRad(s.az) + yaw;
    const el = THREE.MathUtils.clamp(THREE.MathUtils.degToRad(s.el) + pitch, 0.03, 1.4);
    const narrow = innerWidth < 760;
    const d = s.d * (narrow ? 1.55 : innerWidth / innerHeight < 1.3 ? 1.25 : 1);
    look.set(s.t[0], s.t[1], s.t[2]);
    camera.position.set(
      look.x + d * Math.cos(el) * Math.cos(az),
      Math.max(look.y + d * Math.sin(el), 0.12),
      look.z + d * Math.cos(el) * Math.sin(az),
    );
    camera.lookAt(look);
    // Slide the subject to one side of the frame, out from behind the text.
    if (!narrow && Math.abs(s.side) > 0.001) {
      const w = innerWidth;
      const h = innerHeight;
      camera.setViewOffset(w, h, -s.side * w, 0, w, h);
    } else {
      camera.clearViewOffset();
    }
    if (narrow) camera.setViewOffset(innerWidth, innerHeight, 0, innerHeight * 0.16, innerWidth, innerHeight);
    if (!drag && !reduced) {
      yaw *= 0.985;
      pitch *= 0.985;
    }

    world.update(time, camera.position, s.rover);
    const g = Math.round(s.dim * 55) / 100;
    if (g !== lastGrade) {
      grade.style.opacity = g;
      lastGrade = g;
    }

    // Shadows only change when the machine or the sun moves.
    const key = [s.rover, s.explode, s.time, s.focus.conveyor, s.focus.drum, s.focus.bin].map((v) => v.toFixed(3)).join();
    const moving = s.belt > 0.01 || s.rock > 0.01 || Math.abs(dRover) > 0.0005;
    if (key !== shadowKey || (moving && frameNo % 2 === 0)) {
      renderer.shadowMap.needsUpdate = true;
      shadowKey = key;
    }

    renderer.render(scene, camera);

    // Floating labels.
    camera.updateMatrixWorld();
    const W = innerWidth;
    const H = innerHeight;
    const cur = sections[Math.round(THREE.MathUtils.clamp(chapter - 0.5, 0, sections.length - 1))].dataset.ch;
    for (const p of PINS) {
      const on = p.ch.includes(cur) && !narrow;
      if (!on) {
        p.el.classList.remove('on');
        continue;
      }
      const off = rover.partOffset(p.anchor, s.explode, s.focus);
      pinP.copy(p.v).add(off);
      pinP.y -= GROUND_Y;
      pinP.x += s.rover;
      pinP.z += PATH_Z;
      pinP.project(camera);
      p.el.style.transform = `translate(${((pinP.x * 0.5 + 0.5) * W).toFixed(1)}px,${((-pinP.y * 0.5 + 0.5) * H).toFixed(1)}px)`;
      p.el.classList.add('on');
      p.el.classList.toggle('hot', highlight === p.part);
    }

    // Rail state.
    const ri = Math.min(Math.floor(chapter), railLinks.length - 1);
    if (ri !== activeRail) {
      railLinks[activeRail]?.classList.remove('on');
      railLinks[ri]?.classList.add('on');
      activeRail = ri;
    }

    // If it can't hold a smooth rate, trade a little resolution for it.
    slowSum += Math.min(rawDt, 0.25); // a single long pause isn't a slow machine
    if (++slowCount === 60) {
      const avg = slowSum / 60;
      slowSum = 0;
      slowCount = 0;
      if (avg > 1 / 42 && dprScale > 0.6 && !params.has('snap')) {
        dprScale = Math.max(0.6, dprScale - 0.1);
        resize();
      }
    }
  }

  document.addEventListener('visibilitychange', () => {
    const was = visible;
    visible = !document.hidden;
    if (visible && !was) {
      clock.getDelta();
      requestAnimationFrame(frame);
    }
  });

  await rover.precompile(renderer, scene, camera);

  document.getElementById('loader').classList.add('done');
  document.body.classList.add('gl-ready');
  window.__beachboy = {
    ready: true,
    stats: () => ({ tris: renderer.info.render.triangles, calls: renderer.info.render.calls, dpr: +dpr.toFixed(2) }),
  };
  requestAnimationFrame(frame);
}

// Image-based light from a simple sky and sand gradient, so metal has something
// to reflect without shipping an HDR.
function makeEnvironment(renderer) {
  const s = new THREE.Scene();
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    vertexShader: 'varying vec3 d; void main(){ d=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `varying vec3 d; void main(){
      float h=normalize(d).y;
      vec3 sky=mix(vec3(1.05,1.05,1.02),vec3(.32,.56,.92),smoothstep(0.,.75,h));
      vec3 sand=mix(vec3(.72,.6,.44),vec3(.5,.42,.32),smoothstep(0.,-.6,h));
      gl_FragColor=vec4(h>0.?sky:sand,1.); }`,
  });
  s.add(new THREE.Mesh(new THREE.SphereGeometry(10, 24, 16), m));
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(s, 0.04).texture;
  pm.dispose();
  return tex;
}

if (supportsWebGL()) {
  start3D().catch((e) => {
    console.error(e);
    fallback();
  });
} else {
  fallback();
}

function fallback() {
  document.body.classList.add('no-gl');
  document.getElementById('loader').classList.add('done');
  window.__beachboy = { ready: true, fallback: true };
}
