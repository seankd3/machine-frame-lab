import { useMemo, useState } from "react";
import { rank, type Goals, type Suggestion } from "../machine/explore";
import type { Target } from "../machine/requirements";
import { money, sig } from "./format";
import type { Exploration } from "./hooks";

// What to change next: the best single changes for each missed target, and
// the whole one-change trade space as a cost-versus-deflection chart.

interface Props {
  ex: Exploration;
  goals: Goals;
  targets: Target[] | null;
  apply: (key: string, value: string | number) => void;
}

const signed = (usd: number) => (Math.abs(usd) < 0.5 ? "±$0" : `${usd > 0 ? "+" : "−"}${money(Math.abs(usd))}`);

function Progress({ ex }: { ex: Exploration }) {
  if (!ex.running) return <span className="meta mono">{ex.variants.length} variants</span>;
  return (
    <span className="meta mono explore-progress">
      <i style={{ width: `${ex.total ? (ex.done / ex.total) * 100 : 0}%` }} />
      {ex.total ? `${ex.done}/${ex.total}` : "starting"}
    </span>
  );
}

function Row({ s, effect, apply }: { s: Suggestion; effect: string; apply: Props["apply"] }) {
  return (
    <li className="suggestion">
      <span className="sg-body">
        <span className="sg-label">{s.label}</span>
        <span className="sg-effect mono">{effect}</span>
      </span>
      <span className={`sg-cost mono ${s.dCost > 0.5 ? "up" : s.dCost < -0.5 ? "down" : ""}`} title={s.priceUnknown ? "Adds parts with no sourced price" : undefined}>
        {signed(s.dCost)}
        {s.priceUnknown ? "*" : ""}
      </span>
      <button className="btn sg-apply" onClick={() => apply(s.key, s.value)}>
        Apply
      </button>
    </li>
  );
}

/** The top fixes for whatever the design currently misses, plus savings. */
export function Suggestions({ ex, goals, targets, apply }: Props) {
  const r = useMemo(() => (ex.base ? rank(ex.base, ex.variants, goals) : null), [ex.base, ex.variants, goals]);
  const miss = new Set(targets?.filter((t) => !t.pass).map((t) => t.key));
  const groups: Array<{ title: string; items: Suggestion[]; effect: (s: Suggestion) => string }> = [];
  if (r && ex.base) {
    const base = ex.base;
    const defl = (s: Suggestion) => `δ ${sig(base.deflectionUm)} → ${sig(s.quick.deflectionUm)} µm`;
    const fast = (s: Suggestion) => `rapids ${(base.rapidMmMin / 1000).toFixed(1)} → ${(s.quick.rapidMmMin / 1000).toFixed(1)} m/min`;
    if (miss.has("deflection") || miss.has("mode") || !miss.size) groups.push({ title: miss.has("deflection") ? "Stiffen" : "Stiffer for the money", items: r.stiffer.slice(0, 4), effect: defl });
    if (miss.has("rapid") || miss.has("accel")) groups.push({ title: "Speed up", items: r.faster.slice(0, 3), effect: fast });
    if (r.cheaper.length) groups.push({ title: miss.has("budget") ? "Cut cost" : "Save money", items: r.cheaper.slice(0, 3), effect: (s) => `δ ${sig(s.quick.deflectionUm)} µm, keeps what it meets` });
  }

  return (
    <section className="block">
      <header className="block-head">
        <h3>Suggested changes</h3>
        <Progress ex={ex} />
      </header>
      {!r && <p className="note">Trying every single change to this design…</p>}
      {groups.map((g) =>
        g.items.length ? (
          <div key={g.title} className="sg-group">
            <span className="sg-title">{g.title}</span>
            <ul className="suggestions">
              {g.items.map((s) => (
                <Row key={`${s.key}=${s.value}`} s={s} effect={g.effect(s)} apply={apply} />
              ))}
            </ul>
          </div>
        ) : (
          <p key={g.title} className="note">
            {g.title}: no single change helps{ex.running ? " yet" : ""}. {ex.running ? "" : "Two or more changes together may be needed."}
          </p>
        ),
      )}
      {r && <p className="note">One change at a time, static solve; * adds parts without a sourced price, so the cost change is uncertain.</p>}
    </section>
  );
}

