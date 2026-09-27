import { describe, expect, it } from "vitest";
import { analyze } from "./analyze";
import { bom } from "./bom";
import { compile } from "./compile";
import { checks } from "./checks";
import { presets } from "./presets";
import { modes, performance, solve } from "./simulate";

// The build check: unlike reference machines that must always compile into a
// solvable structure with a coherent BOM. A change that breaks one of them is
// not finished, whatever it fixed elsewhere.
describe("build check", () => {
  for (const { name, machine } of presets) {
    it(`${name}: compiles, solves, and bills every part`, () => {
      const c = compile(machine);
      for (const p of c.asm.parts) expect(p.matrix.every(Number.isFinite), p.label).toBe(true);

      const solved = solve(c); // throws on a mechanism
      const perf = performance(c, solved);
      for (const axis of ["x", "y", "z"] as const) {
        expect(perf.stiffness[axis], `${axis} stiffness`).toBeGreaterThan(0.01);
        expect(perf.stiffness[axis], `${axis} stiffness`).toBeLessThan(1000);
        expect(perf.motion[axis].accelMs2, `${axis} accel`).toBeGreaterThan(0);
        expect(perf.motion[axis].rapidMmMin, `${axis} rapid`).toBeGreaterThan(0);
        expect(perf.budget[axis].reduce((s, b) => s + b.share, 0)).toBeGreaterThan(0.95);
      }
      const first = modes(c, solved, 2)[0].hz;
      expect(first).toBeGreaterThan(5);
      expect(first).toBeLessThan(2000);

      const b = bom(c);
      const billed = new Set(b.lines.map((l) => l.sku));
      for (const p of c.asm.parts) if (p.qty > 0) expect(billed.has(p.item.sku), p.label).toBe(true);
      for (const l of b.lines) expect(l.offer.url, l.name).toMatch(/^https:\/\//);
      const priced = b.lines.reduce((s, l) => s + (l.total ?? 0), 0);
      expect(b.total).toBeCloseTo(priced, 6);
      expect(b.total, "sourced prices reach the BOM").toBeGreaterThan(100);
      for (const l of b.lines) if (l.total !== null) expect(Number.isFinite(l.total), l.name).toBe(true);

      for (const f of checks(c, perf, first)) expect(f.title.length, f.title).toBeGreaterThan(0);
    });
  }
});

describe("costing", () => {
  it("charges 80/20's cut fee once per cut", () => {
    const c = compile(presets[1].machine);
    const frame = bom(c).lines.find((l) => l.sku === "8020-40-4080")!;
    expect(frame.offer.perCut).toBe(3.79);
    expect(frame.cutFee).toBeCloseTo(3.79 * frame.cuts.length, 6);
    expect(frame.total).toBeCloseTo(frame.offer.price! * frame.qty + frame.cutFee, 6);
  });

  it("bills a coupler for screws but not belts", () => {
    const belts = compile(presets[0].machine).asm.parts.filter((p) => p.label === "Flexible coupler");
    expect(belts).toHaveLength(1); // Z only
    const screws = compile(presets[1].machine).asm.parts.filter((p) => p.label === "Flexible coupler");
    expect(screws).toHaveLength(4); // X, Z and both Y
  });

  it("derates torque when drivers cannot reach rated current", () => {
    const full = performance(compile(presets[2].machine));
    const starved = performance(compile({ ...presets[2].machine, controller: "fluidnc-6pack" }));
    expect(full.motion.x.currentShare).toBeCloseTo(5.6 / Math.SQRT2 / 4.2, 3);
    expect(starved.motion.x.currentShare).toBeCloseTo(4.2 / Math.SQRT2 / 4.2, 3);
    expect(starved.motion.x.accelMs2).toBeLessThan(full.motion.x.accelMs2);
  });
});

describe("analysis", () => {
  it("returns plain data that survives the trip from a worker", () => {
    const result = analyze(presets[1].machine);
    if (!result.ok) throw new Error(result.error);
    expect(structuredClone(result)).toEqual(result);
    const { modes } = result.analysis;
    expect(modes.length).toBe(4);
    for (const m of modes) {
      expect(m.tool.x + m.tool.y + m.tool.z).toBeCloseTo(1, 6);
      expect(m.budget.reduce((s, b) => s + b.share, 0)).toBeGreaterThan(0.95);
    }
  });
});
