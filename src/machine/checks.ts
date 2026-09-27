import type { Compiled } from "./compile";
import { AXES, type Performance } from "./simulate";

// Plain-language findings about a compiled machine: what will limit it, what
// will not fit together, and where the price is incomplete. Each finding says
// what to change; none of them blocks the design.

export type Severity = "bad" | "warn" | "info";

export interface Finding {
  severity: Severity;
  title: string;
  detail: string;
}

/**
 * Tool deflection at the design force (µm). Once it rivals the chip load
 * (about 50 µm per tooth for a ¼" cutter in aluminium) the cut chatters;
 * at three times that only light wood passes stay clean.
 */
export const DEFLECTION = { good: 50, soft: 150 };
/** Lowest frame mode (Hz): below this, direction changes and cutting excite it readily. */
export const MIN_MODE_HZ = 30;
/** Rapid (mm/min) below which an axis feels slow for routing sheet goods. */
export const SLOW_RAPID = 3000;
const KIT_LENGTH_MM = 1000;

export function checks(c: Compiled, perf: Performance, firstModeHz: number): Finding[] {
  const out: Finding[] = [];
  const { m, r, d } = { m: c.machine, r: c.r, d: c.d };

  const worst = AXES.reduce((a, b) => (perf.deflection[b] > perf.deflection[a] ? b : a));
  const w = perf.deflection[worst];
  const top = perf.budget[worst][0];
  if (w > DEFLECTION.soft) {
    out.push({
      severity: "bad",
      title: `${Math.round(w)} µm of tool deflection in ${worst.toUpperCase()}`,
      detail: `At ${m.cutN} N the tool moves too far for anything but light wood passes. ${top ? `${top.name} takes ${Math.round(top.share * 100)} % of it; stiffen that first.` : ""}`,
    });
  } else if (w > DEFLECTION.good) {
    out.push({
      severity: "warn",
      title: `${Math.round(w)} µm of tool deflection in ${worst.toUpperCase()}`,
      detail: `Fine for wood and plastics; aluminium wants less than a chip load, about ${DEFLECTION.good} µm. ${top ? `${top.name} is the largest share (${Math.round(top.share * 100)} %).` : ""}`,
    });
  }

  if (firstModeHz < MIN_MODE_HZ) {
    out.push({
      severity: "warn",
      title: `First frame mode at ${firstModeHz.toFixed(1)} Hz`,
      detail: `Below ${MIN_MODE_HZ} Hz the frame rings on direction changes and chatters at common tooth-pass rates. Lighter moving mass or a deeper gantry beam raises it.`,
    });
  }

  const slow: string[] = [];
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
    } else if (mo.rapidMmMin < SLOW_RAPID) {
      slow.push(`${axis.toUpperCase()} ${(mo.rapidMmMin / 1000).toFixed(1)} m/min (${mo.limitedBy})`);
    }
  }
  if (slow.length) {
    out.push({ severity: "info", title: `Rapids under ${SLOW_RAPID / 1000} m/min`, detail: `${slow.join("; ")}. A coarser lead or a belt trades some stiffness for speed.` });
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
