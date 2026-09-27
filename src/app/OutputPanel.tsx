import { useState } from "react";
import type { AnalysisResult } from "../machine/analyze";
import type { Group } from "../machine/assembly";
import type { Bom, BomLine } from "../machine/bom";
import { DEFLECTION, MIN_MODE_HZ, type Finding } from "../machine/checks";
import type { Machine } from "../machine/document";
import { AXES, type ModeSummary, type Performance } from "../machine/simulate";
import { AXIS_LABEL, cutList, money, pct, sig } from "./format";

interface Props {
  machine: Machine;
  result: AnalysisResult | null;
  pending: boolean;
  bom: Bom;
}

type Tab = "performance" | "parts";

export function OutputPanel({ machine, result, pending, bom }: Props) {
  const [tab, setTab] = useState<Tab>("performance");
  return (
    <aside className="panel outputs" aria-label="Results">
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === "performance"} className={tab === "performance" ? "on" : ""} onClick={() => setTab("performance")}>
          Performance
        </button>
        <button role="tab" aria-selected={tab === "parts"} className={tab === "parts" ? "on" : ""} onClick={() => setTab("parts")}>
          Parts &amp; cost <span className="tab-count">{money(bom.total)}</span>
        </button>
        <span className={`solving ${pending ? "on" : ""}`} aria-live="polite">
          {pending ? "Solving…" : ""}
        </span>
      </div>
      {tab === "performance" ? <PerformanceTab machine={machine} result={result} pending={pending} bom={bom} /> : <PartsTab bom={bom} />}
    </aside>
  );
}

// ------------------------------------------------------------ performance

function PerformanceTab({ machine, result, pending, bom }: Props) {
  if (!result) return <p className="empty">Solving the frame…</p>;
  if (!result.ok) return <p className="empty bad">This design does not solve: {result.error}</p>;
  const { perf, modes, findings } = result.analysis;
  const worst = AXES.reduce((a, b) => (perf.deflection[b] > perf.deflection[a] ? b : a));
  const w = perf.deflection[worst];
  const tone = w > DEFLECTION.soft ? "bad" : w > DEFLECTION.good ? "warn" : "ok";
  const first = modes[0]?.hz ?? 0;

  return (
    <div className={`tab-body ${pending ? "stale" : ""}`}>
      <div className="kpis">
        <Kpi label="Parts cost" value={money(bom.total)} sub={bom.unpriced ? `+ ${bom.unpriced} unpriced lines` : "all lines priced"} />
        <Kpi label={`Deflection at ${machine.cutN} N`} value={`${sig(w)} µm`} sub={`worst in ${AXIS_LABEL[worst]}`} tone={tone} />
        <Kpi label="First mode" value={`${first.toFixed(1)} Hz`} sub={first < MIN_MODE_HZ ? `below the ${MIN_MODE_HZ} Hz guide` : `above the ${MIN_MODE_HZ} Hz guide`} tone={first < MIN_MODE_HZ ? "warn" : "ok"} />
        <Kpi label="Machine mass" value={`${sig(perf.massKg)} kg`} sub={`gantry moves ${sig(perf.motion.y.movingKg)} kg`} />
      </div>

      {findings.length > 0 && <Findings findings={findings} />}

      <Stiffness perf={perf} cutN={machine.cutN} />
      <Budget perf={perf} initial={worst} />
      <Motion perf={perf} />
      <Modes modes={modes} />
    </div>
  );
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: "ok" | "warn" | "bad" }) {
  return (
    <div className={`kpi ${tone ?? ""}`}>
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">{value}</span>
      <span className="kpi-sub">{sub}</span>
    </div>
  );
}

function Findings({ findings }: { findings: Finding[] }) {
  const order = { bad: 0, warn: 1, info: 2 };
  return (
    <section className="block">
      <h3>Findings</h3>
      <ul className="findings">
        {[...findings]
          .sort((a, b) => order[a.severity] - order[b.severity])
          .map((f, i) => (
            <li key={i} className={f.severity}>
              <strong>{f.title}</strong>
              <span>{f.detail}</span>
            </li>
          ))}
      </ul>
    </section>
  );
}

