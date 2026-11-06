// The real BeachBoy model, repainted to match the photographs and given its
// actual kinematics: spokes run around the belt loop, the half-drum rocks
// between its limit switches, the wheels roll and the paddle turns.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

// The tyres touch the ground here in model space.
export const GROUND_Y = -0.254;

// Belt frame measured from the model. Matches tools/prepare-model.mjs.
const BELT = { dx: 0.6519, dy: -0.7583, uHead: -0.17, uTail: 0.6, nC: 0.49, r: 0.065, rows: 10 };
{
  const l = Math.hypot(BELT.dx, BELT.dy);
  BELT.dx /= l;
  BELT.dy /= l;
}
const WHEEL_R = 0.186;
const WHEEL_POS = {
  k_wheel_fl: [0.225, -0.0685],
  k_wheel_fr: [0.225, -0.0685],
  k_wheel_rl: [-0.225, -0.0685],
  k_wheel_rr: [-0.225, -0.0685],
};
const PADDLE_C = new THREE.Vector3(0.937, -0.133, 0);

// Half-drum rocks about this axis: pivot, tilt and period from the design.
const DRUM_PIVOT = new THREE.Vector3(-0.33, 0.431, 0);
const DRUM_AXIS = new THREE.Vector3(0.102, 0.506, 0).sub(DRUM_PIVOT).normalize();
const DRUM_SWING = THREE.MathUtils.degToRad(23);
const DRUM_PERIOD = 0.943;

// Colours picked off the photos of the real machine.
const PAINT = {
  k_body__mat_0: { color: '#d8590f', metal: 0.1, rough: 0.46 },
  k_body__mat_1: { color: '#22262b', metal: 0.45, rough: 0.5 },
  k_spine__mat_2: { color: '#16181b', metal: 0.5, rough: 0.5 },
  k_wheel__mat_3: { color: '#0d0e0f', metal: 0, rough: 0.92 },
  k_wheel__mat_1: { color: '#34383d', metal: 0.75, rough: 0.42 },
  c_frame__mat_1: { color: '#b4b9be', metal: 0.85, rough: 0.38 },
  c_frame__mat_2: { color: '#2a50c7', metal: 0.05, rough: 0.56 },
  c_frame__mat_5: { color: '#a9aeb3', metal: 0.9, rough: 0.38 },
  c_guard__mat_1: { color: '#dfeef2', metal: 0, rough: 0.12, opacity: 0.2 },
  c_guard__mat_2: { color: '#dfeef2', metal: 0, rough: 0.12, opacity: 0.2 },
  c_guard__mat_5: { color: '#dfeef2', metal: 0, rough: 0.12, opacity: 0.22 },
  c_belt__mat_4: { color: '#cfd3d6', metal: 0.8, rough: 0.4 },
  c_spoke__holder: { color: '#f4c404', metal: 0, rough: 0.55 },
  c_spoke__tine: { color: '#101113', metal: 0, rough: 0.62 },
  c_skid__mat_1: { color: '#aeb3b8', metal: 0.8, rough: 0.44 },
  c_mount__mat_1: { color: '#f4c404', metal: 0, rough: 0.56 },
  c_mount__mat_2: { color: '#191b1e', metal: 0.1, rough: 0.6 },
  c_drive__mat_1: { color: '#191b1e', metal: 0.3, rough: 0.55 },
  c_drive__mat_2: { color: '#101113', metal: 0.3, rough: 0.5 },
  c_drive__mat_6: { color: '#6a6f75', metal: 0.8, rough: 0.4 },
  c_paddle__mat_7: { color: '#21b09a', metal: 0, rough: 0.42, opacity: 0.94 },
  c_paddle__mat_2: { color: '#191b1e', metal: 0.1, rough: 0.6 },
  c_paddle__mat_1: { color: '#b4b9be', metal: 0.8, rough: 0.42 },
  c_paddle__mat_5: { color: '#2a50c7', metal: 0.05, rough: 0.56 },
  d_frame__mat_1: { color: '#b4b9be', metal: 0.85, rough: 0.38 },
  d_drum__mat_1: { color: '#d4d7da', metal: 0.9, rough: 0.28 },
  d_drum__mat_4: { color: '#c9ccd0', metal: 0.8, rough: 0.4, grid: 0.018, wire: 0.17 },
  d_wheels__mat_1: { color: '#2a50c7', metal: 0.05, rough: 0.56 },
  d_wheels__mat_9: { color: '#e7ebef', metal: 0, rough: 0.5 },
  d_wheels__mat_8: { color: '#83868a', metal: 0.8, rough: 0.4 },
  d_drive__mat_1: { color: '#2a50c7', metal: 0.05, rough: 0.56 },
  d_drive__mat_9: { color: '#e7ebef', metal: 0, rough: 0.5 },
  d_drive__mat_8: { color: '#83868a', metal: 0.8, rough: 0.4 },
  d_drive__mat_6: { color: '#2b2e33', metal: 0.7, rough: 0.45 },
  d_drive__mat_2: { color: '#101113', metal: 0.2, rough: 0.5 },
  b_vplate__mat_1: { color: '#d8ecf4', metal: 0, rough: 0.08, opacity: 0.4 },
  b_tray__mat_1: { color: '#c3c7cb', metal: 0.85, rough: 0.42 },
  b_frame__mat_1: { color: '#b4b9be', metal: 0.85, rough: 0.38 },
  b_pins__mat_1: { color: '#2a50c7', metal: 0.05, rough: 0.56 },
  b_bin__mat_4: { color: '#1b1d20', metal: 0.1, rough: 0.7, grid: 0.022, wire: 0.3 },
};
const FALLBACK = { color: '#8d9297', metal: 0.5, rough: 0.5 };

