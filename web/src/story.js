// The scroll choreography. Each chapter is a set of camera and machine targets,
// reached at the middle of that chapter's section and blended in between.
//   rover: rover position along the beach
//   t, az, el, d: look-at point (relative to rover unless `abs`), orbit, distance
//   side: pushes the subject away from the text panel, -1 is left, 1 is right
export const CHAPTERS = {
  hero: { rover: 0, t: [0.15, 0.3, 0], az: -36, el: 5, d: 4.6, side: 0.24, time: 0.05, tide: 0.55, flow: 0 },
  problem: { rover: 0, abs: true, t: [17, 0.1, 5.2], az: -70, el: 26, d: 11, side: -0.2, time: 0.8, tide: 1, flow: 0, belt: 0 },
  gap: { rover: 0, abs: true, t: [11, 0.05, 6.1], az: -128, el: 34, d: 8.5, side: 0.22, time: 1, tide: 1, flow: 0, belt: 0, band: 1 },
  path: { rover: 0, t: [0.2, 0.45, 0], az: -60, el: 14, d: 4.6, side: 0, time: 1.2, tide: 1, flow: 0, dim: 1 },
  machine: { rover: 0, t: [0.1, 0.62, 0], az: -46, el: 22, d: 5.0, side: 0.2, time: 1.4, tide: 1, explode: 1, flow: 0 },
  conveyor: { rover: 0, t: [0.72, 0.5, 0], az: -68, el: 14, d: 3.2, side: 0.2, time: 1.5, tide: 1, explode: 1, focus: 'conveyor', flow: 0, belt: 1 },
  drum: { rover: 0, t: [-0.08, 0.95, 0], az: -126, el: 30, d: 2.3, side: -0.2, time: 1.6, tide: 1, explode: 1, focus: 'drum', flow: 0, rock: 1 },
  tray: { rover: 0, t: [-0.75, 0.52, 0], az: -150, el: 24, d: 2.6, side: 0.2, time: 1.7, tide: 1, explode: 1, focus: 'bin', flow: 0 },
  electronics: { rover: 0, t: [0.1, 0.42, 0], az: -24, el: 34, d: 2.5, side: -0.22, time: 1.8, tide: 1, flow: 0 },
  pass: { rover: 14, t: [0.25, 0.42, 0], az: -32, el: 12, d: 4.0, side: 0.2, time: 2, tide: 1, flow: 1, belt: 1, rock: 1 },
  bench: { rover: 16, t: [0.1, 0.4, 0], az: -80, el: 20, d: 5, side: 0, time: 2.2, tide: 1, dim: 1 },
  iterate: { rover: 16, t: [0.1, 0.4, 0], az: -60, el: 18, d: 6, side: 0, time: 2.3, tide: 1, dim: 1 },
  score: { rover: 16, t: [0.1, 0.4, 0], az: -40, el: 16, d: 7, side: 0, time: 2.4, tide: 1, dim: 1 },
  timeline: { rover: 16, t: [0.1, 0.4, 0], az: -20, el: 14, d: 8, side: 0, time: 2.6, tide: 1, dim: 1 },
  team: { rover: 16, t: [0.1, 0.55, 0], az: -148, el: 7, d: 7, side: 0, time: 3, tide: 1, flow: 0 },
};

const DEFAULTS = { explode: 0, focus: null, flow: 0, belt: 0, rock: 0, band: 0, abs: false, dim: 0 };

export function resolve(name) {
  return { ...DEFAULTS, ...CHAPTERS[name] };
}

const smooth = (x) => x * x * x * (x * (x * 6 - 15) + 10);
const lerp = (a, b, f) => a + (b - a) * f;

