import { useEffect, useRef, useState } from "react";
import type { Part } from "../machine/assembly";
import type { Compiled } from "../machine/compile";
import { Viewport, type Jog, type ViewName } from "../render/Viewport";
import { money, sig } from "./format";

// The 3D machine with standard views, a digital readout that jogs the axes,
// and a property sheet for the clicked part.

const VIEWS: Array<{ name: ViewName; label: string; key: string }> = [
  { name: "iso", label: "Iso", key: "0" },
  { name: "front", label: "Front", key: "1" },
  { name: "top", label: "Top", key: "7" },
  { name: "side", label: "Side", key: "3" },
];

export function Stage({ compiled }: { compiled: Compiled }) {
  const { work } = compiled.machine;
  const [jog, setJog] = useState<Jog>({ x: 0, y: 0, z: 0 });
  const [picked, setPicked] = useState<Part | null>(null);
  const [running, setRunning] = useState(false);
  const [view, setView] = useState<{ name: ViewName; n: number }>({ name: "iso", n: 0 });

  // Keep the jog inside travel and drop a pick whose part no longer exists.
  useEffect(() => {
    setJog((j) => ({
      x: Math.max(-work.x / 2, Math.min(work.x / 2, j.x)),
      y: Math.max(-work.y / 2, Math.min(work.y / 2, j.y)),
      z: Math.max(0, Math.min(work.z, j.z)),
    }));
    setPicked(null);
  }, [compiled, work.x, work.y, work.z]);

  // Numpad-style view keys, as in most CAD packages.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      const v = VIEWS.find((v) => v.key === e.key);
      if (v) setView((cur) => ({ name: v.name, n: cur.n + 1 }));
      if (e.key === "Escape") setPicked(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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

  // Machine coordinates: X and Y from the front-left corner of travel, Z up from the table.
  const axes = [
    { a: "x" as const, min: -work.x / 2, max: work.x / 2, pos: jog.x + work.x / 2 },
    { a: "y" as const, min: -work.y / 2, max: work.y / 2, pos: jog.y + work.y / 2 },
    { a: "z" as const, min: 0, max: work.z, pos: jog.z },
  ];

  return (
    <main className="stage" aria-label="3D machine view">
      <Viewport compiled={compiled} jog={jog} picked={picked} view={view} onPick={setPicked} />
      <span className="crop tl" />
      <span className="crop tr" />
      <span className="crop bl" />
      <span className="crop br" />

      <div className="toolbar">
        <span className="toolbar-label">Persp · Shaded</span>
        <div className="segmented mini" role="group" aria-label="Standard views">
          {VIEWS.map((v) => (
            <button key={v.name} className={view.name === v.name ? "on" : ""} title={`${v.label} view (${v.key})`} onClick={() => setView((cur) => ({ name: v.name, n: cur.n + 1 }))}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {picked && (
        <div className="inspector" role="dialog" aria-label="Selected part">
          <div className="inspector-head">
            <span className="pane-title">Selection</span>
            <button className="icon-btn" aria-label="Clear selection" onClick={() => setPicked(null)}>
              ✕
            </button>
          </div>
          <div className="inspector-name">{picked.label}</div>
          <dl className="props">
            <dt>Item</dt>
            <dd>{picked.item.name}</dd>
            <dt>P/N</dt>
            <dd className="mono">{picked.item.sku}</dd>
            <dt>Assy</dt>
            <dd>{picked.group}</dd>
            {picked.cutMm && (
              <>
                <dt>Length</dt>
                <dd className="mono">{picked.cutMm} mm</dd>
              </>
            )}
            <dt>Mass</dt>
            <dd className="mono">{picked.massKg >= 1 ? `${sig(picked.massKg)} kg` : `${Math.round(picked.massKg * 1000)} g`}</dd>
            <dt>Price</dt>
            <dd className="mono">
              {picked.item.offer.price === null
                ? "—"
                : `${money(picked.item.offer.price, true)}${picked.item.offer.unit === "each" ? "" : `/${picked.item.offer.unit}`}`}
            </dd>
            <dt>Rides</dt>
            <dd className="mono">{picked.rides.length ? picked.rides.map((r) => r.toUpperCase()).join(" · ") : "fixed"}</dd>
          </dl>
          <a className="inspector-link" href={picked.item.offer.url} target="_blank" rel="noreferrer">
            {picked.item.offer.vendor} ↗
          </a>
        </div>
      )}

      <div className="dro" role="group" aria-label="Axis positions">
        {axes.map(({ a, min, max, pos }) => (
          <label key={a} className="dro-axis">
            <span className="axis-tag">{a.toUpperCase()}</span>
            <span className="dro-value mono">{pos.toFixed(1).padStart(6, " ")}</span>
            <input
              type="range"
              aria-label={`${a.toUpperCase()} position`}
              min={min}
              max={max}
              step={1}
              value={a === "z" ? jog.z : jog[a]}
              onChange={(e) => {
                setRunning(false);
                setJog((j) => ({ ...j, [a]: Number(e.target.value) }));
              }}
              style={{ ["--fill" as string]: `${(((a === "z" ? jog.z : jog[a]) - min) / (max - min || 1)) * 100}%` }}
            />
          </label>
        ))}
        <button className={`btn ${running ? "on" : ""}`} onClick={() => setRunning((r) => !r)} aria-pressed={running}>
          {running ? "■ Stop" : "▶ Run"}
        </button>
      </div>

      {!picked && <p className="stage-hint">Drag orbit · Right-drag pan · Wheel zoom · Click select · 0 1 3 7 views</p>}
    </main>
  );
}
