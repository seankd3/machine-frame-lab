const digits = (value: number) => (Math.abs(value) < 10 ? 1 : 0);

export const um = (value: number) => `${value.toFixed(digits(value))} µm`;
export const hz = (value: number) => `${Math.round(value)} Hz`;
export const kgm = (value: number) => `${value.toFixed(value < 10 ? 2 : 1)} kg/m`;
export const kg = (value: number) => `${value.toFixed(1)} kg`;
export const rpm = (value: number) => `${Math.round(value).toLocaleString("en-US")} rpm`;
export const pct = (value: number) => `${(value * 100).toFixed(1)} %`;
export const kNm2 = (value: number) => `${(value / 1000).toFixed(1)} kN·m²`;

/** "40 × 80 mm" or "1.5 × 3 in", in the profile's own unit system. */
export function envelope(widthMm: number, heightMm: number, system: "inch" | "metric") {
  if (system === "metric") return `${trim(widthMm)} × ${trim(heightMm)} mm`;
  return `${trim(widthMm / 25.4)} × ${trim(heightMm / 25.4)} in`;
}

const trim = (value: number) => String(Number(value.toFixed(2)));
