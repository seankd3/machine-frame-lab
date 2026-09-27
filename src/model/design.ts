import { fills, type Fill } from "../data/materials";
import { profiles } from "../data/profiles";
import { rails } from "../data/rails";
import type { Support } from "./beam";
import type { Orientation } from "./section";

// A design is every choice the user makes. Its URL hash is the same fields as
// readable key=value pairs, so a copied address is the share link and a
// reload restores the page.

export interface NumberSpec {
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  value: number;
}

export const numbers = {
  spanMm: { label: "Span", unit: "mm", min: 200, max: 3000, step: 10, value: 1000 },
  topRails: { label: "Top face", unit: "", min: 0, max: 4, step: 1, value: 0 },
  frontRails: { label: "Front face", unit: "", min: 0, max: 4, step: 1, value: 2 },
  forceN: { label: "Cutting force", unit: "N", min: 10, max: 2000, step: 5, value: 150 },
  rpm: { label: "Spindle speed", unit: "rpm", min: 1000, max: 30000, step: 100, value: 18000 },
  flutes: { label: "Flutes", unit: "", min: 1, max: 6, step: 1, value: 3 },
  carriageKg: { label: "Carriage mass", unit: "kg", min: 0, max: 80, step: 0.5, value: 12 },
  stationPct: { label: "Carriage position", unit: "%", min: 0, max: 100, step: 1, value: 50 },
  maxUm: { label: "Max tool deflection", unit: "µm", min: 1, max: 200, step: 1, value: 25 },
  minHz: { label: "Min first mode", unit: "Hz", min: 20, max: 1000, step: 5, value: 150 },
} satisfies Record<string, NumberSpec>;

export const choices = {
  profile: { options: profiles.map((p) => p.id), value: "40-4080" },
  orientation: { options: ["upright", "flat"] as Orientation[], value: "upright" as Orientation },
  support: { options: ["fixed", "pinned", "cantilever"] as Support[], value: "fixed" as Support },
  rail: { options: ["none", ...rails.map((r) => r.id)], value: "HGR20" },
  fill: { options: fills.map((f) => f.id), value: "hollow" as Fill["id"] },
};

type NumberKey = keyof typeof numbers;
type ChoiceKey = keyof typeof choices;

export type Design = { [K in NumberKey]: number } & { [K in ChoiceKey]: (typeof choices)[K]["value"] };

export const defaultDesign = Object.fromEntries([
  ...Object.entries(numbers).map(([key, spec]) => [key, spec.value]),
  ...Object.entries(choices).map(([key, spec]) => [key, spec.value]),
]) as Design;

/** Reads any key=value string, keeping only values that are in range. */
export function parseDesign(text: string): Design {
  const params = new URLSearchParams(text.replace(/^#/, ""));
  const design: Record<string, unknown> = { ...defaultDesign };
  for (const [key, spec] of Object.entries(numbers)) {
    const value = Number(params.get(key));
    if (params.has(key) && Number.isFinite(value)) {
      design[key] = Math.min(spec.max, Math.max(spec.min, value));
    }
  }
  for (const [key, spec] of Object.entries(choices)) {
    const value = params.get(key);
    if (value !== null && (spec.options as string[]).includes(value)) design[key] = value;
  }
  return design as Design;
}

/** Every field is written, so a shared link keeps its meaning if defaults change. */
export const formatDesign = (design: Design) =>
  new URLSearchParams(Object.entries(design).map(([key, value]) => [key, String(value)])).toString();
