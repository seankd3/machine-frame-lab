import { useState, type ReactNode } from "react";
import type { AnalysisResult } from "../machine/analyze";
import type { Group } from "../machine/assembly";
import type { Bom, BomLine } from "../machine/bom";
import type { Finding } from "../machine/checks";
import { MATERIALS, minModeHz, type Requirements, type Target } from "../machine/requirements";
import type { Machine } from "../machine/document";
import { AXES, type ModeSummary, type Performance } from "../machine/simulate";
import { PRICES_READ } from "../catalog/types";
import { AXIS_LABEL, cutList, money, pct, sig } from "./format";
import { Suggestions, TradeSpace } from "./Explore";
import type { Exploration } from "./hooks";
import type { Goals } from "../machine/explore";
import { PaneHeader } from "./InputPanel";

interface Props {
  machine: Machine;
  req: Requirements;
  targets: Target[] | null;
  result: AnalysisResult | null;
  pending: boolean;
  bom: Bom;
  ex: Exploration;
  goals: Goals;
  apply: (key: string, value: string | number) => void;
}

type Tab = "analysis" | "explore" | "bom";
type Tone = "ok" | "warn" | "bad";

/** Over target fails; within 20 % of it is a warning. */
const deflectionTone = (um: number, target: number): Tone => (um > target ? "bad" : um > target * 0.8 ? "warn" : "ok");

export function OutputPanel(props: Props) {
  const { bom } = props;
  const [tab, setTab] = useState<Tab>("analysis");
  return (
    <aside className="pane outputs" aria-label="Results">
      <PaneHeader title="Results">
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === "analysis"} className={tab === "analysis" ? "on" : ""} onClick={() => setTab("analysis")}>
            Analysis
          </button>
          <button role="tab" aria-selected={tab === "explore"} className={tab === "explore" ? "on" : ""} onClick={() => setTab("explore")}>
            Explore
          </button>
          <button role="tab" aria-selected={tab === "bom"} className={tab === "bom" ? "on" : ""} onClick={() => setTab("bom")}>
            BOM <span className="tab-n">{bom.lines.length}</span>
          </button>
        </div>
      </PaneHeader>
      {tab === "analysis" ? (
        <AnalysisTab {...props} />
      ) : tab === "explore" ? (
        <TradeSpace ex={props.ex} goals={props.goals} targets={props.targets} apply={props.apply} />
      ) : (
        <BomTab bom={bom} />
      )}
    </aside>
  );
}

function Block({ title, meta, children }: { title: string; meta?: ReactNode; children: ReactNode }) {
  return (
    <section className="block">
      <header className="block-head">
        <h3>{title}</h3>
        {meta}
      </header>
      {children}
    </section>
  );
}

// ------------------------------------------------------------ analysis

function AnalysisTab({ machine, req, targets, result, pending, ex, goals, apply }: Props) {
  if (!result) return <p className="empty">Assembling stiffness matrix…</p>;
  if (!result.ok) return <p className="empty bad">Solve failed: {result.error}</p>;
  const { perf, modes, findings } = result.analysis;
  const worst = AXES.reduce((a, b) => (perf.deflection[b] > perf.deflection[a] ? b : a));
  const mat = MATERIALS[req.material];

  return (
    <div className={`pane-body ${pending ? "stale" : ""}`}>
      {targets && <Scorecard targets={targets} />}
      <Suggestions ex={ex} goals={goals} targets={targets} apply={apply} />
      {findings.length > 0 && <FindingLog findings={findings} />}
      <Stiffness perf={perf} cutN={machine.cutN} target={mat.deflectionUm} />
      <Budget perf={perf} initial={worst} />
      <Motion perf={perf} />
      <Modes modes={modes} minHz={minModeHz(req)} />
    </div>
  );
}

