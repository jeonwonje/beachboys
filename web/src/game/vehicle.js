// How the machine drives. It steers like a tank, by running each side's wheels at
// a different speed, and it can pivot on the spot. Numbers here are game rules.
import { BOUNDS, height, wetness } from './terrain.js';

export const MAX_SPEED = 4.6;
const MAX_REVERSE = 2.4;
const ACCEL = 5.5;
const TRACK = 0.6; // width between the wheels, metres
const BASE = 0.45; // distance between the axles, metres
const JAM_CLEAR_TIME = 0.9; // seconds of reversing that clear a jam

export function createVehicle() {
  const v = {
    x: 0,
    z: 0,
    y: 0,
    theta: 0,
    vx: 0,
    vz: 0,
    omega: 0,
    vf: 0,
    rollL: 0,
    rollR: 0,
    pitch: 0,
    roll: 0,
    slip: 0, // wheels spinning faster than the machine moves, 0 to 1
    load: 0, // sand building up ahead of the skid, 0 to 1
    jam: null, // the reason for a jam, or null
    jamClear: 0, // how far reversing has cleared a jam, 0 to 1
    grace: 0, // seconds until the next jam can start
    fold: 0,
    wet: 0,
    depth: 0, // metres past the waterline
    estop: false,
    hit: 0, // set for one frame by a collision, from its impact speed
  };

  v.place = (x, z, theta) => {
    Object.assign(v, { x, z, theta, vx: 0, vz: 0, omega: 0, vf: 0, load: 0, jam: null, jamClear: 0, fold: 0, slip: 0 });
  };

  v.startJam = (why) => {
    if (v.jam || v.grace > 0) return false;
    v.jam = why;
    v.jamClear = 0;
    return true;
  };

  // input: { throttle, steer, estop }, each axis -1 to 1. Steer +1 is to the left.
  v.step = (dt, input, shore, level, colliders) => {
    const fx = Math.cos(v.theta);
    const fz = -Math.sin(v.theta);
    const rx = Math.sin(v.theta);
    const rz = Math.cos(v.theta);
    v.hit = 0;
    v.grace = Math.max(0, v.grace - dt);
    v.estop = input.estop;
    v.wet = wetness(v.z, shore);
    v.depth = v.z - shore;

    let along = v.vx * fx + v.vz * fz;
    let side = v.vx * rx + v.vz * rz;

    // The slope under the machine.
    const e = 0.4;
    const gx = (height(v.x + e, v.z, level) - height(v.x - e, v.z, level)) / (2 * e);
    const gz = (height(v.x, v.z + e, level) - height(v.x, v.z - e, level)) / (2 * e);
    const climb = gx * fx + gz * fz; // rise per metre in the driving direction

    const grip = 1 - 0.42 * v.wet;
    let top = MAX_SPEED * (1 - 0.18 * v.wet);
    // The wheels dig in on wet sand when they climb the cross-slope.
    const digIn = v.wet * Math.max(0, climb) * 3.2;
    top *= 1 - Math.min(0.55, digIn);
    if (v.depth > 0.6) top *= Math.max(0.35, 1 - (v.depth - 0.6) * 0.4);

    let throttle = input.throttle;
    if (v.jam) {
      // A jam stalls the machine. Only reversing frees it.
      if (throttle < -0.2) {
        v.jamClear += dt / JAM_CLEAR_TIME;
        if (v.jamClear >= 1) {
          v.jam = null;
          v.load = 0;
          v.grace = 2.5;
        }
      }
      if (throttle > 0) throttle = 0;
    }

    const target = throttle > 0 ? throttle * top : throttle * MAX_REVERSE;
    const rate = (Math.sign(target - along) === Math.sign(along) || !along ? ACCEL * grip : ACCEL * 1.6) * dt;
    along += Math.max(-rate, Math.min(rate, target - along));
    side *= Math.exp(-dt * 8 * grip);

    // Gravity along the slope, softened for play.
    along -= climb * 9.8 * 0.22 * dt;
    side -= (gx * rx + gz * rz) * 9.8 * 0.35 * (1 - grip * 0.6) * dt;

    // The emergency stop halts all motion at once.
    if (input.estop) {
      along = 0;
      side = 0;
    }

    v.vf = along;
    v.vx = fx * along + rx * side;
    v.vz = fz * along + rz * side;

    const wantTurn = input.estop ? 0 : input.steer * (2.5 - 0.17 * Math.abs(along)) * (1 - 0.18 * v.wet);
    v.omega += (wantTurn - v.omega) * Math.min(1, dt * (9 * grip));
    v.theta += v.omega * dt;
    v.x += v.vx * dt;
    v.z += v.vz * dt;

    // Sand builds up ahead of the skid at speed on wet sand, until it stalls the machine.
    const fast = Math.abs(along) / MAX_SPEED;
    if (v.wet > 0.25 && along > 0 && fast > 0.62 && !v.jam) v.load += (fast - 0.62) * 2.6 * v.wet * dt * 1.6;
    else v.load -= dt * 0.45;
    v.load = Math.max(0, Math.min(1, v.load));
    if (v.load >= 1) v.startJam('sand');
    v.fold += ((v.jam ? 0.2 : 0) - v.fold) * Math.min(1, dt * 7);

    // Wheels turn with the motion, plus whatever slips.
    const wanted = input.estop ? 0 : v.jam ? Math.abs(throttle) * MAX_REVERSE : Math.abs(target);
    const slipNow = input.estop ? 0 : Math.max(0, Math.min(1, (wanted - Math.abs(along)) / 2.5)) * (0.4 + 0.6 * v.wet);
    v.slip += (slipNow - v.slip) * Math.min(1, dt * 8);
    const spin = along + Math.sign(throttle || along) * v.slip * 2.2;
    v.rollL += (spin - (v.omega * TRACK) / 2) * dt;
    v.rollR += (spin + (v.omega * TRACK) / 2) * dt;

    collide(v, colliders);

    // Ride height and lean from the ground under the four wheels.
    const cos = Math.cos(v.theta);
    const sin = -Math.sin(v.theta);
    const at = (a, b) => height(v.x + cos * a + Math.sin(v.theta) * b, v.z + sin * a + Math.cos(v.theta) * b, level);
    const fl = at(BASE / 2, -TRACK / 2);
    const fr = at(BASE / 2, TRACK / 2);
    const rl = at(-BASE / 2, -TRACK / 2);
    const rr = at(-BASE / 2, TRACK / 2);
    const k = Math.min(1, dt * 11);
    v.y = (fl + fr + rl + rr) / 4;
    v.pitch += (Math.atan2((fl + fr - rl - rr) / 2, BASE) - v.pitch) * k;
    v.roll += (Math.atan2((fl + rl - fr - rr) / 2, TRACK) - v.roll) * k;
  };

  return v;
}

