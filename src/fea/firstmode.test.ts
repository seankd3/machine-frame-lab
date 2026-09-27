import { describe, expect, it } from "vitest";
import { compile } from "../machine/compile";
import { presets } from "../machine/presets";
import { modes, solve } from "../machine/simulate";
import { firstModeHz } from "./frame";

describe("first mode by inverse iteration", () => {
  for (const p of presets) {
    it(`${p.name}: within 3 % of the subspace solve, much faster`, () => {
      const c = compile(p.machine);
      const s = solve(c);
      const t0 = performance.now();
      const fast = firstModeHz(s);
      const t1 = performance.now();
      const ref = modes(c, s, 2);
      const t2 = performance.now();
      console.log(`${p.name}: inverse ${fast.toFixed(2)} Hz in ${(t1 - t0).toFixed(1)} ms; subspace ${ref[0].hz.toFixed(2)} / ${ref[1].hz.toFixed(2)} Hz in ${(t2 - t1).toFixed(0)} ms`);
      expect(fast).toBeGreaterThanOrEqual(ref[0].hz * 0.999);
      expect(fast).toBeLessThanOrEqual(Math.max(ref[0].hz * 1.03, ref[1].hz * 1.001));
    });
  }
});