function Scorecard({ targets }: { targets: Target[] }) {
  const misses = targets.filter((t) => !t.pass);
  return (
    <section className={`scorecard ${misses.length ? "miss" : "pass"}`}>
      <header className="verdict">
        <span className="verdict-mark" aria-hidden />
        <span className="verdict-text">{misses.length ? `Misses ${misses.length} of ${targets.length} requirements` : "Meets every requirement"}</span>
        <span className="verdict-count mono">
          {targets.length - misses.length}/{targets.length}
        </span>
      </header>
      <table className="data score">
        <tbody>
          {targets.map((t) => (
            <tr key={t.key} className={t.pass ? "pass" : "miss"}>
              <td className="score-code mono">{t.pass ? "PASS" : "MISS"}</td>
              <td>
                <span className="score-label">{t.label}</span>
                {t.hint && <span className="score-hint">{t.hint}</span>}
              </td>
              <td className="r mono score-value">{t.value}</td>
              <td className="r mono dim">{t.target}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Readout({ label, value, unit, sub, tone }: { label: string; value: string; unit: string; sub: string; tone?: Tone }) {
  return (
    <div className={`readout ${tone ?? ""}`}>
      <span className="readout-label">{label}</span>
      <span className="readout-value">
        {value}
        {unit && <small>{unit}</small>}
      </span>
      <span className="readout-sub">{sub}</span>
    </div>
  );
}

const CODE = { bad: "FAIL", warn: "WARN", info: "NOTE" } as const;

function FindingLog({ findings }: { findings: Finding[] }) {
  const order = { bad: 0, warn: 1, info: 2 };
  const counts = { bad: 0, warn: 0, info: 0 };
  for (const f of findings) counts[f.severity]++;
  return (
    <Block
      title="Checks"
      meta={
        <span className="counts">
          {counts.bad > 0 && <b className="bad">{counts.bad} fail</b>}
          {counts.warn > 0 && <b className="warn">{counts.warn} warn</b>}
          {counts.info > 0 && <b>{counts.info} note</b>}
        </span>
      }
    >
      <ul className="log">
        {[...findings]
          .sort((a, b) => order[a.severity] - order[b.severity])
          .map((f, i) => (
            <li key={i} className={f.severity}>
              <span className="code">{CODE[f.severity]}</span>
              <span className="log-text">
                <strong>{f.title}</strong>
                <span>{f.detail}</span>
              </span>
            </li>
          ))}
      </ul>
    </Block>
  );
}

function Stiffness({ perf, cutN, target }: { perf: Performance; cutN: number; target: number }) {
  // Log scale from 5 µm to 1 mm, ticked at the chip-load and wood-only limits.
  const lo = Math.log10(5);
  const hi = Math.log10(1000);
  const x = (um: number) => Math.min(100, Math.max(0, ((Math.log10(Math.max(um, 5)) - lo) / (hi - lo)) * 100));
  return (
    <Block title="Tool-point compliance" meta={<span className="meta">F = {cutN} N · log scale</span>}>
      <table className="data">
        <thead>
          <tr>
            <th />
            <th className="bar-col">5 µm ··· 1 mm</th>
            <th className="r">δ µm</th>
            <th className="r">k N/µm</th>
          </tr>
        </thead>
        <tbody>
          {AXES.map((a) => {
            const um = perf.deflection[a];
            return (
              <tr key={a}>
                <th scope="row" className="axis-tag">
                  {AXIS_LABEL[a]}
                </th>
                <td className="bar-col">
                  <span className="gauge">
                    <span className={`gauge-fill ${deflectionTone(um, target)}`} style={{ width: `${x(um)}%` }} />
                    <i style={{ left: `${x(target)}%` }} title={`Target ${target} µm`} />
                  </span>
                </td>
                <td className="r mono">{sig(um)}</td>
                <td className="r mono dim">{sig(perf.stiffness[a])}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="note">
        Tick: the {target} µm target, about one chip thickness for the chosen material. Gantry and carriage centred, Z at the bottom of travel.
      </p>
    </Block>
  );
}

function Budget({ perf, initial }: { perf: Performance; initial: keyof Performance["budget"] }) {
  const [axis, setAxis] = useState(initial);
  const rows = perf.budget[axis];
  return (
    <Block
      title="Compliance budget"
      meta={
        <div className="segmented mini" role="radiogroup" aria-label="Load direction">
          {AXES.map((a) => (
            <button key={a} role="radio" aria-checked={axis === a} className={axis === a ? "on" : ""} onClick={() => setAxis(a)}>
              {AXIS_LABEL[a]}
            </button>
          ))}
        </div>
      }
    >
      <table className="data">
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.name} className={i === 0 ? "lead" : ""}>
              <td className="name">{r.name}</td>
              <td className="bar-col">
                <span className="gauge">
                  <span className="gauge-fill accent" style={{ width: `${r.share * 100}%` }} />
                </span>
              </td>
              <td className="r mono">{pct(r.share)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="note">Share of the {AXIS_LABEL[axis]} deflection stored in each subsystem. Stiffen the top row first.</p>
    </Block>
  );
}

function Motion({ perf }: { perf: Performance }) {
  return (
    <Block title="Axis dynamics">
      <table className="data">
        <thead>
          <tr>
            <th />
            <th className="r">m kg</th>
            <th className="r">a m/s²</th>
            <th className="r">v m/min</th>
            <th>Limit</th>
          </tr>
        </thead>
        <tbody>
          {AXES.map((a) => {
            const m = perf.motion[a];
            return (
              <tr key={a}>
                <th scope="row" className="axis-tag">
                  {AXIS_LABEL[a]}
                </th>
                <td className="r mono">{sig(m.movingKg)}</td>
                <td className="r mono">{sig(m.accelMs2)}</td>
                <td className="r mono">{sig(m.rapidMmMin / 1000)}</td>
                <td className="dim small">
                  {m.limitedBy}
                  {m.currentShare < 0.9 ? ` · ${pct(m.currentShare)} I` : ""}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Block>
  );
}

function Modes({ modes, minHz }: { modes: ModeSummary[]; minHz: number }) {
  return (
    <Block title="Modal">
      <table className="data">
        <thead>
          <tr>
            <th>#</th>
            <th className="r">f Hz</th>
            <th>Dominant subsystem</th>
            <th className="r">Tool</th>
          </tr>
        </thead>
        <tbody>
          {modes.map((m, i) => {
            const dir = AXES.reduce((a, b) => (m.tool[b] > m.tool[a] ? b : a));
            const top = m.budget[0];
            return (
              <tr key={i}>
                <td className="mono dim">{i + 1}</td>
                <td className={`r mono ${m.hz < minHz ? "warn-text" : ""}`}>{m.hz.toFixed(1)}</td>
                <td className="name">
                  {top ? top.name : "Whole frame"} <span className="dim mono small">{top ? pct(top.share) : ""}</span>
                </td>
                <td className="r mono dim">
                  {AXIS_LABEL[dir]} {pct(m.tool[dir])}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="note">Keep stepper and tooth-pass frequencies away from these.</p>
    </Block>
  );
}

// ------------------------------------------------------------ bill of materials

const GROUPS: Group[] = ["Base", "Y axis", "Gantry", "X axis", "Z axis", "Spindle", "Electronics"];

function BomTab({ bom }: { bom: Bom }) {
  const byGroup = new Map<Group, BomLine[]>();
  for (const l of bom.lines) byGroup.set(l.group, [...(byGroup.get(l.group) ?? []), l]);
  return (
    <div className="pane-body">
      <div className="bom-head">
        <Readout label="Priced total" value={money(bom.total)} unit="USD" sub={`${bom.lines.length} lines · read ${PRICES_READ}`} />
        <button className="btn" onClick={() => downloadCsv(bom)}>
          Export CSV
        </button>
      </div>
      {bom.unpriced > 0 && (
        <p className="banner warn">
          <span className="code">WARN</span>
          Total is a floor: {bom.unpriced} lines have no sourced price. Single-unit USD before shipping and tax.
        </p>
      )}
      {GROUPS.filter((g) => byGroup.has(g)).map((g) => {
        const lines = byGroup.get(g)!;
        const sub = lines.reduce((s, l) => s + (l.total ?? 0), 0);
        return (
          <Block key={g} title={g} meta={<span className="meta mono">{money(sub)}</span>}>
            <ul className="bom">
              {lines.map((l) => (
                <li key={l.sku}>
                  <div className="bom-line">
                    <span className="bom-qty mono">{l.unit === "each" ? `${l.qty}×` : `${l.qty} ${l.unit}`}</span>
                    <a className="bom-name" href={l.offer.url} target="_blank" rel="noreferrer" title={`${l.offer.vendor}${l.offer.note ? ` · ${l.offer.note}` : ""}`}>
                      {l.name}
                    </a>
                    <span className={`bom-total mono ${l.total === null ? "dim" : ""}`}>{l.total === null ? "—" : money(l.total, true)}</span>
                  </div>
                  <div className="bom-meta">
                    <span className="mono">{l.sku}</span>
                    <span>
                      {l.offer.vendor}
                      {l.offer.price !== null && l.offer.price > 0 ? ` · ${money(l.offer.price, true)}${l.unit === "each" ? "" : `/${l.unit}`}` : ""}
                      {l.cutFee > 0 ? ` + ${money(l.cutFee, true)} cuts` : ""}
                    </span>
                  </div>
                  {l.cuts.length > 0 && <div className="bom-cuts mono">CUT {cutList(l.cuts)} mm</div>}
                  {l.offer.note && <div className="bom-note">{l.offer.note}</div>}
                </li>
              ))}
            </ul>
          </Block>
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
