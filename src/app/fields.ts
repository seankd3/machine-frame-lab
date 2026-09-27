import { controllers, spindles } from "../catalog/equipment";
import { drives, guides, motors } from "../catalog/motion";
import { stock } from "../catalog/stock";
import type { Offer } from "../catalog/types";

// Every input the machine document takes: its range or its options. The form,
// the URL-hash reader and the option price hints all read this one table.

export interface NumberField {
  kind: "number";
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  hint?: string;
}

export interface Option {
  id: string;
  label: string;
  /** Short price hint, e.g. "$107.63/m". */
  price?: string;
  group?: string;
}

export interface ChoiceField {
  kind: "choice";
  label: string;
  options: Option[];
}

export type Field = NumberField | ChoiceField;

export const priceHint = (offer: Offer): string | undefined => {
  if (offer.price === null) return undefined;
  const per = offer.unit === "each" ? "" : `/${offer.unit}`;
  return `$${offer.price < 10 ? offer.price.toFixed(2) : offer.price.toFixed(offer.price < 100 ? 2 : 0)}${per}`;
};

const num = (label: string, min: number, max: number, step: number, unit: string, hint?: string): NumberField => ({ kind: "number", label, min, max, step, unit, hint });

const stockOptions: Option[] = stock.map((s) => ({
  id: s.id,
  label: s.kind === "tube" ? s.name.replace("Steel tube ", "") : s.id,
  price: priceHint(s.offer),
  group: s.kind === "tube" ? "Steel tube" : /^\d+-/.test(s.id) ? "80/20 metric" : "80/20 inch",
}));

const guideOptions: Option[] = guides.map((g) => ({ id: g.id, label: `${g.id} + ${g.block.name.replace(" carriage", "")}`, price: priceHint(g.rail.offer) }));
const driveOptions: Option[] = drives.map((d) => ({
  id: d.id,
  label: d.kind === "ballscrew" ? `${d.id} ball screw` : `${d.id} belt`,
  price: d.kind === "ballscrew" ? priceHint(d.kit.offer) : priceHint(d.belt.offer),
  group: d.kind === "ballscrew" ? "Ball screw" : "Belt",
}));
const motorOptions: Option[] = motors.map((m) => ({ id: m.id, label: `${m.id} · ${m.holdingNm} N·m`, price: priceHint(m.offer) }));

export const fields: Record<string, Field> = {
  "work.x": num("X travel", 200, 2000, 10, "mm", "Across the gantry"),
  "work.y": num("Y travel", 200, 2500, 10, "mm", "Along the base"),
  "work.z": num("Z travel", 50, 300, 5, "mm"),
  "frame.stock": { kind: "choice", label: "Base stock", options: stockOptions },
  "frame.joinery": {
    kind: "choice",
    label: "Joints",
    options: [
      { id: "brackets", label: "Brackets" },
      { id: "plates", label: "Plates" },
      { id: "welded", label: "Welded" },
    ],
  },
  "gantry.beam": { kind: "choice", label: "Gantry beam", options: stockOptions },
  "gantry.beams": { kind: "choice", label: "Beams", options: [{ id: "1", label: "Single" }, { id: "2", label: "Stacked pair" }] },
  "gantry.plateMm": num("Plate thickness", 6, 25, 1, "mm", "Gantry sides and Z plates"),
  "gantry.clearanceMm": num("Gantry clearance", 60, 300, 5, "mm", "Table to beam underside"),
  ...Object.fromEntries(
    (["x", "y", "z"] as const).flatMap((a) => [
      [`${a}.guide`, { kind: "choice", label: "Guide", options: guideOptions }],
      [`${a}.drive`, { kind: "choice", label: "Drive", options: driveOptions }],
      [`${a}.motor`, { kind: "choice", label: "Motor", options: motorOptions }],
    ]),
  ),
  spindle: { kind: "choice", label: "Spindle", options: spindles.map((s) => ({ id: s.id, label: s.name, price: priceHint(s.offer) })) },
  controller: { kind: "choice", label: "Controller", options: controllers.map((c) => ({ id: c.id, label: c.name, price: priceHint(c.offer) })) },
  cutN: num("Design cutting force", 20, 500, 5, "N", "Peak force at the tool"),
};

/** Whether a value read from the URL hash is one the form could have produced. */
export function validField(key: string, value: string | number): boolean {
  const f = fields[key];
  if (!f) return false;
  if (f.kind === "number") return typeof value === "number" && value >= f.min && value <= f.max;
  return f.options.some((o) => o.id === String(value));
}
