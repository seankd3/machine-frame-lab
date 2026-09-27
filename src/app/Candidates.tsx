import type { Pick as DesignPick } from "../machine/design";
import type { Machine } from "../machine/document";
import type { Goals } from "../machine/explore";
import { money, sig } from "./format";
import type { DesignSearch } from "./hooks";

// The search's answer, over the viewport: up to three designs that meet the
// requirements, or the nearest miss and what it misses.

const KIND = {
  cheapest: { title: "Cheapest that passes", blurb: "Meets every target for the least money." },
  balanced: { title: "Balanced", blurb: "30 % stiffness headroom, inside the budget." },
  stiffest: { title: "Stiffest in budget", blurb: "The stiffest design the budget buys." },
} as const;

interface Props {
  search: DesignSearch;
  goals: Goals;
  budget: number;
  preview: Machine | null;
  onPreview: (m: Machine | null) => void;
  onUse: (m: Machine) => void;
  onCancel: () => void;
  onClose: () => void;
}

export function CandidateSheet({ search, goals, budget, preview, onPreview, onUse, onCancel, onClose }: Props) {
  if (search.status === "idle") return null;

  if (search.status === "running") {
    const { evaluated, finished, total } = search.progress;
    return (
      <div className="sheet running" role="status">
        <div className="sheet-head">
          <span className="pane-title">Searching</span>
          <span className="sheet-meta mono">
            {evaluated.toLocaleString()} designs evaluated · {finished}/{total} starting points done
          </span>
          <button className="btn" onClick={onCancel}>
            Cancel
          </button>
        </div>
        <div className="scan">
          <i style={{ width: `${Math.max(4, (finished / Math.max(1, total)) * 100)}%` }} />
        </div>
        <p className="sheet-note">
          Walking the parts catalog from your design and each preset: meeting every target first, then cutting cost, then spending what is left on
          stiffness.
        </p>
      </div>
    );
  }

  const { result, ms } = search;
  const summary = result.picks.length
    ? `${result.picks.length} design${result.picks.length > 1 ? "s" : ""} meet${result.picks.length > 1 ? "" : "s"} every requirement`
    : "No design met every requirement";

  return (
    <div className="sheet" role="dialog" aria-label="Candidate designs">
      <div className="sheet-head">
        <span className="pane-title">Candidates</span>
        <span className="sheet-summary">{summary}</span>
        <span className="sheet-meta mono">
          {result.evaluated.toLocaleString()} designs · {(ms / 1000).toFixed(1)} s
        </span>
        <button className="icon-btn" aria-label="Close candidates" onClick={onClose}>
          ✕
        </button>
      </div>
      {result.overBudget && (
        <p className="banner warn">
          <span className="code">WARN</span>
          The cheapest passing design is {money(result.picks[0].q.cost - budget)} over your {money(budget)} budget.
        </p>
      )}
      <div className="cards">
        {result.picks.map((p) => (
          <Card key={p.kind} p={p} goals={goals} budget={budget} previewing={preview === p.machine} onPreview={onPreview} onUse={onUse} />
        ))}
        {!result.picks.length && result.closest && <Closest p={result.closest} goals={goals} budget={budget} previewing={preview === result.closest.machine} onPreview={onPreview} onUse={onUse} />}
        {result.picks.length === 1 && (
          <p className="sheet-note single">
            Only one design passes. From it, every stiffening step either adds enough moving mass to drop the first mode below {sig(goals.minModeHz)} Hz or
            breaks the budget.
          </p>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, target, pass }: { label: string; value: string; target: string; pass: boolean }) {
  return (
    <div className={`metric ${pass ? "pass" : "miss"}`}>
      <span className="metric-label">{label}</span>
      <span className="metric-value mono">{value}</span>
      <span className="metric-target mono">{target}</span>
    </div>
  );
}

function Metrics({ p, goals, budget }: { p: DesignPick; goals: Goals; budget: number }) {
  const f1 = p.f1 ?? 0;
  return (
    <div className="metrics">
      <Metric label="δ" value={`${sig(p.q.deflectionUm)} µm`} target={`≤ ${goals.deflectionUm}`} pass={p.q.deflectionUm <= goals.deflectionUm} />
      <Metric label="f₁" value={`${f1.toFixed(1)} Hz`} target={`≥ ${goals.minModeHz}`} pass={f1 >= goals.minModeHz * 0.98} />
      <Metric label="Rapid" value={`${(p.q.rapidMmMin / 1000).toFixed(1)} m/min`} target={`≥ ${goals.rapidMmMin / 1000}`} pass={p.q.rapidMmMin >= goals.rapidMmMin} />
      <Metric label="Accel" value={`${p.q.accelMs2.toFixed(1)} m/s²`} target={`≥ ${goals.accelMs2}`} pass={p.q.accelMs2 >= goals.accelMs2} />
      <Metric label="Cost" value={money(p.q.cost)} target={`≤ ${money(budget)}`} pass={p.q.cost <= budget} />
      <Metric label="Mass" value={`${sig(p.q.massKg)} kg`} target="" pass />
    </div>
  );
}

interface CardProps {
  p: DesignPick;
  goals: Goals;
  budget: number;
  previewing: boolean;
  onPreview: Props["onPreview"];
  onUse: Props["onUse"];
}

function Actions({ p, previewing, onPreview, onUse }: Pick<CardProps, "p" | "previewing" | "onPreview" | "onUse">) {
  return (
    <div className="card-actions">
      <button className={`btn ${previewing ? "on" : ""}`} onClick={() => onPreview(previewing ? null : p.machine)} aria-pressed={previewing}>
        {previewing ? "Previewing" : "Preview"}
      </button>
      <button className="btn primary" onClick={() => onUse(p.machine)}>
        Use this design
      </button>
    </div>
  );
}

function Changes({ p }: { p: DesignPick }) {
  return (
    <div className="changes">
      <span className="changes-head">
        {p.steps.length ? `${p.steps.length} change${p.steps.length > 1 ? "s" : ""} from ${p.template.toLowerCase()}` : `Unchanged ${p.template.toLowerCase()}`}
      </span>
      <ul>
        {p.steps.slice(0, 6).map((s) => (
          <li key={s} className="mono">
            {s}
          </li>
        ))}
        {p.steps.length > 6 && <li className="dim">+ {p.steps.length - 6} more</li>}
      </ul>
    </div>
  );
}

function Card({ p, goals, budget, previewing, onPreview, onUse }: CardProps) {
  const k = KIND[p.kind];
  return (
    <article className={`card ${previewing ? "previewing" : ""}`}>
      <header>
        <span className="card-kind">{k.title}</span>
        <span className="card-cost mono">{money(p.q.cost)}</span>
      </header>
      <p className="card-blurb">{k.blurb}</p>
      <Metrics p={p} goals={goals} budget={budget} />
      <Changes p={p} />
      <Actions p={p} previewing={previewing} onPreview={onPreview} onUse={onUse} />
    </article>
  );
}

function Closest({ p, goals, budget, previewing, onPreview, onUse }: CardProps) {
  const misses: string[] = [];
  if (p.q.deflectionUm > goals.deflectionUm) misses.push(`stiffness (${sig(p.q.deflectionUm)} µm vs ${goals.deflectionUm})`);
  if ((p.f1 ?? 0) < goals.minModeHz * 0.98) misses.push(`first mode (${(p.f1 ?? 0).toFixed(1)} Hz vs ${goals.minModeHz})`);
  if (p.q.rapidMmMin < goals.rapidMmMin) misses.push(`rapids (${(p.q.rapidMmMin / 1000).toFixed(1)} vs ${goals.rapidMmMin / 1000} m/min)`);
  if (p.q.accelMs2 < goals.accelMs2) misses.push(`acceleration (${p.q.accelMs2.toFixed(1)} vs ${goals.accelMs2} m/s²)`);
  return (
    <article className={`card closest ${previewing ? "previewing" : ""}`}>
      <header>
        <span className="card-kind">Closest design</span>
        <span className="card-cost mono">{money(p.q.cost)}</span>
      </header>
      <p className="card-blurb">Misses {misses.join(", ")}. Relax that requirement (a softer material, a slower pace, a smaller envelope or less gantry clearance) and search again.</p>
      <Metrics p={p} goals={goals} budget={budget} />
      <Changes p={p} />
      <Actions p={p} previewing={previewing} onPreview={onPreview} onUse={onUse} />
    </article>
  );
}

/** First visit: what the tool does and where to start. */
export function Welcome({ onFind, onDismiss }: { onFind: () => void; onDismiss: () => void }) {
  return (
    <div className="welcome" role="dialog" aria-label="Getting started">
      <span className="pane-title">Machine Frame Lab</span>
      <h2>Design a CNC router backwards from what it has to do.</h2>
      <ol>
        <li>
          <b>01</b>
          <span>
            Set your <em>requirements</em> on the left: the material you will cut, the work area, a budget, the pace you want, and whether you can
            weld.
          </span>
        </li>
        <li>
          <b>02</b>
          <span>
            <em>Find designs.</em> The search walks a catalog of real, priced parts and returns the cheapest design that passes, a balanced one, and
            the stiffest your budget buys.
          </span>
        </li>
        <li>
          <b>03</b>
          <span>
            <em>Refine.</em> Every readout is checked against your targets, and the suggestions show what each single change costs and buys.
          </span>
        </li>
      </ol>
      <div className="welcome-actions">
        <button className="btn primary" onClick={onFind}>
          Find designs for these requirements
        </button>
        <button className="btn" onClick={onDismiss}>
          Explore the sample design
        </button>
      </div>
    </div>
  );
}
