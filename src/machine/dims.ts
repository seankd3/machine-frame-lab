import { getController, getSpindle, type Controller, type Spindle } from "../catalog/equipment";
import { getDrive, getGuide, getMotor, type Drive, type Guide, type Motor } from "../catalog/motion";
import { getStock, type Stock } from "../catalog/stock";
import type { Machine } from "./document";

// Every derived dimension of a moving-gantry router, from the document alone.
// Millimetres; X across the gantry, Y along the base (front at y = 0), Z up
// from the floor. The machine is shown with the gantry and carriage centred
// and Z at the bottom of travel, tool touching the table: the softest pose.

export interface Resolved {
  frame: Stock;
  beam: Stock;
  gx: Guide;
  gy: Guide;
  gz: Guide;
  dx: Drive;
  dy: Drive;
  dz: Drive;
  mx: Motor;
  my: Motor;
  mz: Motor;
  spindle: Spindle;
  controller: Controller;
}

export function resolve(m: Machine): Resolved {
  const need = <T,>(v: T | undefined, what: string) => {
    if (!v) throw new Error(`Unknown ${what}`);
    return v;
  };
  return {
    frame: need(getStock(m.frame.stock), "frame stock"),
    beam: need(getStock(m.gantry.beam), "gantry beam"),
    gx: need(getGuide(m.x.guide), "X guide"),
    gy: need(getGuide(m.y.guide), "Y guide"),
    gz: need(getGuide(m.z.guide), "Z guide"),
    dx: need(getDrive(m.x.drive), "X drive"),
    dy: need(getDrive(m.y.drive), "Y drive"),
    dz: need(getDrive(m.z.drive), "Z drive"),
    mx: need(getMotor(m.x.motor), "X motor"),
    my: need(getMotor(m.y.motor), "Y motor"),
    mz: need(getMotor(m.z.motor), "Z motor"),
    spindle: need(getSpindle(m.spindle), "spindle"),
    controller: need(getController(m.controller), "controller"),
  };
}

export type Dims = ReturnType<typeof dims>;

export function dims(m: Machine, r: Resolved) {
  const t = m.gantry.plateMm;
  const F = r.frame;

  // Z carriage assembly width sets the X carriage spacing and the beam length.
  const zW = Math.max(2 * r.gx.block.lengthMm + 40, r.spindle.diameterMm + 70, 2 * r.gz.block.widthMm + 50);
  const beamLen = m.work.x + zW + 30;
  const xs = beamLen / 2 + t / 2; // upright and Y rail centreline

  const footL = 2 * r.gy.block.lengthMm + 50;
  const endGap = F.wMm + 25;
  const baseL = m.work.y + footL + 2 * endGap;
  const yG = baseL / 2;

  const feet = 30;
  const zb = feet + F.hMm; // base top
  const zt = zb + 19; // table top (19 mm MDF)
  const zf0 = zb + r.gy.block.heightMm; // gantry foot plate underside
  const zf1 = zf0 + t;
  const beamH = m.gantry.beams * r.beam.hMm;
  const zg0 = zt + m.gantry.clearanceMm;
  const zg1 = zg0 + beamH;
  const beamFront = yG - r.beam.wMm / 2;

  // X rails on the beam's front face, in its outermost slots (or near its edges).
  const module = r.beam.profile?.moduleMm ?? 0;
  const slotZ = r.beam.kind === "tslot"
    ? Array.from({ length: m.gantry.beams * r.beam.slots[1] }, (_, i) => zg0 + (i + 0.5) * module)
    : [zg0 + 20, zg1 - 20];
  const xRailZ = slotZ.length > 1 ? [slotZ[0], slotZ[slotZ.length - 1]] : [slotZ[0]];

  const yXBlockTop = beamFront - r.gx.block.heightMm; // X carriage faces
  const yZPlate = yXBlockTop - t; // Z plate front face
  const yZBlockTop = yZPlate - r.gz.block.heightMm;
  const ySpindlePlate = yZBlockTop - t; // spindle plate front face
  const spindleAxisY = ySpindlePlate - (r.spindle.diameterMm / 2 + 12);

  const zTool = zt;
  const spb = zTool + 64 + 12; // spindle plate bottom, Z at bottom of travel
  const hsp = Math.max(2 * r.gz.block.lengthMm + 50, 140);
  const zRailX = zW / 2 - r.gz.block.widthMm / 2 - 6;
  const zp0 = Math.min(spb - 10, xRailZ[0] - r.gx.block.widthMm / 2 - 15);
  const zp1 = Math.max(spb + hsp + m.work.z + 20, xRailZ[xRailZ.length - 1] + r.gx.block.widthMm / 2 + 15);

  const uprightTop = zg1 + 10;

  return {
    t, zW, beamLen, xs, footL, endGap, baseL, yG, feet, zb, zt, zf0, zf1, beamH, zg0, zg1, beamFront,
    xRailZ, yXBlockTop, yZPlate, yZBlockTop, ySpindlePlate, spindleAxisY, zTool, spb, hsp, zRailX, zp0, zp1,
    uprightTop,
    outer: { x: 2 * xs + F.wMm + 120, y: baseL + 140, z: Math.max(zp1, uprightTop) + 60 },
  };
}
