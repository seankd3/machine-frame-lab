import { describe, expect, it } from "vitest";
import { assemble, emptyFrame, solveModes, solveStatic, type BeamSection, type Vec3 } from "./frame";

const section: BeamSection = { e: 69e9, g: 26e9, a: 1.5e-3, iy: 2.5e-7, iz: 9.8e-7, j: 1.1e-7, massPerLength: 4.1 };
const L = 1.1;

/** A straight member split into n beams from p along unit direction dir. */
function member(dir: Vec3, n: number, up: Vec3 = [0, 0, 1]) {
  const f = emptyFrame();
  for (let i = 0; i <= n; i++) f.nodes.push(dir.map((d) => (d * L * i) / n) as Vec3);
  for (let i = 0; i < n; i++) f.beams.push({ a: i, b: i + 1, section, up, tag: "m" });
  return f;
}

// The frame solver is the core of every machine result; these hold it to
// closed-form beam theory in all six DOFs and under arbitrary orientation.
describe("frame FE", () => {
  it("cantilever tip: bending both planes, axial and torsion match closed form", () => {
    const f = member([1, 0, 0], 8);
    f.fixed.set(0, [0, 1, 2, 3, 4, 5]);
    const s = assemble(f);
    const tip = 8 * 6;
    const u = solveStatic(s, [{ node: 8, f: [1000, 100, 100, 10, 0, 0] }]);
    expect(u[tip + 0] / ((1000 * L) / (section.e * section.a))).toBeCloseTo(1, 6);
    // up = +z, so iz resists z deflection and iy resists y deflection.
    expect(u[tip + 1] / ((100 * L ** 3) / (3 * section.e * section.iy))).toBeCloseTo(1, 6);
    expect(u[tip + 2] / ((100 * L ** 3) / (3 * section.e * section.iz))).toBeCloseTo(1, 6);
    expect(u[tip + 3] / ((10 * L) / (section.g * section.j))).toBeCloseTo(1, 6);
  });

  it("a member along an arbitrary direction deflects the same as along x", () => {
    const dir: Vec3 = [0.48, 0.64, 0.6];
    const up: Vec3 = [-0.8, 0.6, 0]; // normal to dir → local y
    const f = member(dir, 6, up);
    f.fixed.set(0, [0, 1, 2, 3, 4, 5]);
    const u = solveStatic(assemble(f), [{ node: 6, f: [up[0] * 100, up[1] * 100, up[2] * 100, 0, 0, 0] }]);
    const along = u[36] * up[0] + u[37] * up[1] + u[38] * up[2];
    expect(along / ((100 * L ** 3) / (3 * section.e * section.iz))).toBeCloseTo(1, 6);
  });

  it("pinned-pinned first modes in both planes match closed form", () => {
    const f = member([1, 0, 0], 20);
    f.fixed.set(0, [0, 1, 2, 3]);
    f.fixed.set(20, [1, 2, 3]);
    const modes = solveModes(assemble(f), 3);
    const exact = (i: number) => ((Math.PI ** 2) / (2 * Math.PI * L ** 2)) * Math.sqrt((section.e * i) / section.massPerLength);
    expect(modes[0].hz / exact(section.iy)).toBeCloseTo(1, 3);
    expect(modes[1].hz / exact(section.iz)).toBeCloseTo(1, 3);
  });

  it("a joint spring in series adds its compliance", () => {
    const f = member([1, 0, 0], 4);
    f.nodes.unshift([0, 0, 0]);
    f.beams = f.beams.map((b) => ({ ...b, a: b.a + 1, b: b.b + 1 }));
    const kr = 5e4; // N·m/rad at the root, about z
    f.springs.push({ a: 0, b: 1, k: [1e12, 1e12, 1e12, 1e12, 1e12, kr], tag: "joint" });
    f.fixed.set(0, [0, 1, 2, 3, 4, 5]);
    const u = solveStatic(assemble(f), [{ node: 5, f: [0, 100, 0, 0, 0, 0] }]);
    const exact = (100 * L ** 3) / (3 * section.e * section.iy) + (100 * L * L) / kr;
    expect(u[5 * 6 + 1] / exact).toBeCloseTo(1, 4);
  });
});
