// Sand kicked up by the wheels, water at the shoreline, and tyre tracks.
import * as THREE from 'three';
import { height } from './terrain.js';

export function createParticles(scene, max = 500) {
  const pos = new Float32Array(max * 3);
  const col = new Float32Array(max * 3);
  const vel = new Float32Array(max * 3);
  const life = new Float32Array(max);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({ size: 0.05, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);
  let head = 0;
  const c = new THREE.Color();
  for (let i = 0; i < max; i++) pos[i * 3 + 1] = -100;

  return {
    emit(x, y, z, vx, vy, vz, color, ttl) {
      const i = head;
      head = (head + 1) % max;
      pos.set([x, y, z], i * 3);
      vel.set([vx, vy, vz], i * 3);
      c.set(color);
      col.set([c.r, c.g, c.b], i * 3);
      life[i] = ttl;
    },
    update(dt) {
      for (let i = 0; i < max; i++) {
        if (life[i] <= 0) continue;
        life[i] -= dt;
        vel[i * 3 + 1] -= 7 * dt;
        pos[i * 3] += vel[i * 3] * dt;
        pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
        pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
        if (life[i] <= 0) pos[i * 3 + 1] = -100;
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
    },
  };
}

// Two ribbons of lugged track, kept in a ring buffer. The swash erases them.
export function createTracks(scene, shared, segments = 1400) {
  const verts = segments * 6;
  const pos = new Float32Array(verts * 3);
  const data = new Float32Array(verts * 3); // across, distance, birth order
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aData', new THREE.BufferAttribute(data, 3));
  const uniforms = { uHead: { value: 0 }, uShore: shared.uShore, uSpan: { value: segments } };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    vertexShader: /* glsl */ `
      attribute vec3 aData; varying vec3 vData; varying float vZ;
      void main(){ vData = aData; vZ = position.z; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: /* glsl */ `
      varying vec3 vData; varying float vZ;
      uniform float uHead, uSpan, uShore;
      void main(){
        float age = 1.-clamp((uHead-vData.z)/uSpan,0.,1.);
        float side = 1.-smoothstep(.62,1.,abs(vData.x));
        float lug = .55+.45*step(.5,fract(vData.y*6.+abs(vData.x)*.9));
        float a = .27*side*lug*age*smoothstep(.2,-1.2,vZ-uShore);
        if(a < .004) discard;
        gl_FragColor = vec4(.2,.14,.08,a);
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  scene.add(mesh);

  const offsets = [-0.3, 0.3];
  const last = offsets.map(() => null);
  let index = 0;
  let order = 0;
  let dist = 0;
  const WIDTH = 0.085;

  function quad(a, b) {
    const v = index * 6;
    index = (index + 1) % segments;
    const put = (i, p, across) => {
      pos.set([p.x, p.y, p.z], (v + i) * 3);
      data.set([across, p.d, p.n], (v + i) * 3);
    };
    const nx = b.z - a.z;
    const nz = a.x - b.x;
    const l = Math.hypot(nx, nz) || 1;
    const ox = (nx / l) * WIDTH;
    const oz = (nz / l) * WIDTH;
    const A0 = { ...a, x: a.x - ox, z: a.z - oz };
    const A1 = { ...a, x: a.x + ox, z: a.z + oz };
    const B0 = { ...b, x: b.x - ox, z: b.z - oz };
    const B1 = { ...b, x: b.x + ox, z: b.z + oz };
    put(0, A0, -1);
    put(1, B0, -1);
    put(2, A1, 1);
    put(3, A1, 1);
    put(4, B0, -1);
    put(5, B1, 1);
  }

  return {
    clear() {
      pos.fill(0);
      data.fill(0);
      last.fill(null);
      geo.attributes.position.needsUpdate = true;
      geo.attributes.aData.needsUpdate = true;
    },
    update(v, level) {
      const moved = Math.hypot(v.x - (this.px ?? 1e9), v.z - (this.pz ?? 1e9));
      if (moved < 0.14) return;
      dist += moved < 1 ? moved : 0;
      this.px = v.x;
      this.pz = v.z;
      order++;
      uniforms.uHead.value = order;
      offsets.forEach((o, i) => {
        const x = v.x + Math.sin(v.theta) * o;
        const z = v.z + Math.cos(v.theta) * o;
        const p = { x, y: height(x, z, level) + 0.014, z, d: dist, n: order };
        if (last[i] && Math.hypot(last[i].x - x, last[i].z - z) < 1) quad(last[i], p);
        last[i] = p;
      });
      geo.attributes.position.needsUpdate = true;
      geo.attributes.aData.needsUpdate = true;
    },
  };
}
