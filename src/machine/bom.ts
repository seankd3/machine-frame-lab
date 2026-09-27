import type { Offer } from "../catalog/types";
import type { Group } from "./assembly";
import type { Compiled } from "./compile";

// The bill of materials is the compiled parts grouped by catalogue item:
// quantities summed, stock cut lists gathered, priced where a source exists.

export interface BomLine {
  sku: string;
  name: string;
  group: Group;
  qty: number;
  unit: Offer["unit"];
  /** Cut lengths (mm) for stock sold by the metre, longest first. */
  cuts: number[];
  /** Cutting fees included in the total. */
  cutFee: number;
  offer: Offer;
  /** null when the item has no sourced price. */
  total: number | null;
}

export interface Bom {
  lines: BomLine[];
  /** Sum of priced lines. */
  total: number;
  unpriced: number;
}

export function bom(c: Compiled): Bom {
  const lines = new Map<string, BomLine>();
  for (const part of c.asm.parts) {
    if (part.qty <= 0) continue;
    const { item } = part;
    let line = lines.get(item.sku);
    if (!line) {
      line = { sku: item.sku, name: item.name, group: part.group, qty: 0, unit: item.offer.unit, cuts: [], cutFee: 0, offer: item.offer, total: null };
      lines.set(item.sku, line);
    }
    line.qty += part.qty;
    if (part.cutMm) line.cuts.push(part.cutMm);
  }
  let total = 0;
  let unpriced = 0;
  for (const line of lines.values()) {
    line.cuts.sort((a, b) => b - a);
    // Stock is bought in whole centimetres; sheets and kilograms to a tenth.
    if (line.unit === "m") line.qty = Math.ceil(line.qty * 100) / 100;
    if (line.unit === "sheet" || line.unit === "kg") line.qty = Math.ceil(line.qty * 10) / 10;
    line.cutFee = (line.offer.perCut ?? 0) * line.cuts.length;
    line.total = line.offer.price === null ? null : line.offer.price * line.qty + line.cutFee;
    if (line.total === null) unpriced++;
    else total += line.total;
  }
  const order: Group[] = ["Base", "Y axis", "Gantry", "X axis", "Z axis", "Spindle", "Electronics"];
  return {
    lines: [...lines.values()].sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group) || (b.total ?? 0) - (a.total ?? 0)),
    total,
    unpriced,
  };
}
