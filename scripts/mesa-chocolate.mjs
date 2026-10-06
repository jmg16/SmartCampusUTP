import { writeFileSync } from 'node:fs';
import { Buffer } from 'node:buffer';

const wood = [];
const iron = [];

function addBox(target, cx, cy, cz, sx, sy, sz) {
  const hx = sx / 2;
  const hy = sy / 2;
  const hz = sz / 2;
  const faces = [
    { n: [1, 0, 0], v: [[1, -1, -1], [1, -1, 1], [1, 1, 1], [1, 1, -1]] },
    { n: [-1, 0, 0], v: [[-1, -1, 1], [-1, -1, -1], [-1, 1, -1], [-1, 1, 1]] },
    { n: [0, 1, 0], v: [[-1, 1, -1], [1, 1, -1], [1, 1, 1], [-1, 1, 1]] },
    { n: [0, -1, 0], v: [[-1, -1, 1], [1, -1, 1], [1, -1, -1], [-1, -1, -1]] },
    { n: [0, 0, 1], v: [[-1, -1, 1], [-1, 1, 1], [1, 1, 1], [1, -1, 1]] },
    { n: [0, 0, -1], v: [[1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, -1]] },
  ];
  for (const face of faces) {
    const corners = face.v.map(([x, y, z]) => [cx + x * hx, cy + y * hy, cz + z * hz]);
    const [a, b, c] = corners;
    const ux = b[0] - a[0];
    const uy = b[1] - a[1];
    const uz = b[2] - a[2];
    const vx = c[0] - a[0];
    const vy = c[1] - a[1];
    const vz = c[2] - a[2];
    const dot =
      (uy * vz - uz * vy) * face.n[0] +
      (uz * vx - ux * vz) * face.n[1] +
      (ux * vy - uy * vx) * face.n[2];
    const order = dot >= 0 ? [0, 1, 2, 3] : [0, 3, 2, 1];
    const base = target.positions.length / 3;
    for (const index of order) {
      target.positions.push(...corners[index]);
      target.normals.push(...face.n);
    }
    target.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
}

function mesh() {
  return { positions: [], normals: [], indices: [] };
}

const madera = mesh();
const hierro = mesh();

const ancho = 1.2;
const fondo = 0.6;
const alto = 0.75;
const tapa = 0.03;
const cajonAlto = 0.13;
const tubo = 0.018;

addBox(madera, 0, alto - tapa / 2, 0, ancho, tapa, fondo);

const cajonAncho = ancho - 0.08;
const cajonGrosor = 0.02;
const frenteZ = fondo / 2 - cajonGrosor / 2 - 0.006;
addBox(madera, 0, alto - tapa - cajonAlto / 2, frenteZ, cajonAncho, cajonAlto, cajonGrosor);

const asaY = alto - tapa - cajonAlto * 0.42;
const asaZ = frenteZ + cajonGrosor / 2 + 0.004;
for (const lado of [-1, 1]) {
  addBox(hierro, lado * 0.2, asaY, asaZ, 0.1, 0.012, 0.008);
}

const xL = -ancho / 2 + 0.05;
const xR = ancho / 2 - 0.05;
const zF = fondo / 2 - 0.045;
const zB = -fondo / 2 + 0.045;
const bajoTapa = alto - tapa;
const bajoCajon = alto - tapa - cajonAlto;

for (const x of [xL, xR]) {
  for (const z of [zF, zB]) {
    addBox(hierro, x, bajoTapa / 2, z, tubo, bajoTapa, tubo);
  }
}

const luzFrente = xR - xL;
for (const fraccion of [0.25, 0.5, 0.75]) {
  const x = xL + luzFrente * fraccion;
  addBox(hierro, x, bajoCajon / 2, zF, tubo, bajoCajon, tubo);
}

const railY = tubo / 2;
addBox(hierro, 0, railY, zF, luzFrente, tubo, tubo);
addBox(hierro, 0, railY, zB, luzFrente, tubo, tubo);
addBox(hierro, xL, railY, (zF + zB) / 2, tubo, tubo, zF - zB);
addBox(hierro, xR, railY, (zF + zB) / 2, tubo, tubo, zF - zB);

function pack(parts) {
  const positions = new Float32Array(parts.positions);
  const normals = new Float32Array(parts.normals);
  const indices = new Uint16Array(parts.indices);
  let min = [Infinity, Infinity, Infinity];
  let max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    for (let k = 0; k < 3; k += 1) {
      min[k] = Math.min(min[k], positions[i + k]);
      max[k] = Math.max(max[k], positions[i + k]);
    }
  }
  return { positions, normals, indices, min, max };
}

