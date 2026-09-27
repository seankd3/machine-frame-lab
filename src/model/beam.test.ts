import { describe, expect, it } from "vitest";
import { receptance, solveBeam, type Support } from "./beam";

// The old app reported textbook frequencies with smeared mass and drew fake
// mode shapes; these hold the FE model to closed-form Euler-Bernoulli results.
const L = 1.2;
const EI = 1.5e5;
const m = 4;
const base = { lengthM: L, eiNm2: EI, massKgM: m, pointMassKg: 0 };

const cases: Array<{ support: Support; station: number; deflection: number; beta: number[] }> = [
  { support: "pinned", station: 0.5, deflection: L ** 3 / (48 * EI), beta: [Math.PI, 2 * Math.PI, 3 * Math.PI] },
  { support: "fixed", station: 0.5, deflection: L ** 3 / (192 * EI), beta: [4.73004, 7.85321, 10.9956] },
  { support: "cantilever", station: 1, deflection: L ** 3 / (3 * EI), beta: [1.87510, 4.69409, 7.85476] },
];

describe("solveBeam", () => {
  for (const c of cases) {
    it(`${c.support}: static compliance and first three modes match closed form`, () => {
      const beam = solveBeam({ ...base, support: c.support, station: c.station });
      expect(beam.compliance / c.deflection).toBeCloseTo(1, 6);
      c.beta.forEach((beta, i) => {
        const exact = (beta ** 2 / (2 * Math.PI * L ** 2)) * Math.sqrt(EI / m);
        expect(beam.modes[i].hz / exact).toBeCloseTo(1, 3);
      });
    });
  }

  it("off-grid station: pinned beam deflection under the load matches closed form", () => {
    const a = 0.37 * L;
    const b = L - a;
    const beam = solveBeam({ ...base, support: "pinned", station: 0.37 });
    expect(beam.compliance / ((a * a * b * b) / (3 * EI * L))).toBeCloseTo(1, 6);
  });

  it("carriage point mass: cantilever tip mass matches the Rayleigh-corrected closed form", () => {
    const tip = 10;
    const beam = solveBeam({ ...base, support: "cantilever", station: 1, pointMassKg: tip });
    const exact = Math.sqrt((3 * EI) / L ** 3 / (tip + 0.2357 * m * L)) / (2 * Math.PI);
    expect(beam.modes[0].hz / exact).toBeCloseTo(1, 2);
  });

  it("receptance at 0 Hz equals static compliance (complete modal set)", () => {
    const beam = solveBeam({ ...base, support: "fixed", station: 0.3, pointMassKg: 12 });
    expect(receptance(beam, 0, 0.02) / beam.compliance).toBeCloseTo(1, 6);
  });
});
