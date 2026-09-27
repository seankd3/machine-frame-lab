import * as THREE from "three";
import type { Look } from "../geometry/parts";

// Physically based looks for every part. Surface character (brushing, thread,
// MDF fibre) comes from small procedural textures, generated once.

function canvasTexture(size: number, draw: (ctx: CanvasRenderingContext2D, size: number) => void, srgb = false) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  draw(canvas.getContext("2d")!, size);
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

/** Roughness streaks along V: extrusion die lines and brushing. */
const brushed = () =>
  canvasTexture(256, (ctx, s) => {
    ctx.fillStyle = "rgb(128,128,128)";
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 900; i++) {
      const x = rand() * s;
      const v = 100 + rand() * 60;
      ctx.fillStyle = `rgba(${v},${v},${v},0.35)`;
      ctx.fillRect(x, 0, 0.6 + rand() * 1.2, s);
    }
  });

/** Thread ridges: a normal map with one ridge per texel row band. */
const thread = () =>
  canvasTexture(64, (ctx, s) => {
    for (let y = 0; y < s; y++) {
      const phase = Math.sin((y / s) * Math.PI * 2);
      const g = Math.round(128 + phase * 110);
      ctx.fillStyle = `rgb(128,${g},255)`;
      ctx.fillRect(0, y, s, 1);
    }
  });

const mdfTexture = () =>
  canvasTexture(
    512,
    (ctx, s) => {
      ctx.fillStyle = "#a88257";
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 14000; i++) {
        const l = 0.55 + rand() * 0.25;
        ctx.fillStyle = `rgba(${Math.round(120 * l + 60)},${Math.round(90 * l + 40)},${Math.round(60 * l + 20)},0.18)`;
        ctx.fillRect(rand() * s, rand() * s, 1 + rand() * 2, 1 + rand() * 2);
      }
    },
    true,
  );

export function createMaterials(): Record<Look, THREE.Material> {
  const brush = brushed();
  brush.repeat.set(0.04, 1); // u runs around the section in mm; streaks run along the length
  const threadMap = thread();
  threadMap.repeat.set(1, 0.2); // one ridge per 5 mm of screw (uv v is millimetres)
  const mdf = mdfTexture();
  mdf.repeat.set(0.002, 0.002);

  const metal = (color: string, roughness: number, extra: Partial<THREE.MeshPhysicalMaterialParameters> = {}) =>
    new THREE.MeshPhysicalMaterial({ color, metalness: 1, roughness, ...extra });

  return {
    alu: metal("#c9ced4", 0.34, { roughnessMap: brush, clearcoat: 0.25, clearcoatRoughness: 0.4 }),
    aluMachined: metal("#d7dadd", 0.26, { roughnessMap: brush }),
    aluBlack: metal("#26282c", 0.42, { clearcoat: 0.3, clearcoatRoughness: 0.5 }),
    steel: metal("#aab1b8", 0.2),
    screw: metal("#b4bac0", 0.22, { normalMap: threadMap, normalScale: new THREE.Vector2(1.2, 1.2) }),
    oxide: metal("#202124", 0.38),
    socket: new THREE.MeshStandardMaterial({ color: "#050506", roughness: 0.9 }),
    motor: new THREE.MeshPhysicalMaterial({ color: "#16171a", metalness: 0.4, roughness: 0.55 }),
    plastic: new THREE.MeshPhysicalMaterial({ color: "#121214", roughness: 0.6 }),
    seal: new THREE.MeshPhysicalMaterial({ color: "#8c1d1d", roughness: 0.55 }),
    brass: metal("#c9a34f", 0.3),
    mdf: new THREE.MeshStandardMaterial({ map: mdf, roughness: 0.88 }),
    paint: new THREE.MeshPhysicalMaterial({ color: "#2b3a4a", metalness: 0.3, roughness: 0.45, clearcoat: 0.8, clearcoatRoughness: 0.2 }),
    carbide: metal("#8d9196", 0.18),
    teal: new THREE.MeshPhysicalMaterial({ color: "#0d8a8f", roughness: 0.45, clearcoat: 0.6 }),
    rubber: new THREE.MeshStandardMaterial({ color: "#101011", roughness: 0.95 }),
    label: new THREE.MeshPhysicalMaterial({ color: "#1e5fa8", roughness: 0.35, clearcoat: 1 }),
  };
}