/** Every one-change variant on cost and deflection, with the targets drawn in. */
export function TradeSpace({ ex, goals, apply }: Props) {
  const [hover, setHover] = useState<Suggestion | null>(null);
  const r = useMemo(() => (ex.base ? rank(ex.base, ex.variants, goals) : null), [ex.base, ex.variants, goals]);
  if (!ex.base || !r) return <p className="empty">Trying every single change to this design…</p>;

  const W = 360;
  const H = 250;
  const pad = { l: 44, r: 12, t: 12, b: 34 };
  const pts = r.all;
  const costs = [ex.base.cost, ...pts.map((p) => p.quick.cost), goals.budget];
  const defl = [ex.base.deflectionUm, ...pts.map((p) => p.quick.deflectionUm), goals.deflectionUm];
  const [c0, c1] = [Math.min(...costs) * 0.95, Math.max(...costs) * 1.03];
  // Keep the scale on the useful region: very soft variants sit clipped on the top edge.
  const ceiling = Math.max(ex.base.deflectionUm, goals.deflectionUm) * 4;
  const [d0, d1] = [Math.min(...defl) * 0.8, Math.min(Math.max(...defl) * 1.25, ceiling)];
  const off = pts.filter((p) => p.quick.deflectionUm > d1).length;
  const x = (c: number) => pad.l + ((c - c0) / (c1 - c0)) * (W - pad.l - pad.r);
  const y = (d: number) => pad.t + (1 - (Math.log(Math.min(d, d1)) - Math.log(d0)) / (Math.log(d1) - Math.log(d0))) * (H - pad.t - pad.b);
  const yTicks = [5, 10, 20, 50, 100, 200, 500, 1000, 2000].filter((t) => t >= d0 && t <= d1);
  const step = [100, 250, 500, 1000, 2500, 5000].find((s) => (c1 - c0) / s <= 5) ?? 10000;
  const xTicks = Array.from({ length: 12 }, (_, i) => Math.ceil(c0 / step) * step + i * step).filter((t) => t <= c1);
  const tipLeft = hover ? Math.min(W - 170, Math.max(0, x(hover.quick.cost) - 80)) : 0;

  return (
    <div className="pane-body">
      <section className="block">
        <header className="block-head">
          <h3>Trade space</h3>
          <Progress ex={ex} />
        </header>
        <p className="note">Each dot is this design with one thing changed. Down is stiffer, left is cheaper; the dashed lines are your targets. Click a dot to apply it.</p>
        <div className="chart" style={{ position: "relative" }}>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Cost against tool deflection for every one-change variant">
            {yTicks.map((t) => (
              <g key={`y${t}`}>
                <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="grid" />
                <text x={pad.l - 6} y={y(t) + 3} className="tick" textAnchor="end">
                  {t}
                </text>
              </g>
            ))}
            {xTicks.map((t) => (
              <g key={`x${t}`}>
                <line y1={pad.t} y2={H - pad.b} x1={x(t)} x2={x(t)} className="grid" />
                <text x={x(t)} y={H - pad.b + 14} className="tick" textAnchor="middle">
                  {t >= 1000 ? `$${t / 1000}k` : `$${t}`}
                </text>
              </g>
            ))}
            <text x={pad.l - 34} y={pad.t + 2} className="axis-title">
              δ µm
            </text>
            <text x={W - pad.r} y={H - 4} className="axis-title" textAnchor="end">
              parts cost
            </text>
            <line x1={pad.l} x2={W - pad.r} y1={y(goals.deflectionUm)} y2={y(goals.deflectionUm)} className="goal" />
            <text x={W - pad.r - 2} y={y(goals.deflectionUm) - 4} className="goal-label" textAnchor="end">
              δ target {goals.deflectionUm} µm
            </text>
            {goals.budget <= c1 && (
              <>
                <line y1={pad.t} y2={H - pad.b} x1={x(goals.budget)} x2={x(goals.budget)} className="goal" />
                <text x={x(goals.budget) - 4} y={pad.t + 10} className="goal-label" textAnchor="end">
                  budget
                </text>
              </>
            )}
            {pts.map((p) => (
              <circle
                key={`${p.key}=${p.value}`}
                cx={x(p.quick.cost)}
                cy={y(p.quick.deflectionUm)}
                r={hover === p ? 6 : 4}
                className={`dot ${p.priceUnknown ? "hollow" : ""} ${hover === p ? "hot" : ""}`}
                onMouseEnter={() => setHover(p)}
                onMouseLeave={() => setHover(null)}
                onClick={() => apply(p.key, p.value)}
              />
            ))}
            <circle cx={x(ex.base.cost)} cy={y(ex.base.deflectionUm)} r={6} className="dot current" />
            <text x={x(ex.base.cost) + 9} y={y(ex.base.deflectionUm) + 3} className="current-label">
              current
            </text>
          </svg>
          {hover && (
            <div className="tip" style={{ left: tipLeft, top: Math.max(0, (y(hover.quick.deflectionUm) / H) * 100 - 30) + "%" }}>
              <strong>{hover.label}</strong>
              <span className="mono">
                {signed(hover.dCost)}
                {hover.priceUnknown ? " (uncertain)" : ""} · δ {sig(hover.quick.deflectionUm)} µm
              </span>
              <span className="mono dim">rapids {(hover.quick.rapidMmMin / 1000).toFixed(1)} m/min · {sig(hover.quick.massKg)} kg</span>
            </div>
          )}
        </div>
        <p className="note">
          Filled dots are fully priced; hollow ones buy parts with no sourced price, so their cost is a floor.
          {off > 0 ? ` ${off} much softer variant${off > 1 ? "s sit" : " sits"} clipped on the top edge.` : ""}
        </p>
      </section>
      <Table rows={r.all} base={ex.base.deflectionUm} apply={apply} />
    </div>
  );
}

/** The chart's data as a sortable-by-deflection table. */
function Table({ rows, base, apply }: { rows: Suggestion[]; base: number; apply: Props["apply"] }) {
  const sorted = [...rows].sort((a, b) => a.quick.deflectionUm - b.quick.deflectionUm);
  return (
    <section className="block">
      <header className="block-head">
        <h3>All variants</h3>
        <span className="meta">stiffest first</span>
      </header>
      <table className="data variants">
        <thead>
          <tr>
            <th>Change</th>
            <th className="r">δ µm</th>
            <th className="r">Cost</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((s) => (
            <tr key={`${s.key}=${s.value}`} onClick={() => apply(s.key, s.value)} className="clickable">
              <td className="name">{s.label}</td>
              <td className={`r mono ${s.quick.deflectionUm < base ? "good-text" : "dim"}`}>{sig(s.quick.deflectionUm)}</td>
              <td className="r mono dim">
                {signed(s.dCost)}
                {s.priceUnknown ? "*" : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
