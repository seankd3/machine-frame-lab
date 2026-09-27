import { ContactShadows, GizmoHelper, GizmoViewport, Grid, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, N8AO, SMAA, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { Piece } from "../geometry/parts";
import type { Axis, Part } from "../machine/assembly";
import type { Compiled } from "../machine/compile";
import { createMaterials } from "./materials";

// The machine on a CAD floor grid: image-based light from soft boxes, one
// shadowed key light, contact shadows, ambient occlusion, an axis gizmo and
// eased standard views. Parts sharing a shape are one instanced draw per
// material look.

const geometryCache = new Map<string, Piece[]>();
const piecesOf = (part: Part) => {
  let pieces = geometryCache.get(part.shape);
  if (!pieces) {
    pieces = part.build();
    geometryCache.set(part.shape, pieces);
  }
  return pieces;
};

/** Axis positions relative to the compiled pose (mm): gantry and carriage centred, Z down. */
export type Jog = Record<Axis, number>;

/** A part's placement with the axes it rides moved to the jog position. */
function jogged(part: Part, jog: Jog, out: THREE.Matrix4) {
  out.fromArray(part.matrix);
  for (const axis of part.rides) {
    const e = out.elements;
    e[12 + "xyz".indexOf(axis)] += jog[axis];
  }
  return out;
}

export type ViewName = "iso" | "front" | "top" | "side";

/** Camera direction from the target for each standard view (Z up, front at -Y). */
const VIEW_DIRS: Record<ViewName, [number, number, number]> = {
  iso: [0.75, -0.95, 0.62],
  front: [0, -1, 0.1],
  top: [0, -0.02, 1],
  side: [1, 0, 0.1],
};

interface ViewportProps {
  compiled: Compiled;
  jog: Jog;
  picked: Part | null;
  /** A standard view request; bump `n` to re-apply the same view. */
  view: { name: ViewName; n: number };
  onPick?: (part: Part | null) => void;
}

export function Viewport({ compiled, jog, picked, view, onPick }: ViewportProps) {
  const { outer } = compiled.d;
  const radius = Math.hypot(outer.x, outer.y, outer.z) / 1000;
  const target: [number, number, number] = [0, 0, outer.z / 2600];
  const start = VIEW_DIRS.iso.map((v) => v * radius) as [number, number, number];
  return (
    <Canvas
      shadows="percentage"
      style={{ position: "absolute", inset: 0 }}
      dpr={[1, 2]}
      gl={{ antialias: false, preserveDrawingBuffer: true }}
      camera={{ fov: 30, near: 0.02, far: 60, up: [0, 0, 1], position: start }}
      onPointerMissed={() => onPick?.(null)}
    >
      <color attach="background" args={["#0f1114"]} />
      <Studio radius={radius} />
      <group scale={0.001} position={[0, -compiled.d.baseL / 2000, 0]}>
        <Machine compiled={compiled} jog={jog} onPick={onPick} />
        {picked && <Highlight part={picked} jog={jog} />}
      </group>
      <ContactShadows position={[0, 0, 0.001]} rotation={[Math.PI / 2, 0, 0]} scale={radius * 3} resolution={1024} blur={2.4} opacity={0.7} far={1.2} />
      <Grid
        position={[0, 0, 0.0004]}
        rotation={[Math.PI / 2, 0, 0]}
        infiniteGrid
        cellSize={0.05}
        cellThickness={0.6}
        cellColor="#20252b"
        sectionSize={0.25}
        sectionThickness={1}
        sectionColor="#323941"
        fadeDistance={radius * 5}
        fadeStrength={2.5}
      />
      <OrbitControls makeDefault target={target} enableDamping dampingFactor={0.12} maxPolarAngle={Math.PI * 0.495} minDistance={0.3} maxDistance={radius * 4} />
      <CameraRig view={view} radius={radius} target={target} />
      <EffectComposer multisampling={0}>
        <N8AO aoRadius={0.12} intensity={2.2} distanceFalloff={0.6} quality="high" />
        <SMAA />
        <ToneMapping mode={ToneMappingMode.AGX} />
      </EffectComposer>
      <GizmoHelper alignment="top-right" margin={[58, 58]}>
        <GizmoViewport axisColors={["#ff5c5c", "#4fd67a", "#4ea8ff"]} labelColor="#0f1114" axisHeadScale={0.9} />
      </GizmoHelper>
    </Canvas>
  );
}

/** Eases the camera and orbit target to a standard view when one is requested. */
function CameraRig({ view, radius, target }: { view: ViewportProps["view"]; radius: number; target: [number, number, number] }) {
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3; update(): void } | null;
  const camera = useThree((s) => s.camera);
  const move = useRef<{ from: THREE.Vector3; to: THREE.Vector3; fromT: THREE.Vector3; toT: THREE.Vector3; t: number } | null>(null);

  useEffect(() => {
    if (!controls || view.n === 0) return;
    const dir = new THREE.Vector3(...VIEW_DIRS[view.name]).normalize();
    const to = new THREE.Vector3(...target).addScaledVector(dir, radius * (view.name === "iso" ? 1.36 : 1.75));
    move.current = { from: camera.position.clone(), to, fromT: controls.target.clone(), toT: new THREE.Vector3(...target), t: 0 };
    // Only a new request moves the camera, not a resize of the machine.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, controls]);

  useFrame((_, dt) => {
    const m = move.current;
    if (!m || !controls) return;
    m.t = Math.min(1, m.t + dt / 0.45);
    const e = 1 - (1 - m.t) ** 3;
    camera.position.lerpVectors(m.from, m.to, e);
    controls.target.lerpVectors(m.fromT, m.toT, e);
    controls.update();
    if (m.t >= 1) move.current = null;
  });
  return null;
}

function Studio({ radius }: { radius: number }) {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.9;
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
      intensity={1.9}
      position={[radius * 0.8, -radius * 1.2, radius * 2.4]}
      shadow-mapSize={[4096, 4096]}
      shadow-bias={-0.0002}
      shadow-normalBias={0.02}
    />
  );
}

function Machine({ compiled, jog, onPick }: { compiled: Compiled; jog: Jog; onPick?: (part: Part | null) => void }) {
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
        <Batch key={b.key} piece={b.piece} parts={b.parts} jog={jog} material={materials[b.piece.look]} onPick={onPick} />
      ))}
    </>
  );
}

interface BatchProps {
  piece: Piece;
  parts: Part[];
  jog: Jog;
  material: THREE.Material;
  onPick?: (part: Part | null) => void;
}

function Batch({ piece, parts, jog, material, onPick }: BatchProps) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const invalidate = useThree((s) => s.invalidate);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    parts.forEach((part, i) => mesh.current!.setMatrixAt(i, jogged(part, jog, m)));
    mesh.current!.instanceMatrix.needsUpdate = true;
    mesh.current!.computeBoundingSphere();
    invalidate();
  }, [parts, jog, invalidate]);
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

const highlightMaterial = new THREE.MeshBasicMaterial({ color: "#4d9cff", transparent: true, opacity: 0.45, depthTest: false });

/** The picked part drawn again on top, tinted, so it reads through anything in front. */
function Highlight({ part, jog }: { part: Part; jog: Jog }) {
  const matrix = useMemo(() => jogged(part, jog, new THREE.Matrix4()), [part, jog]);
  const pieces = piecesOf(part);
  return (
    <group matrix={matrix} matrixAutoUpdate={false}>
      {pieces.map((piece, i) => (
        <mesh key={i} geometry={piece.geometry} material={highlightMaterial} renderOrder={10} />
      ))}
    </group>
  );
}
