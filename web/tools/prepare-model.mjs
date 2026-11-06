// Turns the sorted CAD parts into the model the site loads:
//   usage: node tools/prepare-model.mjs <parts.glb> public/models/beachboy.glb
//
// Run tools/step-to-parts.py first. This step welds each part, removes triangles
// that change its outline by less than ALLOWED_ERROR, computes creased normals
// and compresses the result. Normals come last on purpose: they split vertices
// at creases, and the simplifier cannot collapse across a split.
import { Document, NodeIO } from '@gltf-transform/core';
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { meshopt } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import * as THREE from 'three';
import { mergeVertices, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const ALLOWED_ERROR = Number(process.env.ALLOWED_ERROR ?? 0.0007); // metres
const CREASE = 0.6; // radians

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error('usage: prepare-model.mjs <parts.glb> <out.glb>');
  process.exit(1);
}

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready]);
const io = new NodeIO().registerExtensions([EXTMeshoptCompression, KHRMeshQuantization]).registerDependencies({
  'meshopt.decoder': MeshoptDecoder,
  'meshopt.encoder': MeshoptEncoder,
});
const src = await io.read(input);

const doc = new Document();
doc.createBuffer();
const scene = doc.createScene('beachboy');
const buffer = doc.getRoot().listBuffers()[0];
const material = doc.createMaterial('base').setDoubleSided(true);
let before = 0;
let after = 0;
const perPart = [];

for (const node of src.getRoot().listNodes()) {
  const mesh = node.getMesh();
  if (!mesh) continue;
  const name = node.getName();
  for (const prim of mesh.listPrimitives()) {
    let g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(prim.getAttribute('POSITION').getArray()), 3));
    g.setIndex(new THREE.BufferAttribute(new Uint32Array(prim.getIndices().getArray()), 1));
    g = mergeVertices(g, 1e-5);
    const n0 = g.index.count / 3;
    before += n0;

    g.computeBoundingBox();
    const size = g.boundingBox.getSize(new THREE.Vector3()).length();
    const [indices] = MeshoptSimplifier.simplify(
      new Uint32Array(g.index.array),
      new Float32Array(g.getAttribute('position').array),
      3,
      0,
      ALLOWED_ERROR / size,
    );
    g.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));
    after += indices.length / 3;
    perPart.push([name, n0, indices.length / 3]);

    const welded = mergeVertices(toCreasedNormals(g, CREASE), 1e-5);
    const out = doc
      .createPrimitive()
      .setMaterial(material)
      .setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(welded.index.array)).setBuffer(buffer))
      .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(welded.getAttribute('position').array)).setBuffer(buffer))
      .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(new Float32Array(welded.getAttribute('normal').array)).setBuffer(buffer));
    scene.addChild(doc.createNode(name).setMesh(doc.createMesh(name).addPrimitive(out)));
  }
}

await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
mkdirSync(dirname(output), { recursive: true });
const glb = await io.writeBinary(doc);
writeFileSync(output, glb);
perPart.sort((a, b) => b[2] - a[2]);
console.log(perPart.slice(0, 10).map(([n, a, b]) => `${n} ${a}->${b}`).join('\n'));
console.log(`${before} -> ${after} tris, ${(glb.length / 1e6).toFixed(2)} MB -> ${output}`);