// Blend two chapter settings into plain numbers. Relative look-ats are made
// absolute first, so the camera can travel from rover to beach and back.
export function blend(a, b, f, roverBase) {
  const m = smooth(Math.min(1, Math.max(0, f)));
  const rover = lerp(a.rover, b.rover, m);
  const tA = a.abs ? a.t : [a.t[0] + a.rover, a.t[1], a.t[2] + roverBase.z];
  const tB = b.abs ? b.t : [b.t[0] + b.rover, b.t[1], b.t[2] + roverBase.z];
  const focusOf = (s, k) => (s.focus === k ? 1 : 0);
  return {
    rover,
    t: tA.map((v, i) => lerp(v, tB[i], m)),
    az: lerp(a.az, b.az, m),
    el: lerp(a.el, b.el, m),
    d: lerp(a.d, b.d, m),
    side: lerp(a.side, b.side, m),
    time: lerp(a.time, b.time, m),
    tide: lerp(a.tide, b.tide, m),
    explode: lerp(a.explode, b.explode, m),
    flow: lerp(a.flow, b.flow, m),
    belt: lerp(a.belt, b.belt, m),
    rock: lerp(a.rock, b.rock, m),
    band: lerp(a.band, b.band, m),
    dim: lerp(a.dim, b.dim, m),
    focus: {
      conveyor: lerp(focusOf(a, 'conveyor'), focusOf(b, 'conveyor'), m),
      drum: lerp(focusOf(a, 'drum'), focusOf(b, 'drum'), m),
      bin: lerp(focusOf(a, 'bin'), focusOf(b, 'bin'), m),
    },
  };
}

// Labels floating on the model. Positions are in model space, before explode.
export const PINS = [
  { id: 's_conveyor', ch: ['machine'], label: 'Conveyor', part: 'conveyor', anchor: 'c_frame', p: [0.62, 0.36, -0.2] },
  { id: 's_drum', ch: ['machine'], label: 'Half-drum', part: 'drum', anchor: 'd_frame', p: [-0.12, 0.5, -0.2] },
  { id: 's_bin', ch: ['machine'], label: 'Tray and bin', part: 'bin', anchor: 'b_bin', p: [-0.47, 0.2, -0.15] },
  { id: 's_carrier', ch: ['machine'], label: 'Copernicus', part: 'carrier', anchor: 'k_body', p: [0.1, 0.05, -0.24] },
  { id: 'c_skid', ch: ['conveyor'], label: 'Skid', part: 'c_skid', anchor: 'c_skid', p: [0.78, -0.27, -0.22] },
  { id: 'c_belt', ch: ['conveyor'], label: 'Spokes', part: 'c_belt', anchor: 'c_frame', p: [0.47, 0.2, -0.1] },
  { id: 'c_drive', ch: ['conveyor'], label: 'Drive', part: 'c_drive', anchor: 'c_drive', p: [0.36, 0.33, -0.25] },
  { id: 'c_paddle', ch: ['conveyor'], label: 'Paddle', part: 'c_paddle', anchor: 'c_paddle', p: [0.95, -0.13, -0.16] },
  { id: 'c_mount', ch: ['conveyor'], label: 'Mount', part: 'c_mount', anchor: 'c_mount', p: [0.2, 0.25, -0.2] },
  { id: 'd_drum', ch: ['drum'], label: 'Screen', part: 'd_drum', anchor: 'd_drum', p: [-0.12, 0.26, 0.02] },
  { id: 'd_wheels', ch: ['drum'], label: 'Carriers', part: 'd_wheels', anchor: 'd_wheels', p: [0.115, 0.35, -0.17] },
  { id: 'd_drive', ch: ['drum'], label: 'Drive', part: 'd_drive', anchor: 'd_drive', p: [0.06, 0.25, 0] },
  { id: 'd_frame', ch: ['drum'], label: 'Stroke', part: 'd_frame', anchor: 'd_frame', p: [0.116, 0.44, -0.225] },
  { id: 'b_vplate', ch: ['tray'], label: 'V plate', part: 'b_vplate', anchor: 'b_vplate', p: [0.02, 0.29, 0.12] },
  { id: 'b_tray', ch: ['tray'], label: 'Tray', part: 'b_tray', anchor: 'b_tray', p: [-0.14, 0.205, 0.1] },
  { id: 'b_bin', ch: ['tray'], label: 'Bin', part: 'b_bin', anchor: 'b_bin', p: [-0.46, 0.06, 0.15] },
  { id: 'b_pins', ch: ['tray'], label: 'Pins', part: 'b_pins', anchor: 'b_pins', p: [-0.34, 0.225, 0.12] },
];