function collide(v, colliders) {
  const cos = Math.cos(v.theta);
  const sin = -Math.sin(v.theta);
  // The body is two circles: one on the carrier and one on the conveyor.
  for (const [offset, radius] of [
    [-0.3, 0.52],
    [0.55, 0.44],
  ]) {
    for (const c of colliders) {
      const px = v.x + cos * offset;
      const pz = v.z + sin * offset;
      const dx = px - c.x;
      const dz = pz - c.z;
      const min = radius + c.r;
      const d2 = dx * dx + dz * dz;
      if (d2 >= min * min || d2 === 0) continue;
      const d = Math.sqrt(d2);
      const nx = dx / d;
      const nz = dz / d;
      v.x += nx * (min - d);
      v.z += nz * (min - d);
      const into = v.vx * nx + v.vz * nz;
      if (into < 0) {
        v.vx -= nx * into * 1.25;
        v.vz -= nz * into * 1.25;
        v.hit = Math.max(v.hit, -into);
      }
    }
  }
  if (v.x < BOUNDS.minX) (v.x = BOUNDS.minX), (v.vx = Math.max(0, v.vx));
  if (v.x > BOUNDS.maxX) (v.x = BOUNDS.maxX), (v.vx = Math.min(0, v.vx));
  if (v.z < BOUNDS.minZ) (v.z = BOUNDS.minZ), (v.vz = Math.max(0, v.vz));
}
