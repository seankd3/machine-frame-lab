import { describe, expect, it } from "vitest";
import { bom } from "./bom";
import { compile } from "./compile";
import { defaultMachine, type Machine } from "./document";
import { modes, performance, solve } from "./simulate";

// The build check: unlike reference machines that must always compile into a
// solvable structure with a coherent BOM. A change that breaks one of them is
// not finished, whatever it fixed elsewhere.
const reference: Record<string, Machine> = {
  "desktop belt router": {
    ...defaultMachine,
    work: { x: 400, y: 400, z: 80 },
    frame: { stock: "20-2040", joinery: "brackets" },
    gantry: { beam: "20-2040", beams: 1, plateMm: 8, clearanceMm: 100 },
    x: { guide: "MGN12", drive: "GT2-9", motor: "17HS19" },
    y: { guide: "MGN12", drive: "GT2-9", motor: "17HS19" },
    z: { guide: "MGN12", drive: "SFU1605", motor: "17HS19" },
    spindle: "makita-rt0701c",
    controller: "openbuilds-blackbox",
    cutN: 60,
  },
  "default aluminium router": defaultMachine,
  "welded steel mill": {
    ...defaultMachine,
    work: { x: 900, y: 1200, z: 200 },
    frame: { stock: "tube-4x2x0.1875", joinery: "welded" },
    gantry: { beam: "tube-3x3x0.1875", beams: 2, plateMm: 20, clearanceMm: 220 },
    x: { guide: "HGR25", drive: "SFU2005", motor: "23HS45" },
    y: { guide: "HGR25", drive: "SFU2005", motor: "23HS45" },
    z: { guide: "HGR20", drive: "SFU2005", motor: "23HS45" },
    cutN: 300,
  },
};

describe("build check", () => {
  for (const [name, machine] of Object.entries(reference)) {
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
    });
  }
});
