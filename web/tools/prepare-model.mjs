// Turns the team's raw model into the one the site loads:
//   usage: node tools/prepare-model.mjs <raw.glb> public/models/beachboy.glb
//
// - bakes every part into model space and computes creased normals, so the
//   browser does not have to do that work at load time
// - lifts one spoke row off the belt, as a template the site animates around
//   the real belt loop
// - splits the four carrier wheels so they can spin about their own axles
// - compresses everything with meshopt
import { Document, NodeIO } from '@gltf-transform/core';
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { meshopt } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import * as THREE from 'three';
import { toCreasedNormals, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error('usage: prepare-model.mjs <raw.glb> <out.glb>');
  process.exit(1);
}

await MeshoptDecoder.ready;
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions([EXTMeshoptCompression, KHRMeshQuantization]).registerDependencies({
  'meshopt.decoder': MeshoptDecoder,
  'meshopt.encoder': MeshoptEncoder,
});
const src = await io.read(input);

// Belt frame, measured from the raw mesh: u runs downhill along the belt, n is
// the outward normal of the top run. Rows sit on a stadium-shaped loop.
const beltDir = new THREE.Vector2(0.6519, -0.7583).normalize();
const beltNorm = new THREE.Vector2(-beltDir.y, beltDir.x);
const toUN = (x, y) => [x * beltDir.x + y * beltDir.y, x * beltNorm.x + y * beltNorm.y];

// The row sitting mid-span on the top run, used as the template.
const ROW = { uMin: 0.2, uMax: 0.4, nAbove: 0.49 };
const ROW_ORIGIN = { u: 0.3, n: 0.49 };

const WHEELS = [
  { name: 'k_wheel_fl', sx: 1, sz: -1 },
  { name: 'k_wheel_fr', sx: 1, sz: 1 },
  { name: 'k_wheel_rl', sx: -1, sz: -1 },
  { name: 'k_wheel_rr', sx: -1, sz: 1 },
];
const WHEEL_CENTER = { x: 0.225, y: -0.0685 };

const GUARD_MIN_AREA = 0.0035;
const parts = [];

function pushPart(name, positions, indices = null) {
  if (!positions.length) return;
  let g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  if (indices) g.setIndex(indices);
  parts.push({ name, geometry: g });
}

for (const node of src.getRoot().listNodes()) {
  const mesh = node.getMesh();
  if (!mesh) continue;
  const name = node.getName();
  const world = new THREE.Matrix4().fromArray(node.getWorldMatrix());
  for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute('POSITION');
    const idx = prim.getIndices();
    const count = idx ? idx.getCount() : pos.getCount();
    const tri = [];
    const v = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      const a = idx ? idx.getScalar(i) : i;
      const [x, y, z] = pos.getElement(a, [0, 0, 0]);
      v.set(x, y, z).applyMatrix4(world);
      tri.push(v.x, v.y, v.z);
    }

    // The side guards are big flat plates modelled in with the frame. They are
    // clear polycarbonate on the machine, so give them their own part.
    if (name === 'c_frame__mat_1' || name === 'c_frame__mat_2' || name === 'c_frame__mat_5') {
      const plain = [];
      const guard = [];
      const a = new THREE.Vector3();
      const b = new THREE.Vector3();
      for (let i = 0; i < tri.length; i += 9) {
        const f = tri.slice(i, i + 9);
        a.set(f[3] - f[0], f[4] - f[1], f[5] - f[2]);
        b.set(f[6] - f[0], f[7] - f[1], f[8] - f[2]);
        const area = a.cross(b).length() / 2;
        (area > GUARD_MIN_AREA ? guard : plain).push(...f);
      }
      console.log(name, 'plain', plain.length / 9, 'guard', guard.length / 9);
      pushPart(name, plain);
      if (guard.length) pushPart(`c_guard__${name.split('__')[1]}`, guard);
      continue;
    }

    const isBeltSpokes = name === 'c_belt__mat_2' || name === 'c_belt__mat_1';
    const isWheel = name.startsWith('k_wheels');
    if (!isBeltSpokes && !isWheel) {
      pushPart(name, tri);
      continue;
    }

    const template = [];
    const wheelBins = WHEELS.map(() => []);
    for (let i = 0; i < tri.length; i += 9) {
      const f = tri.slice(i, i + 9);
      const cx = (f[0] + f[3] + f[6]) / 3;
      const cy = (f[1] + f[4] + f[7]) / 3;
      const cz = (f[2] + f[5] + f[8]) / 3;
      if (isWheel) {
        const w = WHEELS.findIndex((o) => Math.sign(cx) === o.sx && Math.sign(cz) === o.sz);
        for (let k = 0; k < 9; k += 3) {
          wheelBins[w].push(f[k] - WHEELS[w].sx * WHEEL_CENTER.x, f[k + 1] - WHEEL_CENTER.y, f[k + 2]);
        }
        continue;
      }
      // Everything spoke-like is removed from the static belt, and one row is
      // kept in belt-local coordinates. Rollers and sprockets live elsewhere.
      const [u, n] = toUN(cx, cy);
      if (u > ROW.uMin && u < ROW.uMax && n > ROW.nAbove) {
        for (let k = 0; k < 9; k += 3) {
          const [fu, fn] = toUN(f[k], f[k + 1]);
          template.push(fu - ROW_ORIGIN.u, fn - ROW_ORIGIN.n, f[k + 2]);
        }
      }
    }
    if (isWheel) {
      const suffix = name.split('__')[1];
      WHEELS.forEach((w, i) => pushPart(`${w.name}__${suffix}`, wheelBins[i]));
    } else {
      const label = name === 'c_belt__mat_2' ? 'c_spoke__holder' : 'c_spoke__tine';
      pushPart(label, template);
    }
  }
}

const doc = new Document();
doc.createBuffer();
const scene = doc.createScene('beachboy');
const buffer = doc.getRoot().listBuffers()[0];
const material = doc.createMaterial('base').setDoubleSided(true);
let totalTris = 0;

for (const { name, geometry } of parts) {
  const creased = toCreasedNormals(geometry, 0.6);
  const welded = mergeVertices(creased, 1e-4);
  const pos = welded.getAttribute('position');
  const nor = welded.getAttribute('normal');
  const index = welded.getIndex();
  totalTris += index.count / 3;
  const prim = doc
    .createPrimitive()
    .setMaterial(material)
    .setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(index.array)).setBuffer(buffer))
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(pos.array)).setBuffer(buffer))
    .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(new Float32Array(nor.array)).setBuffer(buffer));
  const mesh = doc.createMesh(name).addPrimitive(prim);
  scene.addChild(doc.createNode(name).setMesh(mesh));
}

await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
mkdirSync(dirname(output), { recursive: true });
const glb = await io.writeBinary(doc);
writeFileSync(output, glb);
console.log(`${parts.length} parts, ${totalTris} tris, ${(glb.length / 1e6).toFixed(2)} MB -> ${output}`);
console.log(parts.map((p) => p.name).join(' '));
