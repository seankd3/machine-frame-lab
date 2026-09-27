import { useEffect, useState, type ReactNode } from "react";
import { sameDesign, type Machine } from "../machine/document";
import { presets } from "../machine/presets";
import { BUDGET, MATERIALS, minModeHz, PACES, type Material, type Pace, type Requirements } from "../machine/requirements";
import { fields, type ChoiceField, type NumberField, type Option } from "./fields";

interface Props {
  machine: Machine;
  req: Requirements;
  set: (key: string, value: string | number) => void;
  load: (m: Machine) => void;
  setReq: (patch: Partial<Requirements>) => void;
}

const budgetField: NumberField = { kind: "number", label: "Budget", min: BUDGET.min, max: BUDGET.max, step: BUDGET.step, unit: "USD", hint: "Cap on the priced parts total" };

const get = (m: Machine, key: string) => key.split(".").reduce<any>((o, p) => o[p], m) as string | number;

export function InputPanel({ machine, req, set, load, setReq }: Props) {
  const field = (key: string) => {
    const f = fields[key];
    const value = get(machine, key);
    if (f.kind === "number") return <NumberRow key={key} id={key} field={f} value={Number(value)} onChange={(v) => set(key, v)} />;
    if (f.options.length <= 3) return <SegmentRow key={key} field={f} value={String(value)} onChange={(v) => set(key, v)} />;
    return <SelectRow key={key} id={key} field={f} value={String(value)} onChange={(v) => set(key, v)} />;
  };

  const mat = MATERIALS[req.material];

  return (
    <aside className="pane inputs" aria-label="Design parameters">
      <PaneHeader title="Parameters" />

      <Section n="00" title="Requirements">
        <div className="prop">
          <span className="prop-label">Material</span>
          <div className="segmented" role="radiogroup" aria-label="Material">
            {(Object.keys(MATERIALS) as Material[]).map((k) => (
              <button key={k} role="radio" aria-checked={req.material === k} className={req.material === k ? "on" : ""} onClick={() => setReq({ material: k })}>
                {MATERIALS[k].label}
              </button>
            ))}
          </div>
          <p className="spec-line">
            <span>F {mat.cutN} N</span>
            <span>δ ≤ {mat.deflectionUm} µm</span>
            <span title="Ringing after an acceleration step stays inside the deflection target">f₁ ≥ {minModeHz(req)} Hz</span>
          </p>
        </div>
        {field("work.x")}
        {field("work.y")}
        {field("work.z")}
        <NumberRow id="req.budget" field={budgetField} value={req.budget} onChange={(v) => setReq({ budget: v })} />
        <div className="prop">
          <span className="prop-label">Pace</span>
          <div className="segmented" role="radiogroup" aria-label="Pace">
            {(Object.keys(PACES) as Pace[]).map((k) => (
              <button key={k} role="radio" aria-checked={req.pace === k} className={req.pace === k ? "on" : ""} onClick={() => setReq({ pace: k })} title={PACES[k].blurb}>
                {PACES[k].label}
              </button>
            ))}
          </div>
          <p className="spec-line">
            <span>rapids ≥ {PACES[req.pace].rapidMmMin / 1000} m/min</span>
            <span>a ≥ {PACES[req.pace].accelMs2} m/s²</span>
          </p>
        </div>
        <div className="prop">
          <span className="prop-label">Can you weld?</span>
          <div className="segmented" role="radiogroup" aria-label="Welding available">
            {[false, true].map((v) => (
              <button key={String(v)} role="radio" aria-checked={req.weld === v} className={req.weld === v ? "on" : ""} onClick={() => setReq({ weld: v })}>
                {v ? "Yes" : "No"}
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section n="01" title="Starting point">
        <div className="presets" role="radiogroup" aria-label="Start from a preset">
          {presets.map((p, i) => {
            const on = sameDesign(p.machine, machine);
            return (
              <button key={p.id} role="radio" aria-checked={on} className={`preset ${on ? "on" : ""}`} onClick={() => load(p.machine)}>
                <span className="preset-idx">P{i + 1}</span>
                <span className="preset-body">
                  <span className="preset-name">{p.name}</span>
                  <span className="preset-blurb">{p.blurb}</span>
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section n="02" title="Base frame">
        {field("frame.stock")}
        {field("frame.joinery")}
      </Section>

      <Section n="03" title="Gantry">
        {field("gantry.beam")}
        {field("gantry.beams")}
        {field("gantry.plateMm")}
        {field("gantry.clearanceMm")}
      </Section>

      <Section n="04" title="Motion">
        <table className="axis-table">
          <thead>
            <tr>
              <th />
              <th>Guide</th>
              <th>Drive</th>
              <th>Motor</th>
            </tr>
          </thead>
          <tbody>
            {(["x", "y", "z"] as const).map((a) => (
              <AxisRow key={a} axis={a} machine={machine} set={set} />
            ))}
          </tbody>
        </table>
        <p className="note">Y runs a drive and motor on each side of the base.</p>
      </Section>

      <Section n="05" title="Spindle & control">
        {field("spindle")}
        {field("controller")}
      </Section>

    </aside>
  );
}

export function PaneHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="pane-header">
      <span className="pane-title">{title}</span>
      {children}
    </div>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <section className="section">
      <h2>
        <span className="section-n">{n}</span>
        {title}
      </h2>
      <div className="section-body">{children}</div>
    </section>
  );
}

function AxisRow({ axis, machine, set }: { axis: "x" | "y" | "z"; machine: Machine; set: Props["set"] }) {
  return (
    <tr>
      <th scope="row" className="axis-tag">
        {axis.toUpperCase()}
      </th>
      {(["guide", "drive", "motor"] as const).map((k) => {
        const key = `${axis}.${k}`;
        const f = fields[key] as ChoiceField;
        const current = f.options.find((o) => o.id === machine[axis][k]);
        return (
          <td key={key}>
            <select aria-label={`${axis.toUpperCase()} ${f.label}`} value={machine[axis][k]} onChange={(e) => set(key, e.target.value)} title={current?.price ?? "no sourced price"}>
              {f.options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.id}
                  {o.price ? `  ${o.price}` : ""}
                </option>
              ))}
            </select>
          </td>
        );
      })}
    </tr>
  );
}

const inputId = (key: string) => `in-${key.replace(/\W+/g, "-")}`;

function NumberRow({ id, field: f, value, onChange }: { id: string; field: NumberField; value: number; onChange: (v: number) => void }) {
  // The text box keeps its own draft so a half-typed number is not clamped mid-edit.
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const commit = () => {
    const v = Number(draft);
    if (!Number.isFinite(v)) return setDraft(String(value));
    const clamped = Math.min(f.max, Math.max(f.min, Math.round(v / f.step) * f.step));
    setDraft(String(clamped));
    if (clamped !== value) onChange(clamped);
  };
  return (
    <div className="prop">
      <label htmlFor={inputId(id)} title={f.hint}>
        {f.label}
      </label>
      <span className="num-field">
        <input
          id={inputId(id)}
          inputMode="numeric"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && commit()}
        />
        <span className="unit">{f.unit}</span>
      </span>
      <input
        className="prop-slider"
        type="range"
        aria-label={f.label}
        min={f.min}
        max={f.max}
        step={f.step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ ["--fill" as string]: `${((value - f.min) / (f.max - f.min)) * 100}%` }}
      />
    </div>
  );
}

