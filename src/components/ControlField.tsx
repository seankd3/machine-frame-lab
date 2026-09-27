import { useEffect, useId, useState, type CSSProperties, type ReactNode } from "react";
import { numbers, type Design } from "../model/design";

export type Update = (patch: Partial<Design>) => void;
type NumberKey = keyof typeof numbers;

/** Slider plus typed entry for one numeric design field; range comes from the spec. */
export function NumberField({ name, design, update }: { name: NumberKey; design: Design; update: Update }) {
  const spec = numbers[name];
  const value = design[name];
  const id = useId();
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);

  const commit = (text: string) => {
    const next = Number(text);
    if (text.trim() === "" || !Number.isFinite(next)) return setDraft(String(value));
    update({ [name]: Math.min(spec.max, Math.max(spec.min, next)) });
  };
  const progress = { "--progress": `${((value - spec.min) / (spec.max - spec.min)) * 100}%` } as CSSProperties;

  return (
    <div className="field number-field">
      <label htmlFor={id}>{spec.label}</label>
      <div className="number-entry">
        <input
          inputMode="decimal"
          value={draft}
          aria-label={`${spec.label} value`}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={(event) => commit(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && commit(event.currentTarget.value)}
        />
        {spec.unit ? <span>{spec.unit}</span> : null}
      </div>
      <input
        id={id}
        type="range"
        min={spec.min}
        max={spec.max}
        step={spec.step}
        value={value}
        style={progress}
        onChange={(event) => update({ [name]: Number(event.target.value) })}
      />
    </div>
  );
}

export function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label?: string;
  value: T;
  options: Array<{ value: T; label: ReactNode; disabled?: boolean }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="field">
      {label ? <span className="field-label">{label}</span> : null}
      <div className="segmented" role="radiogroup" aria-label={label}>
        {options.map((option) => (
          <button
            type="button"
            role="radio"
            aria-checked={option.value === value}
            className={option.value === value ? "on" : ""}
            disabled={option.disabled}
            key={String(option.value)}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Group({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="group">
      <header>
        <h2>{title}</h2>
        {aside}
      </header>
      {children}
    </section>
  );
}
