import { useEffect, useState, type ReactNode } from "react";
import type { Machine } from "../machine/document";
import { presets } from "../machine/presets";
import { fields, type ChoiceField, type NumberField, type Option } from "./fields";

interface Props {
  machine: Machine;
  set: (key: string, value: string | number) => void;
  load: (m: Machine) => void;
}

const get = (m: Machine, key: string) => key.split(".").reduce<any>((o, p) => o[p], m) as string | number;

export function InputPanel({ machine, set, load }: Props) {
  const field = (key: string) => {
    const f = fields[key];
    const value = get(machine, key);
    if (f.kind === "number") return <NumberInput key={key} field={f} value={Number(value)} onChange={(v) => set(key, v)} />;
    if (f.options.length <= 3) return <Segmented key={key} field={f} value={String(value)} onChange={(v) => set(key, v)} />;
    return <Select key={key} field={f} value={String(value)} onChange={(v) => set(key, v)} />;
  };

  const active = presets.find((p) => JSON.stringify(p.machine) === JSON.stringify(machine))?.id;

  return (
    <aside className="panel inputs" aria-label="Machine design">
      <Section title="Start from">
        <div className="presets">
          {presets.map((p) => (
            <button key={p.id} className={`preset ${active === p.id ? "on" : ""}`} onClick={() => load(p.machine)} aria-pressed={active === p.id}>
              <strong>{p.name}</strong>
              <span>{p.blurb}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Work area">
        {field("work.x")}
        {field("work.y")}
        {field("work.z")}
      </Section>

      <Section title="Base frame">
        {field("frame.stock")}
        {field("frame.joinery")}
      </Section>

      <Section title="Gantry">
        {field("gantry.beam")}
        {field("gantry.beams")}
        {field("gantry.plateMm")}
        {field("gantry.clearanceMm")}
      </Section>

      <Section title="Motion">
        <div className="axis-grid">
          <span />
          <span className="col-head">Guide</span>
          <span className="col-head">Drive</span>
          <span className="col-head">Motor</span>
          {(["x", "y", "z"] as const).map((a) => (
            <AxisRow key={a} axis={a} machine={machine} set={set} />
          ))}
        </div>
        <p className="aside">Y runs a drive and motor on each side of the base.</p>
      </Section>

      <Section title="Spindle & control">
        {field("spindle")}
        {field("controller")}
      </Section>

      <Section title="Load case">{field("cutN")}</Section>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function AxisRow({ axis, machine, set }: { axis: "x" | "y" | "z"; machine: Machine; set: Props["set"] }) {
  return (
    <>
      <span className="axis-tag">{axis.toUpperCase()}</span>
      {(["guide", "drive", "motor"] as const).map((k) => {
        const key = `${axis}.${k}`;
        const f = fields[key] as ChoiceField;
        return (
          <select key={key} aria-label={`${axis.toUpperCase()} ${f.label}`} value={machine[axis][k]} onChange={(e) => set(key, e.target.value)}>
            {f.options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.id}
                {o.price ? ` · ${o.price}` : ""}
              </option>
            ))}
          </select>
        );
      })}
    </>
  );
}

function NumberInput({ field: f, value, onChange }: { field: NumberField; value: number; onChange: (v: number) => void }) {
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
  const id = `f-${f.label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <div className="field">
      <div className="field-head">
        <label htmlFor={id}>{f.label}</label>
        <span className="num-box">
          <input
            id={id}
            inputMode="numeric"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => e.key === "Enter" && commit()}
          />
          <span className="unit">{f.unit}</span>
        </span>
      </div>
      <input
        type="range"
        aria-label={f.label}
        min={f.min}
        max={f.max}
        step={f.step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ ["--fill" as string]: `${((value - f.min) / (f.max - f.min)) * 100}%` }}
      />
      {f.hint && <p className="hint">{f.hint}</p>}
    </div>
  );
}

function Segmented({ field: f, value, onChange }: { field: ChoiceField; value: string; onChange: (v: string) => void }) {
  return (
    <div className="field">
      <span className="label">{f.label}</span>
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

function Select({ field: f, value, onChange }: { field: ChoiceField; value: string; onChange: (v: string) => void }) {
  const groups = new Map<string, Option[]>();
  for (const o of f.options) groups.set(o.group ?? "", [...(groups.get(o.group ?? "") ?? []), o]);
  const current = f.options.find((o) => o.id === value);
  const id = `f-${f.label.replace(/\W+/g, "-").toLowerCase()}`;
  const option = (o: Option) => (
    <option key={o.id} value={o.id}>
      {o.label}
      {o.price ? ` · ${o.price}` : " · unpriced"}
    </option>
  );
  return (
    <div className="field">
      <div className="field-head">
        <label htmlFor={id}>{f.label}</label>
        <span className="hint">{current?.price ?? "no sourced price"}</span>
      </div>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {[...groups.entries()].map(([g, opts]) => (g ? <optgroup key={g} label={g}>{opts.map(option)}</optgroup> : opts.map(option)))}
      </select>
    </div>
  );
}