function SegmentRow({ field: f, value, onChange }: { field: ChoiceField; value: string; onChange: (v: string) => void }) {
  return (
    <div className="prop">
      <span className="prop-label">{f.label}</span>
      <div className="segmented" role="radiogroup" aria-label={f.label}>
        {f.options.map((o) => (
          <button key={o.id} role="radio" aria-checked={value === o.id} className={value === o.id ? "on" : ""} onClick={() => onChange(o.id)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SelectRow({ id, field: f, value, onChange }: { id: string; field: ChoiceField; value: string; onChange: (v: string) => void }) {
  const groups = new Map<string, Option[]>();
  for (const o of f.options) groups.set(o.group ?? "", [...(groups.get(o.group ?? "") ?? []), o]);
  const current = f.options.find((o) => o.id === value);
  const option = (o: Option) => (
    <option key={o.id} value={o.id}>
      {o.label}
      {o.price ? ` — ${o.price}` : " — unpriced"}
    </option>
  );
  return (
    <div className="prop stacked">
      <label htmlFor={inputId(id)}>{f.label}</label>
      <span className={`price-tag ${current?.price ? "" : "none"}`}>{current?.price ?? "unpriced"}</span>
      <select id={inputId(id)} value={value} onChange={(e) => onChange(e.target.value)}>
        {[...groups.entries()].map(([g, opts]) => (g ? <optgroup key={g} label={g}>{opts.map(option)}</optgroup> : opts.map(option)))}
      </select>
    </div>
  );
}
