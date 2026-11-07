// The debris: lying on the sand, riding the belt, sliding off it, flying to the
// clear-out skip. Size classes follow the report's small, medium and long.
import * as THREE from 'three';
import { flowPath, shapes } from '../scene/debris.js';
import { BOUNDS, height } from './terrain.js';

export const BIN_CAPACITY = 16;
const LONG_KINDS = new Set([4, 5, 6]); // sticks and rope
const SHOW_SCALE = 1.4; // a little larger than life, to read from the chase camera
const BELT_RATE = 0.28; // path fraction per second
const CLIMB_END = 0.42; // where the belt ends and the half-drum begins
const SLIDE_FROM_DEG = 5; // cross-slope where debris starts to slide off
const WET_FROM_Z = 3.5;

const INTAKE = { near: 0.82, far: 1.34, half: 0.52 };

function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function glintTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 1, 32, 32, 32);
  r.addColorStop(0, 'rgba(244,196,4,1)');
  r.addColorStop(0.42, 'rgba(244,196,4,.95)');
  r.addColorStop(0.6, 'rgba(22,35,63,.8)');
  r.addColorStop(0.72, 'rgba(22,35,63,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export function createItems(scene, count = 72) {
  const kinds = shapes();
  const weights = kinds.flatMap((k, i) => Array(k.weight).fill(i));
  const path = flowPath();
  const pool = kinds.map((kind) => {
    const mat = new THREE.MeshStandardMaterial({
      roughness: kind.rough ?? 0.7,
      metalness: kind.metal ?? 0,
      side: kind.double ? THREE.DoubleSide : THREE.FrontSide,
    });
    const im = new THREE.InstancedMesh(kind.geo, mat, count);
    im.castShadow = true;
    im.frustumCulled = false;
    scene.add(im);
    return { im, kind };
  });

  const glintPos = new Float32Array(count * 3);
  const glintGeo = new THREE.BufferGeometry();
  glintGeo.setAttribute('position', new THREE.BufferAttribute(glintPos, 3));
  const glints = new THREE.Points(
    glintGeo,
    // A fixed size on screen: readable far away, and never covers the debris up close.
    new THREE.PointsMaterial({ map: glintTexture(), size: 11, sizeAttenuation: false, transparent: true, depthWrite: false, toneMapped: false }),
  );
  glints.frustumCulled = false;
  scene.add(glints);

  const list = [];
  const color = new THREE.Color();
  const dummy = new THREE.Object3D();
  const p = new THREE.Vector3();
  let rand = makeRng(1);

  const api = {
    list,
    bin: [],
    onBelt: 0,
    onPick: null,
    onSpill: null,
    onWash: null,
    onBanked: null,
    onLongJam: null,
    onFull: null,

    reset(seed, colliders = []) {
      rand = makeRng(seed);
      list.length = 0;
      api.bin.length = 0;
      api.onBelt = 0;
      const used = kinds.map(() => 0);
      // Debris lies in patches, as the tide leaves it. Two in five patches are in the wet band.
      const patches = [];
      const PATCHES = 15;
      for (let i = 0; i < PATCHES; i++) {
        const wet = i % 5 < 2;
        patches.push({
          wet,
          x: BOUNDS.minX + 4 + ((i + rand()) / PATCHES) * (BOUNDS.maxX - BOUNDS.minX - 8),
          z: wet ? WET_FROM_Z + 1 + rand() * 2.6 : BOUNDS.minZ + 6 + Math.pow(rand(), 0.7) * (WET_FROM_Z - BOUNDS.minZ - 8),
        });
      }
      // Shuffle, so that wet and dry patches mix along the beach.
      for (let i = PATCHES - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [patches[i].x, patches[j].x] = [patches[j].x, patches[i].x];
      }
      for (let i = 0; i < count; i++) {
        const k = weights[Math.floor(rand() * weights.length)];
        const patch = patches[i % PATCHES];
        const wet = patch.wet;
        // Nothing lands where the machine could not reach it.
        let x;
        let z;
        for (let tries = 0; tries < 30; tries++) {
          x = patch.x + (rand() - 0.5) * 6.5;
          z = patch.z + (rand() - 0.5) * 3;
          if (wet) z = Math.min(8.2, Math.max(WET_FROM_Z, z));
          else z = Math.min(WET_FROM_Z - 0.1, z);
          x = Math.max(BOUNDS.minX + 1.5, Math.min(BOUNDS.maxX - 1.5, x));
          if (colliders.every((c) => Math.hypot(c.x - x, c.z - z) > c.r + 1)) break;
        }
        const it = {
          kind: k,
          slot: used[k]++,
          long: LONG_KINDS.has(k),
          wetBand: wet,
          state: 'ground',
          x,
          y: 0,
          z,
          vx: 0,
          vy: 0,
          vz: 0,
          u: 0,
          t: 0,
          rot: rand() * Math.PI * 2,
          s: (0.85 + rand() * 0.4) * SHOW_SCALE,
          lock: 0,
        };
        list.push(it);
        pool[k].im.setColorAt(it.slot, color.set(kinds[k].colors[Math.floor(rand() * kinds[k].colors.length)]));
      }
      pool.forEach((g, k) => {
        g.im.count = used[k];
        if (g.im.instanceColor) g.im.instanceColor.needsUpdate = true;
      });
      glintGeo.setDrawRange(0, 0);
    },

    // Clear-out: one item at a time leaves the bin for the skip.
    unload(target) {
      const it = api.bin.pop();
      if (!it) return false;
      it.state = 'fly';
      it.t = 0;
      it.from = { x: it.binAt.x, y: it.binAt.y, z: it.binAt.z };
      it.to = target;
      return true;
    },

    tally() {
      const t = { total: list.length, banked: 0, lost: 0, wet: 0, wetDone: 0, dry: 0, dryDone: 0, ground: 0 };
      for (const it of list) {
        const done = it.state === 'done' || it.state === 'fly' || it.state === 'bin';
        if (it.wetBand) {
          t.wet++;
          if (done) t.wetDone++;
        } else {
          t.dry++;
          if (done) t.dryDone++;
        }
        if (done) t.banked++;
        if (it.state === 'lost') t.lost++;
        if (it.state === 'ground' || it.state === 'air' || it.state === 'belt') t.ground++;
      }
      return t;
    },

    update(dt, v, lift, shore, level, time) {
      const cos = Math.cos(v.theta);
      const sin = -Math.sin(v.theta);
      const beltOn = !v.jam && !v.estop;
      const rollDeg = Math.abs(THREE.MathUtils.radToDeg(v.roll));
      lift.updateWorldMatrix(true, false);
      let belted = 0;
      let glint = 0;
      const canPick = beltOn && v.fold < 0.05;

      for (const it of list) {
        const g = pool[it.kind];
        dummy.scale.setScalar(it.s);
        dummy.rotation.set(0, it.rot, 0);

        if (it.state === 'ground') {
          it.lock = Math.max(0, it.lock - dt);
          it.y = height(it.x, it.z, level) + g.kind.y * SHOW_SCALE;
          // The tide takes what it reaches.
          if (it.z > shore + 0.6) {
            it.state = 'sinking';
            it.t = 0;
            api.onWash?.(it);
          } else if (it.lock === 0) {
            const dx = it.x - v.x;
            const dz = it.z - v.z;
            const a = dx * cos + dz * sin;
            const b = dx * Math.sin(v.theta) + dz * Math.cos(v.theta);
            if (a > INTAKE.near && a < INTAKE.far && Math.abs(b) < INTAKE.half && canPick) {
              if (api.bin.length + belted >= BIN_CAPACITY) {
                api.onFull?.();
              } else if (it.long && v.vf > 2.6) {
                // Taken too fast, a long piece wedges at the intake.
                if (api.onLongJam?.(it)) it.lock = 2;
              } else {
                it.state = 'belt';
                it.u = 0;
                api.onPick?.(it);
              }
            }
          }
          dummy.position.set(it.x, it.y, it.z);
          glintPos.set([it.x, it.y + 0.42 + Math.sin(time * 2.6 + it.rot) * 0.04, it.z], glint * 3);
          glint++;
        } else if (it.state === 'belt') {
          belted++;
          if (beltOn) it.u += BELT_RATE * dt;
          path.getPoint(Math.min(it.u, 1), p);
          // Past the head, the half-drum tumbles the load.
          if (it.u > CLIMB_END) dummy.rotation.set(it.u * 30, it.rot, it.u * 22);
          else dummy.rotation.set(0, it.rot * 0.1, -0.87);
          dummy.scale.setScalar(it.s * 0.72);
          lift.localToWorld(p);
          dummy.position.copy(p);
          it.binAt = { x: p.x, y: p.y, z: p.z };

          // On the climb, a cross-slope slides debris off the side of the belt.
          if (beltOn && it.u > 0.04 && it.u < CLIMB_END && rollDeg > SLIDE_FROM_DEG) {
            const chance = ((rollDeg - SLIDE_FROM_DEG) / 5) * 1.1 * dt;
            if (rand() < chance) {
              const downhill = Math.sign(v.roll) || 1;
              it.state = 'air';
              it.x = p.x;
              it.y = p.y;
              it.z = p.z;
              it.vx = v.vx + Math.sin(v.theta) * downhill * 1.5;
              it.vz = v.vz + Math.cos(v.theta) * downhill * 1.5;
              it.vy = 1.2;
              api.onSpill?.(it);
            }
          }
          if (it.u >= 1) {
            it.state = 'bin';
            api.bin.push(it);
            belted--;
          }
        } else if (it.state === 'air') {
          it.vy -= 9.8 * dt;
          it.x += it.vx * dt;
          it.y += it.vy * dt;
          it.z += it.vz * dt;
          it.rot += dt * 6;
          dummy.position.set(it.x, it.y, it.z);
          dummy.rotation.set(it.rot, it.rot * 0.6, 0);
          if (it.y < height(it.x, it.z, level) + g.kind.y) {
            it.state = 'ground';
            it.lock = 1.2;
          }
        } else if (it.state === 'bin') {
          // The bin's pile stands in for these. Keep the exit point for clear-out.
          p.set(-0.47, 0.25, 0);
          lift.localToWorld(p);
          it.binAt = { x: p.x, y: p.y, z: p.z };
          dummy.position.set(0, -50, 0);
        } else if (it.state === 'fly') {
          it.t += dt / 0.55;
          const k = Math.min(1, it.t);
          dummy.position.set(
            it.from.x + (it.to.x - it.from.x) * k,
            it.from.y + (it.to.y - it.from.y) * k + Math.sin(k * Math.PI) * 1.1,
            it.from.z + (it.to.z - it.from.z) * k,
          );
          dummy.rotation.set(k * 9, it.rot, k * 7);
          if (k === 1) {
            it.state = 'done';
            api.onBanked?.(it);
          }
        } else if (it.state === 'sinking') {
          it.t += dt / 0.8;
          const k = Math.min(1, it.t);
          dummy.position.set(it.x, it.y - k * 0.1, it.z + k * 0.8);
          dummy.scale.setScalar(Math.max(0.0001, it.s * (1 - k)));
          if (k === 1) it.state = 'lost';
        } else {
          dummy.position.set(0, -50, 0);
          dummy.scale.setScalar(0.0001);
        }
        dummy.updateMatrix();
        g.im.setMatrixAt(it.slot, dummy.matrix);
      }
      api.onBelt = belted;
      for (const g of pool) g.im.instanceMatrix.needsUpdate = true;
      glintGeo.attributes.position.needsUpdate = true;
      glintGeo.setDrawRange(0, glint);
    },
  };
  return api;
}
