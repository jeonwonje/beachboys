import '@fontsource-variable/big-shoulders-display';
import '@fontsource-variable/instrument-sans';
import '@fontsource/jetbrains-mono/500.css';
import './game.css';
import * as THREE from 'three';
import { createWorld, makeEnvironment } from '../scene/world.js';
import { loadRover } from '../scene/rover.js';
import { createFlow } from '../scene/debris.js';
import { BOUNDS, height, seaLevel, TERRAIN_GLSL, TIDE } from './terrain.js';
import { createVehicle } from './vehicle.js';
import { BIN_CAPACITY, createItems } from './items.js';
import { createProps, STATIONS } from './props.js';
import { createParticles, createTracks } from './fx.js';
import { createAudio } from './audio.js';

const BASE = import.meta.env.BASE_URL;
const params = new URLSearchParams(location.search);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const ROUND_SECONDS = 180;
const TARGET = 0.8;
const NO_FOCUS = { conveyor: 0, drum: 0, bin: 0, electronics: 0 };
const START = { x: STATIONS[1].x, z: STATIONS[1].z + 4.5, theta: -Math.PI / 2 };
const CAMERAS = [
  { back: 5.1, up: 3.15, ahead: 2.2, lookUp: 0.1, fov: 50 },
  { back: 9.5, up: 6.6, ahead: 2.4, lookUp: 0, fov: 46 },
  { back: 2.6, up: 1.2, ahead: 3, lookUp: 0.4, fov: 62 },
];

const $ = (id) => document.getElementById(id);

