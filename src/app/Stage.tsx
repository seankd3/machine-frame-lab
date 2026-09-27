import { useEffect, useRef, useState } from "react";
import type { Part } from "../machine/assembly";
import type { Compiled } from "../machine/compile";
import { Viewport, type Jog } from "../render/Viewport";
import { money, sig } from "./format";

// The 3D machine with its axis jog controls and the inspector for a clicked part.

export function Stage({ compiled }: { compiled: Compiled }) {
  const { work } = compiled.machine;
  const [jog, setJog] = useState<Jog>({ x: 0, y: 0, z: 0 });
  const [picked, setPicked] = useState<Part | null>(null);
  const [running, setRunning] = useState(false);

  // Keep the jog inside travel and drop a pick whose part no longer exists.
  useEffect(() => {
    setJog((j) => ({
      x: Math.max(-work.x / 2, Math.min(work.x / 2, j.x)),
      y: Math.max(-work.y / 2, Math.min(work.y / 2, j.y)),
      z: Math.max(0, Math.min(work.z, j.z)),
    }));
    setPicked(null);
  }, [compiled, work.x, work.y, work.z]);

  // Demo run: a slow Lissajous sweep over the whole work envelope.
  const start = useRef(0);
  useEffect(() => {
    if (!running) return;
    let frame = 0;
    start.current = performance.now();
    const tick = (now: number) => {
      const t = (now - start.current) / 1000;
      setJog({
        x: (work.x / 2) * Math.sin(t * 0.9),
        y: (work.y / 2) * Math.sin(t * 0.37 + 0.6),
        z: (work.z / 2) * (1 - Math.cos(t * 1.3)),
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running, work.x, work.y, work.z]);

  const axes = [
    { a: "x" as const, min: -work.x / 2, max: work.x / 2 },
    { a: "y" as const, min: -work.y / 2, max: work.y / 2 },
    { a: "z" as const, min: 0, max: work.z },
  ];

  return (
    <main className="stage" aria-label="3D machine view">
      <Viewport compiled={compiled} jog={jog} picked={picked} onPick={setPicked} />

      <div className="jog" role="group" aria-label="Jog axes">
        {axes.map(({ a, min, max }) => (
          <label key={a} className="jog-axis">
            <span className="axis-tag">{a.toUpperCase()}</span>
            <input
              type="range"
              min={min}
              max={max}
              step={1}
              value={jog[a]}
              onChange={(e) => {
                setRunning(false);
                setJog((j) => ({ ...j, [a]: Number(e.target.value) }));
              }}
              style={{ ["--fill" as string]: `${((jog[a] - min) / (max - min || 1)) * 100}%` }}
            />
            <span className="num">{Math.round(a === "z" ? jog.z : jog[a] + (max - min) / 2)}</span>
          </label>
        ))}
        <button className="ghost small" onClick={() => setRunning((r) => !r)} aria-pressed={running}>
          {running ? "Stop" : "Run"}
        </button>
      </div>

      {picked ? (
        <div className="inspector">
          <div className="inspector-head">
            <strong>{picked.label}</strong>
            <button className="close" aria-label="Close" onClick={() => setPicked(null)}>
              ×
            </button>
          </div>
          <dl>
            <dt>Item</dt>
            <dd>{picked.item.name}</dd>
            <dt>Assembly</dt>
            <dd>{picked.group}</dd>
            {picked.cutMm && (
              <>
                <dt>Cut length</dt>
                <dd>{picked.cutMm} mm</dd>
              </>
            )}
            <dt>Mass</dt>
            <dd>{picked.massKg >= 1 ? `${sig(picked.massKg)} kg` : `${Math.round(picked.massKg * 1000)} g`}</dd>
            <dt>Price</dt>
            <dd>
              {picked.item.offer.price === null
                ? "no sourced price"
                : `${money(picked.item.offer.price, true)}${picked.item.offer.unit === "each" ? " each" : ` per ${picked.item.offer.unit}`}`}
            </dd>
            {picked.rides.length > 0 && (
              <>
                <dt>Moves with</dt>
                <dd>{picked.rides.map((r) => r.toUpperCase()).join(", ")}</dd>
              </>
            )}
          </dl>
          <a href={picked.item.offer.url} target="_blank" rel="noreferrer">
            {picked.item.offer.vendor} ↗
          </a>
        </div>
      ) : (
        <p className="stage-hint">Drag to orbit · scroll to zoom · click a part to inspect it</p>
      )}
    </main>
  );
}
