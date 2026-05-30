import { useId, type ChangeEvent, type CSSProperties, type ReactNode } from "react";

interface NumberFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}

interface SelectFieldProps {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}

export function PanelSection({
  title,
  icon,
  children,
  className,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={["panel-section", className].filter(Boolean).join(" ")}>
      <div className="section-title">
        {icon}
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}

export function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
}: NumberFieldProps) {
  const id = useId();
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = Number(event.target.value);
    if (!Number.isFinite(nextValue)) return;

    onChange(clamp(nextValue, min, max));
  };
  const progress = `${Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))}%`;
  const rangeStyle = { "--range-progress": progress } as CSSProperties;

  return (
    <div className="control-field number-field">
      <span className="control-label-row">
        <label htmlFor={`${id}-range`}>{label}</label>
        <strong>{formatReadout(value, step, unit)}</strong>
      </span>
      <div className="number-row">
        <input
          id={`${id}-range`}
          type="range"
          value={value}
          min={min}
          max={max}
          step={step}
          aria-label={`${label} slider`}
          style={rangeStyle}
          onChange={handleChange}
        />
        <input
          className="number-input"
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          aria-label={`${label} value`}
          onChange={handleChange}
        />
      </div>
    </div>
  );
}

function formatReadout(value: number, step: number, unit?: string) {
  const decimals = step < 1 ? String(step).split(".")[1]?.length ?? 2 : 0;
  const raw = value.toFixed(decimals);
  const rounded = decimals > 0 ? raw.replace(/\.?0+$/u, "") : raw;
  return unit ? `${rounded} ${unit}` : rounded;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function SelectField({ label, value, options, onChange }: SelectFieldProps) {
  return (
    <label className="control-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option value={option.value} key={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="control-field">
      <span>{label}</span>
      <div className="segmented">
        {options.map((option) => (
          <button
            type="button"
            className={value === option.value ? "active" : ""}
            key={option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
