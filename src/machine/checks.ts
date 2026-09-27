import type { Compiled } from "./compile";
import { AXES, type Performance } from "./simulate";

// Plain-language engineering findings about a compiled machine: parts that
// will not work well together, and costs the BOM cannot see. Whether the
// design meets its requirements (stiffness, modes, speed, budget) is scored
// separately in requirements.ts.

export type Severity = "bad" | "warn" | "info";

export interface Finding {
  severity: Severity;
  title: string;
  detail: string;
}

const KIT_LENGTH_MM = 1000;

export function checks(c: Compiled, perf: Performance): Finding[] {
  const out: Finding[] = [];
  const { m, r, d } = { m: c.machine, r: c.r, d: c.d };

  for (const axis of AXES) {
    const mo = perf.motion[axis];
    const motor = axis === "x" ? r.mx : axis === "y" ? r.my : r.mz;
    if (mo.currentShare < 0.9) {
      out.push({
        severity: "warn",
        title: `${axis.toUpperCase()} motor starved of current`,
        detail: `${r.controller.driverName} drivers reach ${(r.controller.driverPeakA! / Math.SQRT2).toFixed(1)} A RMS; the ${motor.sku} is rated ${motor.ratedA} A, so it makes about ${Math.round(mo.currentShare * 100)} % of its torque.`,
      });
    }
    if (mo.accelMs2 <= 0) {
      out.push({ severity: "bad", title: `${axis.toUpperCase()} axis cannot lift its load`, detail: `The motor cannot hold the moving mass against gravity. Use a finer lead or a larger motor.` });
    }
  }
  const screwLen: Record<string, number> = { x: d.beamLen - 20, y: d.baseL - 30, z: d.zp1 - d.zp0 - 30 };
  const long = AXES.filter((axis) => {
    const drive = axis === "x" ? r.dx : axis === "y" ? r.dy : r.dz;
    return drive.kind === "ballscrew" && drive.kit.offer.price !== null && screwLen[axis] > KIT_LENGTH_MM;
  });
  if (long.length) {
    out.push({
      severity: "info",
      title: `Screws over ${KIT_LENGTH_MM} mm`,
      detail: `${long.map((a) => `${a.toUpperCase()} ${Math.round(screwLen[a])} mm`).join(", ")}. Kit prices are for ${KIT_LENGTH_MM} mm screws; budget more for longer ones.`,
    });
  }

  if (m.frame.joinery === "brackets" && r.frame.kind === "tube") {
    out.push({ severity: "bad", title: "Corner brackets need T-slot", detail: "Steel tube has no slots for bracket T-nuts. Weld the base or bolt it through plates." });
  }
  if (m.frame.joinery === "welded" && r.frame.kind === "tslot") {
    out.push({ severity: "warn", title: "Welded aluminium extrusion", detail: "6063 extrusion loses about half its strength next to a weld. Plates or brackets are the usual joint." });
  }
  if (r.spindle.diameterMm > d.zW - 40) {
    out.push({ severity: "warn", title: "Spindle is wide for the Z carriage", detail: `The ${r.spindle.diameterMm} mm body leaves little room beside the Z rails.` });
  }
  return out;
}