async function start() {
  const canvas = $('stage');
  const mobile = innerWidth < 760 || matchMedia('(pointer: coarse)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile && devicePixelRatio < 1.5, powerPreference: 'high-performance' });
  const budget = mobile ? 1.8e6 : 3.8e6;
  const fitDpr = () => Math.min(devicePixelRatio, mobile ? 1.5 : 1.75, Math.sqrt(budget / (innerWidth * innerHeight)));
  let dprScale = 1;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 2400);
  const world = createWorld(scene, renderer, { terrain: { glsl: TERRAIN_GLSL }, shadowReach: 6.5 });
  world.shared.uStartX.value = 1e6; // the shader's fixed wheel tracks stay off
  scene.environment = makeEnvironment(renderer);

  const resize = () => {
    renderer.setPixelRatio(fitDpr() * dprScale);
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  };
  addEventListener('resize', resize);
  resize();

  const rover = await loadRover(`${BASE}models/beachboy.glb`, (p) => {
    $('startBtn').textContent = `Loading the machine ${Math.round(p * 100)}%`;
  });
  // These parts are small or hidden, and shadows are drawn every frame here.
  for (const key of ['d_drive', 'c_drive', 'c_mount', 'b_pins', 'd_wheels']) {
    for (const m of rover.parts[key]?.meshes ?? []) {
      m.castShadow = false;
      m.userData.castsShadow = false;
    }
  }
  rover.root.rotation.order = 'YXZ';
  scene.add(rover.root);

  // Shows on the sand where the intake will reach, because the machine hides it.
  const guide = new THREE.Mesh(
    new THREE.PlaneGeometry(2.5, 0.88).rotateX(-Math.PI / 2).translate(2.09, 0.05, 0),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      vertexShader: 'varying vec2 u; void main(){ u=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: `varying vec2 u; void main(){
        float edge = smoothstep(.06,.0,min(u.y,1.-u.y));
        float bands = smoothstep(.34,.5,abs(fract(u.x*5.-u.y*.0)-.5))*.16;
        float a = (edge*.85+bands)*(1.-u.x)*(1.-u.x);
        gl_FragColor = vec4(.96,.77,.02,a); }`,
    }),
  );
  guide.frustumCulled = false;
  rover.root.add(guide);

  const flow = createFlow(rover.lift, { showCarried: false });
  const level0 = seaLevel(TIDE.start);
  const props = createProps(scene, level0);
  const items = createItems(scene);
  const particles = createParticles(scene);
  const tracks = createTracks(scene, world.shared);
  const audio = createAudio();
  const v = createVehicle();

  const G = {
    mode: 'menu', // menu, play, paused, end
    time: 0, // seconds played this round
    clock: 0,
    shore: TIDE.start,
    level: level0,
    cam: 0,
    shake: 0,
    towing: 0,
    tows: 0,
    spills: 0,
    jams: 0,
    unloadT: 0,
    seed: Number(params.get('seed')) || 0,
    input: { throttle: 0, steer: 0, estop: false },
    forced: null,
  };

  const need = Math.ceil(items.list.length * TARGET) || 61;
  const camPos = new THREE.Vector3();
  const camLook = new THREE.Vector3();
  let camTheta = START.theta;

  // ── Input ────────────────────────────────────────────────────────────────
  const keys = new Set();
  const stick = { x: 0, y: 0, stop: false };
  const GAME_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'];
  addEventListener('keydown', (e) => {
    if (GAME_KEYS.includes(e.code) && G.mode === 'play') e.preventDefault();
    if (e.repeat) return;
    keys.add(e.code);
    if (e.code === 'KeyC') G.cam = (G.cam + 1) % CAMERAS.length;
    if (e.code === 'KeyM') toast(audio.toggleMute() ? 'Sound off' : 'Sound on', 'calm', 1);
    if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
    if (e.code === 'Enter' && G.mode !== 'play' && G.mode !== 'paused' && !$('startBtn').disabled) begin();
  });
  addEventListener('keyup', (e) => keys.delete(e.code));
  addEventListener('blur', () => {
    keys.clear();
    if (G.mode === 'play') togglePause();
  });

  function readInput(dt) {
    if (G.forced) return Object.assign(G.input, G.forced);
    let wantT = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
    let wantS = (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) - (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0);
    let estop = keys.has('Space') || stick.stop;
    if (stick.x || stick.y) {
      wantT = -stick.y;
      wantS = -stick.x;
    }
    const pad = navigator.getGamepads?.()[0];
    if (pad) {
      const dead = (a) => (Math.abs(a) < 0.14 ? 0 : a);
      if (dead(pad.axes[0])) wantS = -pad.axes[0];
      const triggers = (pad.buttons[7]?.value ?? 0) - (pad.buttons[6]?.value ?? 0);
      if (Math.abs(triggers) > 0.05) wantT = triggers;
      else if (dead(pad.axes[1])) wantT = -pad.axes[1];
      if (pad.buttons[0]?.pressed) estop = true;
    }
    const ease = Math.min(1, dt * 11);
    G.input.throttle += (wantT - G.input.throttle) * ease;
    G.input.steer += (wantS - G.input.steer) * ease;
    G.input.estop = estop;
    return G.input;
  }

  // Touch: one stick for driving, one button for stopping.
  if (matchMedia('(pointer: coarse)').matches) {
    const el = $('stick');
    const knob = el.firstElementChild;
    const release = () => {
      stick.x = stick.y = 0;
      knob.style.transform = '';
    };
    const move = (e) => {
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - r.left - r.width / 2) / (r.width / 2);
      const dy = (e.clientY - r.top - r.height / 2) / (r.height / 2);
      const l = Math.max(1, Math.hypot(dx, dy));
      stick.x = dx / l;
      stick.y = dy / l;
      knob.style.transform = `translate(${(stick.x * r.width) / 3}px,${(stick.y * r.height) / 3}px)`;
    };
    el.addEventListener('pointerdown', (e) => {
      el.setPointerCapture(e.pointerId);
      move(e);
    });
    el.addEventListener('pointermove', (e) => el.hasPointerCapture(e.pointerId) && move(e));
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
    const stop = $('stopBtn');
    stop.addEventListener('pointerdown', () => (stick.stop = true));
    stop.addEventListener('pointerup', () => (stick.stop = false));
    stop.addEventListener('pointercancel', () => (stick.stop = false));
  }

  // ── Messages ─────────────────────────────────────────────────────────────
  let toastTimer = 0;
  function toast(text, kind = '', seconds = 2.2) {
    const el = $('toast');
    el.textContent = text;
    el.className = `on ${kind}`;
    toastTimer = seconds;
  }

  items.onPick = () => audio.pick();
  items.onBanked = () => audio.bank();
  items.onSpill = () => {
    G.spills++;
    audio.spill();
    toast('It slid off the belt. Face up or down the slope.', 'bad');
  };
  items.onWash = () => toastOnce('wash', 'The tide is taking debris.', 'calm');
  items.onFull = () => {
    if (toastTimer < 0.4) {
      toast('Bin full. Stop in a yellow ring to clear out.', '');
      audio.full();
    }
  };
  items.onLongJam = () => {
    if (!v.startJam('long')) return false;
    G.jams++;
    audio.jam();
    toast('Long piece wedged at the intake. Reverse to clear. Take these slowly.', 'bad', 3.4);
    G.shake = 0.5;
    return true;
  };
  const seen = new Set();
  function toastOnce(key, text, kind) {
    if (seen.has(key)) return;
    seen.add(key);
    toast(text, kind);
  }

  // ── Round flow ───────────────────────────────────────────────────────────
  function reset() {
    items.reset(G.seed || Math.floor(Math.random() * 1e9), props.colliders);
    Object.assign(G, { time: 0, shore: TIDE.start, level: level0, towing: 0, tows: 0, spills: 0, jams: 0, unloadT: 0, shake: 0 });
    v.place(START.x, START.z, START.theta);
    v.rollL = v.rollR = 0;
    camTheta = START.theta;
    tracks.clear();
    seen.clear();
    placeCameraNow();
    G.input.throttle = G.input.steer = 0;
  }

  function begin() {
    audio.unlock();
    reset();
    G.mode = 'play';
    $('menu').hidden = $('end').hidden = $('pause').hidden = true;
    $('hud').hidden = false;
    $('touch').hidden = !matchMedia('(pointer: coarse)').matches;
    $('need').textContent = String(Math.ceil(items.list.length * TARGET));
    toast('Debris lies thickest near the water, and the tide is rising.', 'calm', 3.2);
    canvas.focus?.();
  }

  function togglePause() {
    if (G.mode === 'play') {
      G.mode = 'paused';
      $('pause').hidden = false;
      audio.silence();
    } else if (G.mode === 'paused') {
      G.mode = 'play';
      $('pause').hidden = true;
    }
  }

  function finish() {
    G.mode = 'end';
    audio.silence();
    const t = items.tally();
    const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);
    const rate = pct(t.banked, t.total);
    const dry = pct(t.dryDone, t.dry);
    const wet = pct(t.wetDone, t.wet);
    const both = dry >= 80 && wet >= 80;
    const won = rate >= 80;
    audio.end(won);
    $('hud').hidden = true;
    $('touch').hidden = true;
    $('end').hidden = false;
    $('endTitle').textContent = `${rate}%`;
    $('endKicker').textContent = G.time >= ROUND_SECONDS ? 'The tide is in' : 'The beach is clear';
    $('endLine').textContent = both
      ? 'You beat 80% on both dry and wet sand. The real machine fell well short of this on the wet band.'
      : won
        ? 'You reached 80% overall. The target applies to each class, so look at the wet sand below.'
        : wet > 6.3
          ? 'Short of the 80% target, but you beat the real machine on wet sand.'
          : 'Short of the 80% target. The cross-slope and the tide beat you, as they beat the real machine.';
    $('endDry').textContent = `${dry}%`;
    $('endWet').textContent = `${wet}%`;
    $('endStats').textContent = `${t.banked} of ${t.total} collected · ${t.lost} taken by the tide · ${G.spills} slid off the belt · ${G.jams} ${G.jams === 1 ? 'jam' : 'jams'}${G.tows ? ` · ${G.tows} ${G.tows === 1 ? 'tow' : 'tows'}` : ''}`;
    $('againBtn').focus();
  }

  $('startBtn').addEventListener('click', begin);
  $('againBtn').addEventListener('click', begin);
  $('resumeBtn').addEventListener('click', togglePause);
  $('restartBtn').addEventListener('click', begin);

  // ── Simulation ───────────────────────────────────────────────────────────
  function simulate(dt) {
    G.time += dt;
    const p = Math.min(1, G.time / ROUND_SECONDS);
    G.shore = TIDE.start + (TIDE.end - TIDE.start) * p;
    G.level = seaLevel(G.shore);

    const input = readInput(dt);
    const wasJam = v.jam;
    v.step(dt, G.towing > 0 ? { throttle: 0, steer: 0, estop: true } : input, G.shore, G.level, props.colliders);
    if (!wasJam && v.jam === 'sand') {
      G.jams++;
      audio.jam();
      G.shake = 0.5;
      toast('The skid sank and the conveyor folded back. Reverse to clear.', 'bad', 3.4);
    }
    if (wasJam && !v.jam) {
      audio.clear();
      toast('Jam cleared', 'calm', 1.1);
    }
    if (v.hit > 1) {
      audio.hit(v.hit);
      G.shake = Math.min(0.55, v.hit * 0.12);
    }

    // Too far into the sea: stop, then a tow back to dry sand.
    if (v.depth > 3 && G.towing === 0) {
      G.towing = 1.8;
      G.tows++;
      toast('Too deep for salt water. Towing you back.', 'bad', 2);
    }
    if (G.towing > 0) {
      G.towing -= dt;
      if (G.towing <= 0) {
        G.towing = 0;
        const near = STATIONS.reduce((a, b) => (Math.abs(a.x - v.x) < Math.abs(b.x - v.x) ? a : b));
        v.place(near.x, near.z + 4.5, -Math.PI / 2);
        camTheta = v.theta;
        placeCameraNow();
      }
    }

    items.update(dt, v, rover.lift, G.shore, G.level, G.clock);

    // Clear-out: empties while the machine is stopped in a ring.
    const station = STATIONS.find((s) => Math.hypot(s.x - v.x, s.z - v.z) < s.r + 0.9);
    if (station && items.bin.length) {
      if (Math.abs(v.vf) < 0.7) {
        G.unloadT -= dt;
        if (G.unloadT <= 0) {
          items.unload(station.drop);
          G.unloadT = 0.11;
        }
      } else {
        toastOnce('slow', 'Stop here to clear out.', 'calm');
      }
    }

    if (G.time >= ROUND_SECONDS || items.tally().ground === 0) {
      if (!items.list.some((i) => i.state === 'fly' || i.state === 'sinking')) finish();
    }
  }

  // ── Effects, per frame ───────────────────────────────────────────────────
  function effects(dt) {
    const speed = Math.hypot(v.vx, v.vz);
    const beltOn = !v.jam && !v.estop;
    const sand = v.depth > 0.1 ? '#e8f2f0' : v.wet > 0.5 ? '#6b5842' : '#cdb48b';
    const rate = (Math.min(speed, 4) * 7 + v.slip * 95) * dt;
    let n = Math.floor(rate) + (Math.random() < rate % 1 ? 1 : 0);
    while (n-- > 0) {
      const side = Math.random() < 0.5 ? -0.3 : 0.3;
      const axle = Math.random() < 0.5 ? 0.225 : -0.225;
      const x = v.x + Math.cos(v.theta) * axle + Math.sin(v.theta) * side;
      const z = v.z - Math.sin(v.theta) * axle + Math.cos(v.theta) * side;
      const kick = -Math.sign(v.vf || 1) * (0.5 + Math.random() * (1 + v.slip * 1.6));
      particles.emit(
        x,
        v.y + 0.03,
        z,
        v.vx * 0.2 + Math.cos(v.theta) * kick + (Math.random() - 0.5) * 0.5,
        0.5 + Math.random() * (0.8 + v.slip * 1.4),
        v.vz * 0.2 - Math.sin(v.theta) * kick + (Math.random() - 0.5) * 0.5,
        sand,
        0.45 + Math.random() * 0.4,
      );
    }
    particles.update(dt);
    if (v.depth < 0.2) tracks.update(v, G.level);

    // Machine pose.
    rover.root.position.set(v.x, v.y, v.z);
    rover.root.rotation.set(v.roll, v.theta, v.pitch);
    const fx = G.mode === 'play' || G.mode === 'menu';
    guide.visible = G.mode === 'play';
    rover.update(dt, {
      explode: 0,
      focus: NO_FOCUS,
      belt: fx && beltOn ? 1 : 0,
      rock: fx && beltOn ? 1 : 0,
      rockAmp: 1,
      roll: v.rollL,
      rollL: v.rollL,
      rollR: v.rollR,
      fold: v.fold,
      highlight: v.jam ? 'c_paddle_spin' : null,
    });
    flow.update(dt, { flow: items.onBelt > 0 && beltOn ? 1 : 0, fill: items.bin.length / BIN_CAPACITY });
    props.update(G.clock);
  }

  // ── Camera ───────────────────────────────────────────────────────────────
  const desired = new THREE.Vector3();
  const lookAt = new THREE.Vector3();
  function cameraTarget() {
    const c = CAMERAS[G.cam];
    const cos = Math.cos(camTheta);
    const sin = -Math.sin(camTheta);
    desired.set(v.x - cos * c.back, v.y + c.up, v.z - sin * c.back);
    desired.y = Math.max(desired.y, height(desired.x, desired.z, G.level) + 0.5);
    lookAt.set(v.x + cos * c.ahead, v.y + c.lookUp, v.z + sin * c.ahead);
  }
  function placeCameraNow() {
    cameraTarget();
    camPos.copy(desired);
    camLook.copy(lookAt);
  }
  function updateCamera(dt) {
    if (G.mode === 'menu') {
      // A slow orbit that shows the machine beside the title card.
      const a = G.clock * 0.09 - 0.25;
      const cx = v.x + 0.15;
      const cz = v.z;
      camera.position.set(cx + Math.cos(a) * 5.2, v.y + 1.75, cz + Math.sin(a) * 5.2);
      camera.lookAt(cx - Math.sin(a) * 1.05, v.y + 0.5, cz + Math.cos(a) * 1.05);
      camera.fov = 42;
      camera.updateProjectionMatrix();
      return;
    }
    // Follow the heading late, so turns are felt.
    const diff = Math.atan2(Math.sin(v.theta - camTheta), Math.cos(v.theta - camTheta));
    camTheta += diff * Math.min(1, dt * 3.2);
    cameraTarget();
    const k = Math.min(1, dt * 7);
    camPos.lerp(desired, k);
    camLook.lerp(lookAt, Math.min(1, dt * 9));
    camera.position.copy(camPos);
    if (G.shake > 0 && !reduced) {
      camera.position.x += (Math.random() - 0.5) * G.shake * 0.28;
      camera.position.y += (Math.random() - 0.5) * G.shake * 0.28;
      G.shake = Math.max(0, G.shake - dt * 1.6);
    }
    camera.lookAt(camLook);
    const want = CAMERAS[G.cam].fov + Math.abs(v.vf) * (reduced ? 0 : 1.5);
    if (Math.abs(camera.fov - want) > 0.05) {
      camera.fov += (want - camera.fov) * Math.min(1, dt * 4);
      camera.updateProjectionMatrix();
    }
  }

  // ── HUD ──────────────────────────────────────────────────────────────────
  const mapEl = $('map');
  const map = mapEl.getContext('2d');
  const MW = mapEl.width;
  const MH = mapEl.height;
  const mapX = (x) => ((x - BOUNDS.minX) / (BOUNDS.maxX - BOUNDS.minX)) * (MW - 16) + 8;
  const MAP_Z_MAX = 14;
  const mapY = (z) => ((z - BOUNDS.minZ) / (MAP_Z_MAX - BOUNDS.minZ)) * (MH - 8) + 4;

  function drawMap() {
    map.clearRect(0, 0, MW, MH);
    map.fillStyle = 'rgba(214,192,148,.84)';
    map.fillRect(0, 0, MW, MH);
    map.fillStyle = 'rgba(133,105,72,.75)';
    map.fillRect(0, mapY(G.shore - 3), MW, mapY(G.shore) - mapY(G.shore - 3));
    map.fillStyle = 'rgba(25,120,146,.95)';
    map.fillRect(0, mapY(G.shore), MW, MH);
    for (const s of STATIONS) {
      map.strokeStyle = '#16233f';
      map.fillStyle = '#f4c404';
      map.lineWidth = 2;
      map.beginPath();
      map.arc(mapX(s.x), mapY(s.z), 7, 0, 7);
      map.fill();
      map.stroke();
    }
    for (const it of items.list) {
      if (it.state !== 'ground') continue;
      map.fillStyle = it.long ? '#b4322a' : '#16233f';
      map.beginPath();
      map.arc(mapX(it.x), mapY(it.z), 2.8, 0, 7);
      map.fill();
    }
    map.save();
    map.translate(mapX(v.x), mapY(v.z));
    map.rotate(-v.theta);
    map.fillStyle = '#fff';
    map.strokeStyle = '#d8590f';
    map.lineWidth = 3;
    map.beginPath();
    map.moveTo(12, 0);
    map.lineTo(-8, -7.5);
    map.lineTo(-4, 0);
    map.lineTo(-8, 7.5);
    map.closePath();
    map.stroke();
    map.fill();
    map.restore();
  }

  let lastHud = 0;
  function updateHud(dt) {
    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0) $('toast').classList.remove('on');
    }
    // The tilt gauge moves every frame. The rest changes more slowly.
    const deg = THREE.MathUtils.radToDeg(v.roll);
    $('tiltMachine').setAttribute('transform', `rotate(${(deg * 2.2).toFixed(1)} 0 12)`);
    if (G.clock - lastHud < 0.1) return;
    lastHud = G.clock;
    const t = items.tally();
    const left = Math.max(0, ROUND_SECONDS - G.time);
    $('time').textContent = `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`;
    $('tideBar').style.width = `${(G.time / ROUND_SECONDS) * 100}%`;
    $('got').textContent = t.banked;
    $('gotBar').style.width = `${(t.banked / t.total) * 100}%`;
    $('lostBar').style.width = `${(t.lost / t.total) * 100}%`;
    $('bin').textContent = `${items.bin.length}/${BIN_CAPACITY}`;
    $('binBar').style.width = `${(items.bin.length / BIN_CAPACITY) * 100}%`;
    $('binBar').style.background = items.bin.length >= BIN_CAPACITY ? '#b4322a' : '';
    $('loadBar').style.width = `${v.load * 100}%`;
    $('jamRow').hidden = !v.jam;
    $('jamBar').style.width = `${v.jamClear * 100}%`;
    $('tilt').textContent = `${Math.abs(deg).toFixed(0)}°`;
    $('tiltBlock').classList.toggle('danger', Math.abs(deg) > 5 && items.onBelt > 0);
    drawMap();
  }

  // ── Main loop ────────────────────────────────────────────────────────────
  const clock = new THREE.Clock();
  let slowSum = 0;
  let slowCount = 0;
  let frozen = false; // tests advance the game by hand

  function tick(dt) {
    G.clock += dt;
    if (G.mode === 'play') simulate(dt);
    else if (G.mode === 'menu') {
      v.step(dt, { throttle: 0, steer: 0, estop: false }, G.shore, G.level, props.colliders);
      items.update(dt, v, rover.lift, G.shore, G.level, G.clock);
    }
    world.shared.uShore.value = G.shore;
    world.shared.uLevel.value = G.level;
    if (G.mode !== 'paused') {
      effects(dt);
      updateCamera(dt);
      world.setTime(1 + 1.3 * Math.min(1, G.time / ROUND_SECONDS));
      world.update(G.clock, camera.position, v.x, v.z, v.y + 0.3);
      if (G.mode === 'play') {
        updateHud(dt);
        audio.update({
          speed: Math.hypot(v.vx, v.vz),
          throttle: G.input.throttle,
          slip: v.slip,
          beltOn: !v.jam && !v.estop,
          waterNear: Math.max(0, 1 - Math.abs(v.depth) / 12),
          time: G.clock,
        });
      }
    }
  }

  function frame() {
    if (frozen) return;
    requestAnimationFrame(frame);
    const raw = clock.getDelta();
    tick(Math.min(raw, 0.05));
    renderer.shadowMap.needsUpdate = G.mode !== 'paused';
    renderer.render(scene, camera);
    // If it can't hold a smooth rate, trade a little resolution for it.
    slowSum += Math.min(raw, 0.25);
    if (++slowCount === 60) {
      const avg = slowSum / 60;
      slowSum = slowCount = 0;
      if (avg > 1 / 42 && dprScale > 0.6 && !params.has('test')) {
        dprScale = Math.max(0.6, dprScale - 0.1);
        resize();
      }
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) audio.silence();
    clock.getDelta();
  });

  reset();
  tick(0.016);
  renderer.shadowMap.needsUpdate = true;
  await renderer.compileAsync(scene, camera);
  const btn = $('startBtn');
  btn.disabled = false;
  btn.textContent = 'Start driving';
  btn.focus();
  requestAnimationFrame(frame);

  if (params.has('test')) {
    window.__game = {
      G,
      v,
      items,
      colliders: props.colliders,
      begin,
      finish,
      STATIONS,
      freeze() {
        frozen = true;
      },
      steer(input) {
        G.forced = input;
      },
      run(seconds, dt = 1 / 60, each) {
        for (let t = 0; t < seconds && G.mode === 'play'; t += dt) {
          each?.();
          tick(dt);
        }
      },
      draw() {
        renderer.shadowMap.needsUpdate = true;
        renderer.render(scene, camera);
      },
      stats: () => ({ tris: renderer.info.render.triangles, calls: renderer.info.render.calls }),
    };
  }
  window.__gameReady = true;
}

start().catch((e) => {
  console.error(e);
  const btn = $('startBtn');
  btn.disabled = true;
  btn.textContent = 'This game needs WebGL 2';
});
