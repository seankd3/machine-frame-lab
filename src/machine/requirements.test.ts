import { describe, expect, it } from "vitest";
import { analyze } from "./analyze";
import { bom } from "./bom";
import { compile } from "./compile";
import { defaultMachine } from "./document";
import { presets } from "./presets";
import { defaultRequirements, formatRequirements, MATERIALS, parseRequirements, score, type Requirements } from "./requirements";

const scored = (req: Requirements, machine = defaultMachine) => {
  const m = { ...machine, cutN: MATERIALS[req.material].cutN };
  const r = analyze(m);
  if (!r.ok) throw new Error(r.error);
  return score(req, { machine: m, perf: r.analysis.perf, modes: r.analysis.modes, bom: bom(compile(m)) });
};

describe("requirements", () => {
  it("round-trips through the URL and rejects junk", () => {
    const req: Requirements = { material: "steel", budget: 4200, pace: "production", weld: true };
    expect(parseRequirements(formatRequirements(req))).toEqual(req);
    expect(parseRequirements("req.material=titanium&req.budget=-5&req.pace=warp")).toEqual(defaultRequirements);
  });

  it("scores every target, and a looser material is easier to meet", () => {
    const wood = scored({ ...defaultRequirements, material: "wood" });
    const steel = scored({ ...defaultRequirements, material: "steel" });
    expect(wood.map((t) => t.key)).toEqual(["deflection", "mode", "rapid", "accel", "budget", "fabrication"]);
    const margin = (ts: typeof wood) => ts.find((t) => t.key === "deflection")!.margin;
    expect(margin(wood)).toBeGreaterThan(margin(steel));
    for (const t of wood) expect(t.pass).toBe(t.margin >= 0);
  });

  it("rules out a welded frame when the builder cannot weld", () => {
    const steelMill = presets.find((p) => p.id === "steel")!.machine;
    const noWeld = scored({ ...defaultRequirements, weld: false }, steelMill).find((t) => t.key === "fabrication")!;
    const weld = scored({ ...defaultRequirements, weld: true }, steelMill).find((t) => t.key === "fabrication")!;
    expect(noWeld.pass).toBe(false);
    expect(weld.pass).toBe(true);
  });
});