// How far each subsystem moves when the machine is taken apart. Offsets are
// in metres, and take the module off the carrier along the path it really
// leaves by: conveyor forward, drum up, bin out of the back.
const SUB_OFFSET = { conveyor: [0.42, 0.06, 0], drum: [0, 0.42, 0], bin: [-0.46, 0, 0], carrier: [0, 0, 0] };
const PART_OFFSET = {
  c_paddle: [0.11, 0, 0],
  c_skid: [0, -0.07, 0],
  c_drive: [0, 0, -0.1],
  c_mount: [-0.06, 0.04, 0],
  d_drive: [0, -0.06, -0.24],
  d_wheels: [0, 0.02, 0],
  b_bin: [-0.24, 0, 0],
  b_tray: [-0.24, 0, 0],
  b_frame: [-0.24, 0, 0],
  b_pins: [-0.24, 0.05, 0],
  b_vplate: [0, 0.03, 0],
};

const subOf = (key) => ({ c: 'conveyor', d: 'drum', b: 'bin', k: 'carrier' })[key[0]];

function makeMaterial(spec) {
  const m = new THREE.MeshStandardMaterial({
    color: spec.color,
    metalness: spec.metal,
    roughness: spec.rough,
    side: THREE.DoubleSide,
    transparent: spec.opacity !== undefined,
    opacity: spec.opacity ?? 1,
    depthWrite: spec.opacity === undefined || spec.opacity > 0.6,
    emissive: new THREE.Color('#ff7a1a'),
    emissiveIntensity: 0,
  });
  m.userData.baseOpacity = m.opacity;
  m.userData.isScreen = !!spec.grid;
  // CAD models the screens as plain sheets. Cut the wire pattern here instead
  // of carrying thousands of wires in the mesh.
  if (spec.grid) {
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uGrid = { value: spec.grid };
      shader.uniforms.uWire = { value: spec.wire };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vObj;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vObj; uniform float uGrid; uniform float uWire;')
        .replace(
          '#include <clipping_planes_fragment>',
          `#include <clipping_planes_fragment>
           vec3 gr = abs(fract(vObj/uGrid)-.5)*2.;
           float along = abs(fract(vObj.z/uGrid)-.5)*2.;
           float across = abs(fract(length(vObj.xy)/uGrid)-.5)*2.;
           if(min(along,across) > uWire*1.0 && min(gr.x,gr.y) > uWire) discard;`,
        );
    };
    m.customProgramCacheKey = () => `grid-${spec.grid}-${spec.wire}`;
  }
  return m;
}