const bloques = [pack(madera), pack(hierro)];
const binParts = [];
let offset = 0;
function align(n) {
  return (n + 3) & ~3;
}
const views = bloques.map((bloque) => {
  const posStart = offset;
  binParts.push(Buffer.from(bloque.positions.buffer));
  offset = align(offset + bloque.positions.byteLength);
  const norStart = offset;
  binParts.push(Buffer.from(bloque.normals.buffer));
  offset = align(offset + bloque.normals.byteLength);
  const idxStart = offset;
  binParts.push(Buffer.from(bloque.indices.buffer));
  offset = align(offset + bloque.indices.byteLength);
  return { posStart, norStart, idxStart, count: bloque.indices.length, min: bloque.min, max: bloque.max, posLen: bloque.positions.length / 3 };
});

const bin = Buffer.alloc(offset);
let cursor = 0;
for (const part of binParts) {
  part.copy(bin, cursor);
  cursor = align(cursor + part.length);
}

const gltf = {
  asset: { version: '2.0', generator: 'smartcampus mesa chocolate' },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0, name: 'Mesa chocolate' }],
  materials: [
    {
      name: 'Madera chocolate',
      pbrMetallicRoughness: {
        baseColorFactor: [0.1, 0.034, 0.012, 1],
        metallicFactor: 0,
        roughnessFactor: 0.72,
      },
    },
    {
      name: 'Hierro negro',
      pbrMetallicRoughness: {
        baseColorFactor: [0.07, 0.07, 0.08, 1],
        metallicFactor: 0.9,
        roughnessFactor: 0.32,
      },
    },
  ],
  meshes: [
    {
      primitives: views.map((view, index) => ({
        attributes: { POSITION: index * 3, NORMAL: index * 3 + 1 },
        indices: index * 3 + 2,
        material: index,
      })),
    },
  ],
  accessors: views.flatMap((view) => [
    {
      bufferView: views.indexOf(view) * 3,
      componentType: 5126,
      count: view.posLen,
      type: 'VEC3',
      min: view.min,
      max: view.max,
    },
    {
      bufferView: views.indexOf(view) * 3 + 1,
      componentType: 5126,
      count: view.posLen,
      type: 'VEC3',
    },
    {
      bufferView: views.indexOf(view) * 3 + 2,
      componentType: 5123,
      count: view.count,
      type: 'SCALAR',
    },
  ]),
  bufferViews: views.flatMap((view, index) => {
    const posBytes = bloques[index].positions.byteLength;
    const norBytes = bloques[index].normals.byteLength;
    const idxBytes = bloques[index].indices.byteLength;
    return [
      { buffer: 0, byteOffset: view.posStart, byteLength: posBytes, target: 34962 },
      { buffer: 0, byteOffset: view.norStart, byteLength: norBytes, target: 34962 },
      { buffer: 0, byteOffset: view.idxStart, byteLength: idxBytes, target: 34963 },
    ];
  }),
  buffers: [{ byteLength: bin.length }],
};

const json = Buffer.from(JSON.stringify(gltf));
const jsonPad = Buffer.alloc((4 - (json.length % 4)) % 4, 0x20);
const binPad = Buffer.alloc((4 - (bin.length % 4)) % 4, 0);
const jsonChunk = Buffer.concat([json, jsonPad]);
const binChunk = Buffer.concat([bin, binPad]);
const total = 12 + 8 + jsonChunk.length + 8 + binChunk.length;
const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546c67, 0);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(total, 8);
const jsonHeader = Buffer.alloc(8);
jsonHeader.writeUInt32LE(jsonChunk.length, 0);
jsonHeader.writeUInt32LE(0x4e4f534a, 4);
const binHeader = Buffer.alloc(8);
binHeader.writeUInt32LE(binChunk.length, 0);
binHeader.writeUInt32LE(0x004e4942, 4);

const out = 'src/assets/mesa-chocolate.glb';
writeFileSync(out, Buffer.concat([header, jsonHeader, jsonChunk, binHeader, binChunk]));
console.log(out, total);
