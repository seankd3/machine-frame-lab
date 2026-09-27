import { useMemo, useRef, useState } from "react";
import { InputPanel } from "./app/InputPanel";
import { OutputPanel } from "./app/OutputPanel";
import { Stage } from "./app/Stage";
import { useAnalysis, useDesign, useExplore } from "./app/hooks";
import { money, sig } from "./app/format";
import { PRICES_READ } from "./catalog/types";
import { bom as billOf } from "./machine/bom";
import { compile, type Compiled } from "./machine/compile";
import { formatMachine, sameDesign } from "./machine/document";
import { presets } from "./machine/presets";
import { MATERIALS, PACES, score } from "./machine/requirements";

// Parameters on the left, the machine in the middle, what it will do and cost
// on the right. The 3D model and the BOM compile on every edit; the frame
// analysis follows from a worker a moment later.

/** Stable six-digit code for a design: FNV-1a over its share-link form. */
function designId(text: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(16).toUpperCase().padStart(8, "0").slice(0, 6);
}

export default function App() {
  const { machine, req, set, load, setReq } = useDesign();
  const lastGood = useRef<Compiled | null>(null);
  const compiled = useMemo(() => {
    try {
      lastGood.current = compile(machine);
    } catch (e) {
      console.error(e);
    }
    return lastGood.current!;
  }, [machine]);
  const bom = useMemo(() => billOf(compiled), [compiled]);
  const massKg = useMemo(() => compiled.asm.parts.reduce((s, p) => s + p.massKg, 0), [compiled]);
  const { result, pending } = useAnalysis(machine);
  const ex = useExplore(machine);
  const goals = useMemo(
    () => ({ deflectionUm: MATERIALS[req.material].deflectionUm, rapidMmMin: PACES[req.pace].rapidMmMin, accelMs2: PACES[req.pace].accelMs2, budget: req.budget, weld: req.weld }),
    [req],
  );
  const [copied, setCopied] = useState(false);

  const text = formatMachine(machine);
  const preset = presets.find((p) => sameDesign(p.machine, machine));
  const targets = useMemo(
    () => (result?.ok ? score(req, { machine, perf: result.analysis.perf, modes: result.analysis.modes, bom }) : null),
    [req, machine, result, bom],
  );
  const misses = targets?.filter((t) => !t.pass).length ?? 0;
  const partCount = compiled.asm.parts.filter((p) => p.shape !== "none").length;

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      window.prompt("Copy this link", window.location.href);
    }
  };

  const stats = result?.ok ? result.analysis.stats : null;
  const solver = pending ? "busy" : result && !result.ok ? "bad" : "ok";

  return (
    <div className="app">
      <header className="titlebar">
        <div className="brand">
          <svg className="mark" viewBox="0 0 20 20" aria-hidden>
            <path d="M2 2h16v16H2z" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M6 6h3v8H6zM11 6h3v3h-3z" fill="currentColor" />
          </svg>
          <span className="brand-name">Machine Frame Lab</span>
        </div>
        <div className="doc">
          <span className="doc-kind">Gantry router</span>
          <span className="doc-name">{preset ? preset.name : "Custom design"}</span>
          <span className="doc-id">MFL-{designId(text)}</span>
          {targets && (
            <span className={`spec-chip ${misses ? "miss" : "pass"}`}>{misses ? `${misses} requirement${misses > 1 ? "s" : ""} missed` : "Meets spec"}</span>
          )}
        </div>
        <dl className="readouts">
          <div>
            <dt>Envelope</dt>
            <dd>
              {machine.work.x}×{machine.work.y}×{machine.work.z}
              <small>mm</small>
            </dd>
          </div>
          <div>
            <dt>Mass</dt>
            <dd>
              {sig(massKg)}
              <small>kg</small>
            </dd>
          </div>
          <div>
            <dt>Parts</dt>
            <dd>
              {money(bom.total)}
              {bom.unpriced > 0 && <small>+{bom.unpriced}</small>}
            </dd>
          </div>
        </dl>
        <button className="btn" onClick={share}>
          {copied ? "Link copied" : "Copy link"}
        </button>
      </header>

      <InputPanel machine={machine} req={req} set={set} load={load} setReq={setReq} />
      <Stage compiled={compiled} />
      <OutputPanel machine={machine} req={req} targets={targets} result={result} pending={pending} bom={bom} ex={ex} goals={goals} apply={set} />

      <footer className="statusbar" aria-live="polite">
        <span className={`state ${solver}`}>
          <i />
          {solver === "busy" ? "Solving" : solver === "bad" ? "Solve failed" : "Solved"}
        </span>
        {stats && (
          <span>
            FE {stats.nodes.toLocaleString()} nodes · {stats.elements.toLocaleString()} elements · {stats.dof.toLocaleString()} DOF · {Math.round(stats.ms)} ms
          </span>
        )}
        <span>{partCount} parts placed</span>
        <span className="spacer" />
        <span>Units mm · N · kg</span>
        <span>Prices USD · read {PRICES_READ}</span>
      </footer>
    </div>
  );
}
