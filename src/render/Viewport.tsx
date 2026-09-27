import { ContactShadows, OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { EffectComposer, N8AO, SMAA, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { Piece } from "../geometry/parts";
import type { Part } from "../machine/assembly";
import type { Compiled } from "../machine/compile";
import { createMaterials } from "./materials";

// The machine in a studio: image-based light from soft boxes, one shadowed
// key light, contact shadows on the floor, ambient occlusion. Parts sharing a
// shape are one instanced draw per material look.

const geometryCache = new Map<string, Piece[]>();
const piecesOf = (part: Part) => {
  let pieces = geometryCache.get(part.shape);
  if (!pieces) {
    pieces = part.build();
    geometryCache.set(part.shape, pieces);
  }
  return pieces;
};

export function Viewport({ compiled, onPick }: { compiled: Compiled; onPick?: (part: Part | null) => void }) {
  const { outer } = compiled.d;
  const radius = Math.hypot(outer.x, outer.y, outer.z) / 1000;
  return (
    <Canvas
      shadows
      style={{ position: "absolute", inset: 0 }}
      dpr={[1, 2]}
      gl={{ antialias: false, preserveDrawingBuffer: true }}
      camera={{ fov: 32, near: 0.02, far: 60, up: [0, 0, 1], position: [radius * 0.75, -radius * 0.95, radius * 0.62] }}
      onPointerMissed={() => onPick?.(null)}
    >
      <color attach="background" args={["#1b1f24"]} />
      <Studio radius={radius} />
      <group scale={0.001} position={[0, -compiled.d.baseL / 2000, 0]}>
        <Machine compiled={compiled} onPick={onPick} />
      </group>
      <ContactShadows position={[0, 0, 0.001]} rotation={[Math.PI / 2, 0, 0]} scale={radius * 3} resolution={1024} blur={2.4} opacity={0.65} far={1.2} />
      <Floor />
      <OrbitControls makeDefault target={[0, 0, outer.z / 2600]} enableDamping dampingFactor={0.12} maxPolarAngle={Math.PI * 0.49} minDistance={0.3} maxDistance={radius * 4} />
      <EffectComposer multisampling={0}>
        <N8AO aoRadius={0.12} intensity={2.2} distanceFalloff={0.6} quality="high" />
        <SMAA />
        <ToneMapping mode={ToneMappingMode.AGX} />
      </EffectComposer>
    </Canvas>
  );
}

function Studio({ radius }: { radius: number }) {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
    scene.environment = env;
    scene.environmentIntensity = 1.1;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return (
    <>
      <hemisphereLight args={["#dde6f0", "#2a2622", 0.4]} />
      <KeyLight radius={radius} />
    </>
  );
}

function KeyLight({ radius }: { radius: number }) {
  const light = useRef<THREE.DirectionalLight>(null);
  useLayoutEffect(() => {
    const l = light.current!;
    const cam = l.shadow.camera;
    cam.left = cam.bottom = -radius;
    cam.right = cam.top = radius;
    cam.near = 0.1;
    cam.far = radius * 6;
    cam.updateProjectionMatrix();
  }, [radius]);
  return (
    <directionalLight
      ref={light}
      castShadow
      intensity={2.4}
      position={[radius * 0.8, -radius * 1.2, radius * 2.4]}
      shadow-mapSize={[4096, 4096]}
      shadow-bias={-0.0002}
      shadow-normalBias={0.02}
    />
  );
}

function Floor() {
  return (
    <mesh receiveShadow position={[0, 0, -0.0005]}>
      <circleGeometry args={[30, 64]} />
      <meshStandardMaterial color="#2a2e33" roughness={0.9} />
    </mesh>
  );
}

function Machine({ compiled, onPick }: { compiled: Compiled; onPick?: (part: Part | null) => void }) {
  const materials = useMemo(createMaterials, []);
  const batches = useMemo(() => {
    const byShape = new Map<string, Part[]>();
    for (const part of compiled.asm.parts) {
      if (part.shape === "none") continue;
      const list = byShape.get(part.shape) ?? [];
      list.push(part);
      byShape.set(part.shape, list);
    }
    return [...byShape.entries()].flatMap(([shape, parts]) =>
      piecesOf(parts[0]).map((piece, i) => ({ key: `${shape}#${i}`, piece, parts })),
    );
  }, [compiled]);

  return (
    <>
      {batches.map((b) => (
        <Batch key={b.key} piece={b.piece} parts={b.parts} material={materials[b.piece.look]} onPick={onPick} />
      ))}
    </>
  );
}

function Batch({ piece, parts, material, onPick }: { piece: Piece; parts: Part[]; material: THREE.Material; onPick?: (part: Part | null) => void }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const invalidate = useThree((s) => s.invalidate);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    parts.forEach((part, i) => mesh.current!.setMatrixAt(i, m.fromArray(part.matrix)));
    mesh.current!.instanceMatrix.needsUpdate = true;
    mesh.current!.computeBoundingSphere();
    invalidate();
  }, [parts, invalidate]);
  useEffect(() => () => mesh.current?.dispose(), []);
  const small = piece.geometry.boundingSphere && piece.geometry.boundingSphere.radius < 12;
  return (
    <instancedMesh
      ref={mesh}
      args={[piece.geometry, material, parts.length]}
      castShadow={!small}
      receiveShadow
      onClick={(event) => {
        event.stopPropagation();
        if (event.instanceId !== undefined) onPick?.(parts[event.instanceId]);
      }}
    />
  );
}
