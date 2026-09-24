import * as THREE from "three";

// Cada bola usa uno de estos dos diseños al desplegarse.
export const PAPER_DESIGNS = [
  { title: "Imagen 1", image: "https://i.ibb.co/BVdtX4tk/IMG-0799.png" },
  { title: "Imagen 2", image: "https://i.ibb.co/tMYdQXRc/IMG-0798.png" },
];

const TEX_W = 1024;
const TEX_H = 1400;
const designStates = [];

function drawImageCover(ctx, image, texture, canvas) {
  if (!image.complete || !image.naturalWidth) return;
  const scale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
  texture.needsUpdate = true;
}

function getDesignMaterial(designIndex) {
  const index = ((designIndex % PAPER_DESIGNS.length) + PAPER_DESIGNS.length) % PAPER_DESIGNS.length;
  if (designStates[index]) return designStates[index].material;
  const design = PAPER_DESIGNS[index];
  const canvas = document.createElement("canvas");
  canvas.width = TEX_W;
  canvas.height = TEX_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo crear la textura del papel.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, TEX_W, TEX_H);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.rotation = Math.PI;
  texture.center.set(0.5, 0.5);
  texture.repeat.set(1, -1);
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.9,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  const image = new Image();
  const state = { design, canvas, ctx, texture, material, image };
  designStates[index] = state;
  image.crossOrigin = "anonymous";
  image.onload = () => drawImageCover(ctx, image, texture, canvas);
  image.onerror = () => console.error("No se pudo cargar la imagen del papel:", design.image);
  image.src = design.image;
  return material;
}

export function createPaper(animData, designIndex = 0) {
  const { vertexCount, indices, uvs, positions, normals } = animData;
  const geometry = new THREE.BufferGeometry();
  const positionArray = new Float32Array(vertexCount * 3);
  for (let i = 0; i < vertexCount * 3; i++) positionArray[i] = positions[i];
  const positionAttr = new THREE.BufferAttribute(positionArray, 3);
  positionAttr.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("position", positionAttr);
  const normalArray = new Float32Array(vertexCount * 3);
  for (let i = 0; i < vertexCount * 3; i++) normalArray[i] = normals[i];
  const normalAttr = new THREE.BufferAttribute(normalArray, 3);
  normalAttr.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("normal", normalAttr);
  const uvArray = new Float32Array(uvs.length);
  for (let i = 0; i < uvs.length; i++) uvArray[i] = uvs[i];
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvArray, 2));
  geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1));
  const mesh = new THREE.Mesh(geometry, getDesignMaterial(designIndex));
  return { mesh, positionAttr, normalAttr };
}

export function updatePaperFrame(paper, animData, frameIdx) {
  const { vertexCount, frameCount, positions, normals } = animData;
  const { positionAttr, normalAttr } = paper;
  const length = vertexCount * 3;
  const frame0 = Math.floor(frameIdx);
  const blend = frameIdx - frame0;
  const offset0 = frame0 * length;
  const positionArray = positionAttr.array;
  const normalArray = normalAttr.array;
  if (blend < 1e-6) {
    for (let i = 0; i < length; i++) {
      positionArray[i] = positions[offset0 + i];
      normalArray[i] = normals[offset0 + i];
    }
  } else {
    const frame1 = (frame0 + 1) % frameCount;
    const offset1 = frame1 * length;
    const weight0 = 1 - blend;
    for (let i = 0; i < length; i++) {
      positionArray[i] = positions[offset0 + i] * weight0 + positions[offset1 + i] * blend;
      normalArray[i] = normals[offset0 + i] * weight0 + normals[offset1 + i] * blend;
    }
  }
  positionAttr.needsUpdate = true;
  normalAttr.needsUpdate = true;
  paper.mesh.geometry.computeBoundingSphere();
  paper.mesh.geometry.computeBoundingBox();
}
