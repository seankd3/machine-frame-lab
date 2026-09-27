import { describe, expect, it } from "vitest";
import { defaultMachine } from "./document";
import { explore, moves, quick, rank } from "./explore";

describe("one-change exploration", () => {
  it("tries every single change and ranks real improvements", () => {
    const t0 = performance.now();
    const base = quick(defaultMachine);
    const variants = [...explore(defaultMachine)].flatMap((s) => s.variants);
    const ms = performance.now() - t0;
    expect(variants.length).toBeGreaterThan(moves(defaultMachine).length * 0.9);
    console.log(`${variants.length} variants in ${Math.round(ms)} ms`);

    const r = rank(base, variants, { deflectionUm: 50, rapidMmMin: 5000, accelMs2: 1, budget: 3000, weld: false });
    expect(r.stiffer.length).toBeGreaterThan(0);
    for (const s of r.stiffer) expect(s.quick.deflectionUm).toBeLessThan(base.deflectionUm);
    for (const s of r.cheaper) {
      expect(s.dCost).toBeLessThan(0);
      expect(s.priceUnknown, s.label).toBe(false);
    }
    // No welding offered to a builder who cannot weld.
    for (const s of [...r.stiffer, ...r.faster, ...r.cheaper]) expect(s.quick.welded, s.label).toBe(false);
    // Swapping the base to an unpriced profile is never presented as a saving.
    expect(r.cheaper.some((s) => s.key === "frame.stock" && s.value === "40-8080")).toBe(false);
    // A stacked gantry beam is a textbook stiffening move for this machine.
    expect(r.stiffer.some((s) => s.key === "gantry.beams")).toBe(true);
  });
});
