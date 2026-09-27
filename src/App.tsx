import { useMemo, useRef, useState } from "react";
import { InputPanel } from "./app/InputPanel";
import { OutputPanel } from "./app/OutputPanel";
import { Stage } from "./app/Stage";
import { useAnalysis, useMachine } from "./app/hooks";
import { money } from "./app/format";
import { bom as billOf } from "./machine/bom";
import { compile, type Compiled } from "./machine/compile";

// Inputs on the left, the machine in the middle, what it will do and cost on
// the right. The 3D model and the BOM compile on every edit; the frame
// analysis follows from a worker a moment later.

export default function App() {
  const { machine, set, replace } = useMachine();
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
  const { result, pending } = useAnalysis(machine);
  const [copied, setCopied] = useState(false);

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      window.prompt("Copy this link", window.location.href);
    }
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo" aria-hidden>
            ◧
          </span>
          <div>
            <h1>Machine Frame Lab</h1>
            <p>Design a DIY CNC router from parts you can buy, and see how stiff it is before you do.</p>
          </div>
        </div>
        <div className="topbar-stats">
          <span>
            <b>{money(bom.total)}</b> priced parts
          </span>
          <span>
            <b>
              {machine.work.x} × {machine.work.y} × {machine.work.z}
            </b>{" "}
            mm travel
          </span>
          <button className="ghost" onClick={share}>
            {copied ? "Link copied" : "Copy share link"}
          </button>
        </div>
      </header>
      <InputPanel machine={machine} set={set} load={replace} />
      <Stage compiled={compiled} />
      <OutputPanel machine={machine} result={result} pending={pending} bom={bom} />
    </div>
  );
}
