// The beach's shape. The same formula exists twice, once here for the physics and
// once in GLSL for the ground mesh. Change both together.
// +z is out to sea. The wet band is the steep strip above the waterline.

export const BOUNDS = { minX: -40, maxX: 40, minZ: -26 };
export const TIDE = { start: 9, end: 2.5 };

const ss = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// The cross-beach profile, with no bumps. It sets the height of the sea.
export function profile(z) {
  return 1.5 * (1 - ss(-3, 13, z)) - 0.035 * Math.max(z, -60) + 3 * (1 - ss(-42, -27, z));
}

export function seaLevel(shore) {
  return profile(shore);
}

export function height(x, z, level) {
  const inland = 1 - ss(-13, 1, z);
  const dunes = 0.34 * Math.sin(0.31 * x + 0.7) * Math.sin(0.23 * z + 1.1) + 0.15 * Math.sin(0.63 * x - 0.41 * z);
  const ripple = 0.045 * Math.sin(0.83 * x + 0.29 * z) + 0.03 * Math.sin(1.7 * x - 0.6 * z);
  return Math.max(profile(z) + inland * dunes + ripple, level);
}

export const TERRAIN_GLSL = /* glsl */ `
  uniform float uLevel;
  float terrainH(vec2 p){
    float x = p.x, z = p.y;
    float prof = 1.5*(1.-smoothstep(-3.,13.,z)) - .035*max(z,-60.) + 3.*(1.-smoothstep(-42.,-27.,z));
    float inland = 1.-smoothstep(-13.,1.,z);
    float dunes = .34*sin(.31*x+.7)*sin(.23*z+1.1) + .15*sin(.63*x-.41*z);
    float ripple = .045*sin(.83*x+.29*z) + .03*sin(1.7*x-.6*z);
    return max(prof + inland*dunes + ripple, uLevel);
  }
`;

// How wet the sand is, 0 to 1. Matches the wet band that the ground shader draws.
export function wetness(z, shore) {
  return ss(shore - 4.8, shore - 1.1, z);
}
