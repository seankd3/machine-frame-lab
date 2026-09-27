import { describe, expect, it } from "vitest";
import { designFor } from "./design";
import { defaultMachine } from "./document";
import { goalsFor, minModeHz, type Requirements } from "./requirements";
import { localEvaluator } from "./search";

describe("design from requirements", () => {
  it("returns passing picks ordered by cost, all within the builder's constraints", async () => {
    const req: Requirements = { material: "aluminium", budget: 4500, pace: "standard", weld: false };
    const t0 = performance.now();
    const r = await designFor(defaultMachine, req, localEvaluator);
    console.log(`evaluated ${r.evaluated} in ${Math.round(performance.now() - t0)} ms; overBudget=${r.overBudget}`);
    for (const p of r.picks) console.log(`  ${p.kind.padEnd(9)} from ${p.template}: $${Math.round(p.q.cost)} δ ${p.q.deflectionUm.toFixed(0)} µm f1 ${p.f1?.toFixed(1)} | ${p.steps.join("; ")}`);
    const g = goalsFor(req);
    expect(r.picks.length).toBeGreaterThan(0);
    for (let i = 1; i < r.picks.length; i++) expect(r.picks[i].q.cost).toBeGreaterThanOrEqual(r.picks[i - 1].q.cost);
    for (const p of r.picks) {
      expect(p.passes).toBe(true);
      expect(p.q.deflectionUm).toBeLessThanOrEqual(g.deflectionUm);
      expect(p.f1!).toBeGreaterThanOrEqual(minModeHz(req) * 0.98);
      expect(p.machine.frame.joinery).not.toBe("welded");
      expect(p.machine.spindle).toBe(defaultMachine.spindle);
      expect(p.machine.gantry.clearanceMm).toBe(defaultMachine.gantry.clearanceMm);
      expect(p.machine.work).toEqual(defaultMachine.work);
    }
  }, 240000);
});
