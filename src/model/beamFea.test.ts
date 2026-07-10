import { describe, expect, it } from "vitest";
import { runBeamFea } from "./beamFea";

const lengthM = 1.2;
const eiNm2 = 85_000;
const massKgM = 9.5;
const loadN = 1_000;
const elements = 40;

describe("runBeamFea", () => {
  it.each([
    {
      support: "simply-supported" as const,
      loadPositionPct: 50,
      deflectionM: (loadN * lengthM ** 3) / (48 * eiNm2),
      beta: Math.PI,
    },
    {
      support: "fixed-fixed" as const,
      loadPositionPct: 50,
      deflectionM: (loadN * lengthM ** 3) / (192 * eiNm2),
      beta: 4.730040744862704,
    },
    {
      support: "cantilever" as const,
      loadPositionPct: 100,
      deflectionM: (loadN * lengthM ** 3) / (3 * eiNm2),
      beta: 1.875104068711961,
    },
  ])(
    "matches closed-form static deflection and first mode for $support",
    ({ beta, deflectionM, loadPositionPct, support }) => {
      const result = runBeamFea({
        lengthM,
        elements,
        eiNm2,
        massKgM,
        pointMassKg: 0,
        loadN,
        loadPositionPct,
        support,
      });
      const expectedFrequencyHz =
        (beta ** 2 / (Math.PI * 2 * lengthM ** 2)) * Math.sqrt(eiNm2 / massKgM);

      expectRelative(result.maxDeflectionM, deflectionM, 0.015);
      expectRelative(result.frequenciesHz[0], expectedFrequencyHz, 0.01);
      expect(result.modeShapes[0]?.points).toHaveLength(36);
    },
  );
});

function expectRelative(received: number, expected: number, tolerance: number) {
  const relativeError = Math.abs(received - expected) / Math.max(Math.abs(expected), 1e-12);
  expect(relativeError).toBeLessThanOrEqual(tolerance);
}