// Compression stores each part as integers plus a scale and offset on its node.
// The site moves parts by hand, so put every vertex back in model-space metres.
function bakeIntoModelSpace(mesh) {
  const g = mesh.geometry;
  for (const name of ['position', 'normal']) {
    const a = g.getAttribute(name);
    const out = new Float32Array(a.count * 3);
    for (let i = 0; i < a.count; i++) {
      out[i * 3] = a.getX(i);
      out[i * 3 + 1] = a.getY(i);
      out[i * 3 + 2] = a.getZ(i);
    }
    g.setAttribute(name, new THREE.BufferAttribute(out, 3));
  }
  g.applyMatrix4(mesh.matrixWorld);
  g.computeBoundingSphere();
  g.computeBoundingBox();
}

export async function loadRover(url, onProgress) {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const gltf = await new Promise((res, rej) =>
    loader.load(url, res, (e) => e.total && onProgress?.(e.loaded / e.total), rej),
  );

  const root = new THREE.Group();
  const lift = new THREE.Group();
  lift.position.y = -GROUND_Y;
  root.add(lift);

  const parts = {};
  const materials = new Map();
  let spokeHolder = null;
  let spokeTine = null;

  const meshes = [];
  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse((o) => o.isMesh && meshes.push(o));
  for (const o of meshes) {
    bakeIntoModelSpace(o);
    const full = o.name;
    const [key] = full.split('__');
    const paintKey = key.startsWith('k_wheel_') ? `k_wheel__${full.split('__')[1]}` : full;
    const spec = PAINT[paintKey] ?? FALLBACK;
    const mat = makeMaterial(spec);

    if (key === 'c_spoke') {
      if (full.endsWith('holder')) spokeHolder = { geometry: o.geometry, material: mat };
      else spokeTine = { geometry: o.geometry, material: mat };
      continue;
    }

    const mesh = new THREE.Mesh(o.geometry, mat);
    const opaque = !spec.opacity;
    mesh.castShadow = opaque && !spec.grid;
    mesh.receiveShadow = opaque;
    if (!parts[key]) {
      const group = new THREE.Group();
      parts[key] = { key, sub: subOf(key), group, meshes: [], glow: 0, op: 1 };
      lift.add(group);
    }
    parts[key].group.add(mesh);
    parts[key].meshes.push(mesh);
    materials.set(mesh, mat);
  }

  // Wheels were baked around their own axle, so give each its place back.
  for (const [key, [x, y]] of Object.entries(WHEEL_POS)) {
    if (parts[key]) parts[key].base = new THREE.Vector3(x, y, 0);
  }

  // Spoke rows ride as instances on the belt loop.
  const beltGroup = new THREE.Group();
  const conveyorPart = { key: 'c_belt', sub: 'conveyor', group: beltGroup, meshes: [], glow: 0, op: 1 };
  parts.c_belt = parts.c_belt ?? conveyorPart;
  parts.c_belt.group.add(beltGroup);
  const mk = (src) => {
    const im = new THREE.InstancedMesh(src.geometry, src.material, BELT.rows);
    im.castShadow = true;
    im.frustumCulled = false;
    beltGroup.add(im);
    parts.c_belt.meshes.push(im);
    return im;
  };
  const rowsA = mk(spokeHolder);
  const rowsB = mk(spokeTine);

  const S = BELT.uTail - BELT.uHead;
  const arc = Math.PI * BELT.r;
  const loopLen = 2 * S + 2 * arc;
  const M = new THREE.Matrix4();
  const X = new THREE.Vector3();
  const Y = new THREE.Vector3();
  const Z = new THREE.Vector3(0, 0, 1);
  const P = new THREE.Vector3();

  function placeRows(travel) {
    for (let i = 0; i < BELT.rows; i++) {
      let s = (travel + (i * loopLen) / BELT.rows) % loopLen;
      let u;
      let theta;
      if (s < S) {
        u = BELT.uTail - s;
        theta = 0;
      } else if (s < S + arc) {
        u = BELT.uHead;
        theta = (s - S) / BELT.r;
      } else if (s < 2 * S + arc) {
        u = BELT.uHead + (s - S - arc);
        theta = Math.PI;
      } else {
        u = BELT.uTail;
        theta = Math.PI + (s - 2 * S - arc) / BELT.r;
      }
      const c = Math.cos(theta);
      const sn = Math.sin(theta);
      // Local u, n axes in model space, spun about the sprocket.
      const eu = [BELT.dx, BELT.dy];
      const en = [-BELT.dy, BELT.dx];
      X.set(eu[0] * c + en[0] * sn, eu[1] * c + en[1] * sn, 0);
      Y.set(-eu[0] * sn + en[0] * c, -eu[1] * sn + en[1] * c, 0);
      P.set(eu[0] * u + en[0] * BELT.nC, eu[1] * u + en[1] * BELT.nC, 0);
      M.makeBasis(X, Y, Z).setPosition(P);
      rowsA.setMatrixAt(i, M);
      rowsB.setMatrixAt(i, M);
    }
    rowsA.instanceMatrix.needsUpdate = true;
    rowsB.instanceMatrix.needsUpdate = true;
  }
  placeRows(0);

  const state = { travel: 0, wheelAngle: 0, paddleAngle: 0, drumPhase: 0 };
  const off = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const zAxis = new THREE.Vector3(0, 0, 1);

  return {
    root,
    parts,
    lift,
    // Where a world point on the model has moved to once exploded.
    partOffset(key, explode, focus) {
      const part = parts[key];
      if (!part) return new THREE.Vector3();
      const v = new THREE.Vector3().fromArray(SUB_OFFSET[part.sub]).multiplyScalar(explode);
      const po = PART_OFFSET[key];
      if (po) v.add(new THREE.Vector3().fromArray(po).multiplyScalar(focus[part.sub] ?? 0));
      return v;
    },
    update(dt, s) {
      // s: { explode, focus:{conveyor,drum,bin}, belt, rock, roll, highlight, reduced }
      state.travel = (state.travel + dt * s.belt * 0.34) % loopLen;
      state.drumPhase += (dt * s.rock * 2 * Math.PI) / DRUM_PERIOD;
      state.paddleAngle += dt * s.belt * 1.8;
      placeRows(state.travel);

      const maxFocus = Math.max(s.focus.conveyor, s.focus.drum, s.focus.bin);
      for (const p of Object.values(parts)) {
        off.fromArray(SUB_OFFSET[p.sub]).multiplyScalar(s.explode);
        const po = PART_OFFSET[p.key];
        const f = s.focus[p.sub] ?? 0;
        if (po) {
          off.x += po[0] * f;
          off.y += po[1] * f;
          off.z += po[2] * f;
        }
        p.group.position.copy(off);
        p.group.quaternion.identity();

        if (p.base) {
          // Wheels. Driving towards +x turns them clockwise seen from +z.
          p.group.position.add(p.base);
          p.group.quaternion.setFromAxisAngle(zAxis, -s.roll / WHEEL_R);
        }
        if (p.key === 'd_drum') {
          const a = Math.sin(state.drumPhase) * DRUM_SWING * s.rockAmp;
          q.setFromAxisAngle(DRUM_AXIS, a);
          p.group.quaternion.copy(q);
          const pv = DRUM_PIVOT.clone();
          p.group.position.add(pv.clone().sub(pv.applyQuaternion(q)));
        }

        const target = p.sub === 'carrier' ? 1 - 0.8 * maxFocus : 1 - 0.84 * Math.max(0, maxFocus - f);
        p.op += (target - p.op) * Math.min(1, dt * 7);
        const hl = s.highlight;
        const wantGlow = hl === p.key || hl === p.sub ? 0.5 : 0;
        p.glow += (wantGlow - p.glow) * Math.min(1, dt * 9);
        for (const m of p.meshes) {
          const mat = m.material;
          const opacity = mat.userData.baseOpacity * p.op;
          const see = opacity < 0.985;
          if (mat.transparent !== see) {
            mat.transparent = see;
            mat.needsUpdate = true;
          }
          mat.opacity = opacity;
          mat.depthWrite = opacity > 0.6;
          mat.emissiveIntensity = p.glow;
          m.castShadow = opacity > 0.6 && mat.userData.baseOpacity === 1 && !mat.userData.isScreen;
        }
      }
    },
  };
}