function Stiffness({ perf, cutN }: { perf: Performance; cutN: number }) {
  // Bars on a log scale from 5 µm to 1 mm, with the chip-load and wood-only marks.
  const scale = (um: number) => Math.min(100, Math.max(0, (Math.log10(Math.max(um, 5)) - Math.log10(5)) / (Math.log10(1000) - Math.log10(5)) * 100));
  return (
    <section className="block">
      <h3>Stiffness at the tool</h3>
      <p className="aside">
        Tool-tip deflection under {cutN} N in each direction, gantry and carriage centred, Z at the bottom of travel. Ticks mark {DEFLECTION.good} µm (about a
        chip load in aluminium) and {DEFLECTION.soft} µm (light wood passes only); the scale is logarithmic, 5 µm to 1 mm.
      </p>
      <div className="stiff">
        {AXES.map((a) => {
          const um = perf.deflection[a];
          const tone = um > DEFLECTION.soft ? "bad" : um > DEFLECTION.good ? "warn" : "ok";
          return (
            <div key={a} className="stiff-row">
              <span className="axis-tag">{AXIS_LABEL[a]}</span>
              <div className="track">
                <div className={`bar ${tone}`} style={{ width: `${scale(um)}%` }} />
                <i className="mark" style={{ left: `${scale(DEFLECTION.good)}%` }} title={`${DEFLECTION.good} µm: about one chip load in aluminium`} />
                <i className="mark" style={{ left: `${scale(DEFLECTION.soft)}%` }} title={`${DEFLECTION.soft} µm: light wood passes only`} />
              </div>
              <span className="num">{sig(um)} µm</span>
              <span className="num faint">{sig(perf.stiffness[a])} N/µm</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Budget({ perf, initial }: { perf: Performance; initial: keyof Performance["budget"] }) {
  const [axis, setAxis] = useState(initial);
  const rows = perf.budget[axis];
  return (
    <section className="block">
      <div className="block-head">
        <h3>Where it bends</h3>
        <div className="segmented small" role="radiogroup" aria-label="Load direction">
          {AXES.map((a) => (
            <button key={a} role="radio" aria-checked={axis === a} className={axis === a ? "on" : ""} onClick={() => setAxis(a)}>
              {AXIS_LABEL[a]}
            </button>
          ))}
        </div>
      </div>
      <p className="aside">Share of the tool&rsquo;s {AXIS_LABEL[axis]} deflection stored in each subsystem. Stiffen the top line first.</p>
      <ul className="budget">
        {rows.map((r) => (
          <li key={r.name}>
            <span className="name">{r.name}</span>
            <span className="track">
              <span className="bar" style={{ width: `${r.share * 100}%` }} />
            </span>
            <span className="num">{pct(r.share)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Motion({ perf }: { perf: Performance }) {
  return (
    <section className="block">
      <h3>Motion</h3>
      <table className="grid">
        <thead>
          <tr>
            <th />
            <th>Moving</th>
            <th>Accel</th>
            <th>Rapid</th>
            <th>Limited by</th>
          </tr>
        </thead>
        <tbody>
          {AXES.map((a) => {
            const m = perf.motion[a];
            return (
              <tr key={a}>
                <td className="axis-tag">{AXIS_LABEL[a]}</td>
                <td className="num">{sig(m.movingKg)} kg</td>
                <td className="num">{sig(m.accelMs2)} m/s²</td>
                <td className="num">{sig(m.rapidMmMin / 1000)} m/min</td>
                <td className="faint">
                  {m.limitedBy}
                  {m.currentShare < 0.9 ? `, ${pct(m.currentShare)} current` : ""}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function Modes({ modes }: { modes: ModeSummary[] }) {
  return (
    <section className="block">
      <h3>Vibration modes</h3>
      <ul className="modes">
        {modes.map((m, i) => {
          const dir = AXES.reduce((a, b) => (m.tool[b] > m.tool[a] ? b : a));
          const top = m.budget[0];
          return (
            <li key={i}>
              <span className="num hz">{sig(m.hz)} Hz</span>
              <span>
                {top ? top.name : "Whole frame"}
                <span className="faint"> · {top ? pct(top.share) : ""} of strain energy</span>
              </span>
              <span className="faint">tool {AXIS_LABEL[dir]} {pct(m.tool[dir])}</span>
            </li>
          );
        })}
      </ul>
      <p className="aside">Stepper and spindle harmonics near a mode excite it; keep frequently used feeds away from these.</p>
    </section>
  );
}

// ------------------------------------------------------------ parts and cost

const GROUPS: Group[] = ["Base", "Y axis", "Gantry", "X axis", "Z axis", "Spindle", "Electronics"];

function PartsTab({ bom }: { bom: Bom }) {
  const byGroup = new Map<Group, BomLine[]>();
  for (const l of bom.lines) byGroup.set(l.group, [...(byGroup.get(l.group) ?? []), l]);
  const unpricedNames = bom.lines.filter((l) => l.total === null).map((l) => l.name);
  return (
    <div className="tab-body">
      <div className="bom-total">
        <div>
          <span className="kpi-label">Priced parts</span>
          <span className="kpi-value">{money(bom.total)}</span>
        </div>
        <button className="ghost" onClick={() => downloadCsv(bom)}>
          Download CSV
        </button>
      </div>
      {unpricedNames.length > 0 && (
        <p className="aside warn-text">
          The total is a floor: {unpricedNames.length} lines have no sourced price yet ({unpricedNames.slice(0, 3).join("; ")}
          {unpricedNames.length > 3 ? "; …" : ""}). Prices read 27 Sep 2026, before shipping and tax.
        </p>
      )}
      {GROUPS.filter((g) => byGroup.has(g)).map((g) => {
        const lines = byGroup.get(g)!;
        const sub = lines.reduce((s, l) => s + (l.total ?? 0), 0);
        return (
          <section key={g} className="block bom-group">
            <div className="block-head">
              <h3>{g}</h3>
              <span className="num">{money(sub)}</span>
            </div>
            <ul className="bom">
              {lines.map((l) => (
                <li key={l.sku}>
                  <div className="bom-main">
                    <a href={l.offer.url} target="_blank" rel="noreferrer" title={`${l.offer.vendor}${l.offer.note ? ` · ${l.offer.note}` : ""}`}>
                      {l.name}
                    </a>
                    <span className="num">{l.total === null ? <span className="faint">unpriced</span> : money(l.total, true)}</span>
                  </div>
                  <div className="bom-sub">
                    <span>
                      {l.unit === "each" ? `${l.qty} ×` : `${l.qty} ${l.unit}`}
                      {l.offer.price !== null && l.offer.price > 0 ? ` @ ${money(l.offer.price, true)}${l.unit === "each" ? "" : `/${l.unit}`}` : ""}
                      {l.cutFee > 0 ? ` + ${money(l.cutFee, true)} cuts` : ""}
                    </span>
                    <span>{l.offer.vendor}</span>
                  </div>
                  {l.cuts.length > 0 && <div className="bom-cuts">Cut: {cutList(l.cuts)} mm</div>}
                  {l.offer.note && <div className="bom-note">{l.offer.note}</div>}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function downloadCsv(bom: Bom) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const rows = [
    ["Group", "Item", "SKU", "Qty", "Unit", "Unit price (USD)", "Cut fees", "Total (USD)", "Cuts (mm)", "Vendor", "URL", "Note"],
    ...bom.lines.map((l) => [l.group, l.name, l.sku, l.qty, l.unit, l.offer.price ?? "", l.cutFee || "", l.total === null ? "" : l.total.toFixed(2), l.cuts.join(" "), l.offer.vendor, l.offer.url, l.offer.note ?? ""]),
  ];
  const blob = new Blob([rows.map((r) => r.map(esc).join(",")).join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "machine-bom.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}
