import { describe, expect, it } from "vitest";
import { defaultMachine } from "./document";
import { presets } from "./presets";
import { goalsFor, MATERIALS, type Requirements } from "./requirements";
import { search, type SearchResult } from "./search";


async function run(start: typeof defaultMachine, req: Requirements): Promise<SearchResult> {
  const t0 = performance.now();
  const it = search({ ...start, cutN: MATERIALS[req.material].cutN }, goalsFor(req));
  let r = await it.next();
  while (!r.done) r = await it.next();
  const res = r.value;
  console.log(`\n${req.material}/${req.pace} $${req.budget}: feasible=${res.feasible} evaluated=${res.evaluated} in ${Math.round(performance.now() - t0)} ms`);
  for (const c of res.candidates)
    console.log(`  ${c.kind.padEnd(9)} $${Math.round(c.q.cost)} δ=${c.q.deflectionUm.toFixed(0)} µm rapid=${(c.q.rapidMmMin / 1000).toFixed(1)} f1=${c.f1?.toFixed(1)} | ${c.steps.join("; ")}`);
  return res;
}

describe("design search", () => {
  it("finds an aluminium-capable router and keeps its promises", async () => {
    const req: Requirements = { material: "aluminium", budget: 4500, pace: "standard", weld: false };
    const res = await run(defaultMachine, req);
    const g = goalsFor(req);
    expect(res.feasible).toBe(true);
    const cheapest = res.candidates.find((c) => c.kind === "cheapest")!;
    for (const c of res.candidates) {
      expect(c.q.deflectionUm).toBeLessThanOrEqual(g.deflectionUm);
      expect(c.f1!).toBeGreaterThanOrEqual(g.minModeHz * 0.98);
      expect(c.machine.spindle).toBe(defaultMachine.spindle);
      expect(c.q.rapidMmMin).toBeGreaterThanOrEqual(g.rapidMmMin);
      expect(c.machine.frame.joinery).not.toBe("welded");
      expect(c.q.unbuildable).toBe(false);
      expect(c.q.cost).toBeGreaterThanOrEqual(cheapest.q.cost - 1e-6);
    }
    // Along the frontier, money buys stiffness.
    for (let i = 1; i < res.frontier.length; i++) expect(res.frontier[i].q.deflectionUm).toBeLessThan(res.frontier[i - 1].q.deflectionUm);
  }, 120000);

  it("designs a small wood router from the desktop template", async () => {
    await run(presets[0].machine, { material: "wood", budget: 2000, pace: "hobby", weld: false });
  }, 120000);
});
