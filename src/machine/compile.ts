import { hardware } from "../catalog/equipment";
import type { Drive, Guide } from "../catalog/motion";
import type { Stock } from "../catalog/stock";
import type { Vec3 } from "../fea/frame";
import {
  ballNutGeometry,
  blockGeometry,
  buttonHeadGeometry,
  capScrewGeometry,
  couplerGeometry,
  enclosureGeometry,
  footGeometry,
  gussetGeometry,
  memberGeometry,
  motorGeometry,
  plateGeometry,
  railGeometry,
  screwGeometry,
  sheetGeometry,
  spindleGeometry,
  spindleMountGeometry,
  supportGeometry,
} from "../geometry/parts";
import { add, Assembly, neg, place, scale, X, Y, Z, type Axis, type Group, type Member } from "./assembly";
import { dims, resolve, type Dims, type Resolved } from "./dims";
import type { Machine } from "./document";
import { jointSpring, plateBeam, railBeam, spindleBeam, stockBeam } from "./sections";

export interface Compiled {
  machine: Machine;
  r: Resolved;
  d: Dims;
  asm: Assembly;
}

const WELD: [number, number, number, number, number, number] = [1e11, 1e11, 1e11, 1e9, 1e9, 1e9];
const RHO_ALU = 2.7e-6; // kg/mm³

/** Compiles a machine document into placed parts and the matching FE model. */
export function compile(machine: Machine): Compiled {
  const r = resolve(machine);
  const d = dims(machine, r);
  const asm = new Assembly();
  const c = new Compiler(machine, r, d, asm);
  c.base();
  c.gantry();
  c.xAxis();
  c.zAxis();
  c.drives();
  c.electronics();
  asm.finish();
  return { machine, r, d, asm };
}

class Compiler {
  constructor(
    readonly m: Machine,
    readonly r: Resolved,
    readonly d: Dims,
    readonly asm: Assembly,
  ) {}

  sides: Member[] = [];
  crosses: Array<{ member: Member; y: number }> = [];
  yRails: Member[] = [];
  feet: Member[] = [];
  uprights: Member[] = [];
  beams: Member[] = [];
  xRails: Member[] = [];
  zPlate: { verticals: Member[]; rows: Map<number, Member> } = { verticals: [], rows: new Map() };
  spindlePlate: { verticals: Member[]; rows: Map<number, Member> } = { verticals: [], rows: new Map() };
  zRails: Member[] = [];
  spindleMember!: Member;

  // ------------------------------------------------------------ part helpers

  stock(s: Stock, from: Vec3, dir: Vec3, up: Vec3, length: number, group: Group, label: string, rides: Axis[] = []) {
    this.asm.add({
      item: s,
      qty: length / 1000,
      cutMm: Math.round(length),
      shape: `stock-${s.id}`,
      build: () => memberGeometry(s.section(), s.kind === "tube" ? "paint" : "alu"),
      matrix: place(from, dir, up, length),
      group,
      label,
      rides,
      massKg: s.massKgM * (length / 1000),
    });
  }

  plate(w: number, h: number, t: number, at: Vec3, normal: Vec3, up: Vec3, group: Group, label: string, rides: Axis[], holes: Array<[number, number, number]> = []) {
    const mass = w * h * t * RHO_ALU;
    this.asm.add({
      item: hardware.plate(t),
      qty: mass,
      shape: `plate-${Math.round(w)}-${Math.round(h)}-${t}-${holes.length}`,
      build: () => plateGeometry(w, h, t, holes),
      matrix: place(at, normal, up),
      group,
      label,
      rides,
      massKg: mass,
    });
  }

  screw(kind: "button" | "cap", dia: number, length: number, at: Vec3, out: Vec3, group: Group, rides: Axis[]) {
    this.asm.add({
      item: kind === "button" ? hardware.buttonHead(dia, length) : hardware.capScrew(dia, length),
      qty: 1,
      shape: `${kind}-${dia}`,
      build: () => (kind === "button" ? buttonHeadGeometry(dia) : capScrewGeometry(dia, 2)),
      matrix: place(at, out, Math.abs(out[2]) > 0.9 ? X : Z),
      group,
      label: `M${dia} ${kind === "button" ? "button head" : "cap screw"}`,
      rides,
      massKg: 0.0078 * dia * dia * length * 0.001 * 0.8,
    });
  }

  railAndBlocks(g: Guide, start: Vec3, dir: Vec3, up: Vec3, length: number, blocks: number[], group: Group, railRides: Axis[], blockRides: Axis[]) {
    this.asm.add({
      item: g.rail,
      qty: length / 1000,
      cutMm: Math.round(length),
      shape: `rail-${g.id}-${Math.round(length)}`,
      build: () => railGeometry(g.rail, length),
      matrix: place(start, dir, up),
      group,
      label: `${g.id} rail`,
      rides: railRides,
      massKg: g.rail.massKgM * (length / 1000),
    });
    for (const s of blocks) {
      this.asm.add({
        item: g.block,
        qty: 1,
        shape: `block-${g.id}`,
        build: () => blockGeometry({ ...g.block, railWidthMm: g.rail.widthMm, railHeightMm: g.rail.heightMm }),
        matrix: place(add(start, scale(dir, s)), dir, up),
        group,
        label: g.block.name,
        rides: blockRides,
        massKg: g.block.massKg,
      });
    }
  }

  /** Four cap screws through a plate into a carriage block's tapped holes. */
  blockScrews(g: Guide, centre: Vec3, along: Vec3, out: Vec3, group: Group, rides: Axis[]) {
    const across = [
      along[1] * out[2] - along[2] * out[1],
      along[2] * out[0] - along[0] * out[2],
      along[0] * out[1] - along[1] * out[0],
    ] as Vec3;
    for (const a of [-1, 1]) {
      for (const b of [-1, 1]) {
        const p = add(add(centre, scale(across, (a * g.block.holes[0]) / 2)), scale(along, (b * g.block.holes[1]) / 2));
        this.screw("cap", g.block.boltD, this.d.t + 10, p, out, group, rides);
      }
    }
  }

  // ------------------------------------------------------------ FE helpers

  /** Carriage on a rail: stiff across the rail, free along it. */
  slide(rail: Member, station: number, blockFace: Vec3, body: number, along: Axis, g: Guide) {
    const k = g.block.stiffnessNPerUm * 1e6;
    const railNode = rail.at(station);
    const c = this.asm.node(blockFace);
    this.asm.rigid(railNode, c);
    const kk: [number, number, number, number, number, number] = [k, k, k, 0, 0, 0];
    kk["xyz".indexOf(along)] = 0;
    const dNode = this.asm.hinge(c, kk, `carriage-${along}`);
    this.asm.rigid(dNode, body);
    this.asm.mass(dNode, g.block.massKg);
  }

  /** Coincident nodes of one plate or weldment. */
  weld(a: number, b: number) {
    this.asm.spring(a, b, WELD, "weld");
  }

  /** Member end joined to a host node through a rigid offset and a joint spring. */
  join(host: number, end: number, k: [number, number, number, number, number, number], tag: string) {
    const j = this.asm.node(this.asm.point(end));
    this.asm.rigid(host, j);
    this.asm.spring(j, end, k, tag);
  }

  /** Stations at most `step` apart along a length, for rigid rail-to-host ties. */
  ties(length: number, step = 100) {
    const n = Math.max(2, Math.ceil(length / step) + 1);
    return Array.from({ length: n }, (_, i) => (length * i) / (n - 1));
  }

  // ------------------------------------------------------------ base

  base() {
    const { r, d, m, asm } = this;
    const F = r.frame;
    const zc = d.zb - F.hMm / 2;
    const joint = jointSpring(m.frame.joinery);

    for (const s of [-1, 1]) {
      const from: Vec3 = [s * d.xs, 0, zc];
      this.stock(F, from, Y, Z, d.baseL, "Base", "Side rail");
      this.sides.push(asm.member(from, [s * d.xs, d.baseL, zc], stockBeam(F), Z, "base"));
    }

    const inner = 2 * d.xs - F.wMm;
    const middle = Math.max(0, Math.ceil((d.baseL - F.wMm) / 550) - 1);
    const ys = [F.wMm / 2, ...Array.from({ length: middle }, (_, i) => F.wMm / 2 + ((d.baseL - F.wMm) * (i + 1)) / (middle + 1)), d.baseL - F.wMm / 2];
    for (const [i, y] of ys.entries()) {
      const from: Vec3 = [-inner / 2, y, zc];
      this.stock(F, from, X, Z, inner, "Base", "Cross member");
      const member = asm.member(from, [inner / 2, y, zc], stockBeam(F), Z, "base");
      this.crosses.push({ member, y });
      for (const s of [-1, 1]) {
        const end = member.at(s < 0 ? 0 : inner);
        this.join(this.sides[s < 0 ? 0 : 1].at(y), end, joint, `joint-${m.frame.joinery}`);
        const faces = i === 0 ? [1] : i === ys.length - 1 ? [-1] : [-1, 1];
        for (const f of faces) this.cornerHardware([s * (inner / 2), y + (f * F.wMm) / 2, zc], [0, f, 0], [-s, 0, 0]);
      }
    }

    for (const [i, side] of this.sides.entries()) {
      const s = i ? 1 : -1;
      for (const y of [F.wMm / 2, d.baseL / 2, d.baseL - F.wMm / 2]) {
        asm.fix(side.at(y), [0, 1, 2]);
        asm.add({ item: hardware.foot(10), qty: 1, shape: "foot-10", build: () => footGeometry(10), matrix: place([s * d.xs, y, 0], Z, Y), group: "Base", label: "Levelling foot", massKg: 0.15 });
      }
    }

    // Spoilboard on the cross members.
    const sheetW = inner - 4;
    const sheetL = d.baseL - 4;
    asm.add({
      item: hardware.mdf(),
      qty: Math.ceil(((sheetW * sheetL) / (1219 * 2438)) * 10) / 10,
      shape: `mdf-${Math.round(sheetW)}-${Math.round(sheetL)}`,
      build: () => sheetGeometry(sheetW, sheetL, 19),
      matrix: place([0, d.baseL / 2, d.zb], Z, Y),
      group: "Base",
      label: "MDF spoilboard",
      massKg: (sheetW * sheetL * 19 * 0.75e-6) / 1000,
    });

    // Y rails on the side rails, tied along their length.
    const railL = d.baseL - 20;
    for (const [i, side] of this.sides.entries()) {
      const s = i ? 1 : -1;
      const start: Vec3 = [s * d.xs, 10, d.zb];
      const sY = d.footL - r.gy.block.lengthMm - 10;
      this.railAndBlocks(r.gy, start, Y, Z, railL, [d.yG - 10 - sY / 2, d.yG - 10 + sY / 2], "Y axis", [], ["y"]);
      const rail = asm.member([s * d.xs, 10, d.zb + r.gy.rail.heightMm / 2], [s * d.xs, 10 + railL, d.zb + r.gy.rail.heightMm / 2], railBeam(r.gy), Z, "rail");
      for (const t of this.ties(railL)) asm.rigid(side.at(10 + t), rail.at(t));
      this.yRails.push(rail);
    }
  }

  /** Inside-corner gusset with a button head on each leg. */
  cornerHardware(corner: Vec3, legA: Vec3, legB: Vec3) {
    const { r, m, asm } = this;
    const F = r.frame;
    if (m.frame.joinery === "welded") return;
    const heavy = m.frame.joinery === "plates";
    const module = F.profile?.moduleMm ?? Math.min(F.wMm, 40);
    const leg = heavy ? module * 1.9 : module * 0.95;
    const t = heavy ? 6 : 4;
    const slots = F.kind === "tslot" ? F.slots[1] : 1;
    for (let k = 0; k < slots; k++) {
      const z = corner[2] - F.hMm / 2 + (k + 0.5) * (F.hMm / slots);
      const at: Vec3 = [corner[0], corner[1], z];
      asm.add({
        item: hardware.gusset(Math.round(module)),
        qty: 1,
        shape: `gusset-${Math.round(leg)}-${t}`,
        build: () => gussetGeometry(leg, module * 0.9, t),
        matrix: place(at, legA, legB),
        group: "Base",
        label: "Corner gusset",
        massKg: leg * leg * t * 2 * RHO_ALU,
      });
      const bolt = F.kind === "tslot" ? (module >= 40 ? 8 : 5) : 6;
      for (const [along, out] of [[legA, legB], [legB, legA]] as const) {
        for (const f of heavy ? [0.35, 0.75] : [0.6]) {
          this.screw("button", bolt, 16, add(add(at, scale(along, leg * f)), scale(out, t)), out, "Base", []);
        }
      }
    }
  }

  // ------------------------------------------------------------ gantry

  gantry() {
    const { r, d, m, asm } = this;
    const t = d.t;
    const B = r.beam;
    const footW = r.gy.block.widthMm + 30;
    const uprightH = d.uprightTop - d.zf1;
    const plateJoint = jointSpring("plates");
    const sY = d.footL - r.gy.block.lengthMm - 10;

    for (const [i, rail] of this.yRails.entries()) {
      const s = i ? 1 : -1;
      const x = s * d.xs;
      // Foot plate on the two carriages.
      this.plate(footW, d.footL, t, [x, d.yG, d.zf0], Z, Y, "Gantry", "Gantry foot plate", ["y"]);
      const foot = asm.member([x, d.yG - d.footL / 2, d.zf0 + t / 2], [x, d.yG + d.footL / 2, d.zf0 + t / 2], plateBeam(footW, t), X, "gantry");
      this.feet.push(foot);
      for (const yb of [d.yG - sY / 2, d.yG + sY / 2]) {
        this.slide(rail, yb - 10, [x, yb, d.zf0], foot.at(yb - (d.yG - d.footL / 2)), "y", r.gy);
        this.blockScrews(r.gy, [x, yb, d.zf1], Y, Z, "Gantry", ["y"]);
      }

      // Upright plate standing on the foot, gusseted inside.
      this.plate(d.footL, uprightH, t, [x - t / 2, d.yG, d.zf1 + uprightH / 2], X, Z, "Gantry", "Gantry upright", ["y"]);
      const upright = asm.member([x, d.yG, d.zf0 + t / 2], [x, d.yG, d.uprightTop], plateBeam(d.footL, t), Y, "gantry");
      this.uprights.push(upright);
      asm.spring(foot.at(d.footL / 2), upright.at(0), plateJoint, "upright-foot");
      const gusset = Math.min(110, uprightH * 0.45);
      for (const yg of [d.yG - d.footL / 2 + t, d.yG + d.footL / 2 - t * 2]) {
        asm.add({
          item: hardware.plate(t),
          qty: gusset * gusset * 0.5 * t * RHO_ALU,
          shape: `gusset-${Math.round(gusset)}-${t}`,
          build: () => gussetGeometry(gusset, t, t),
          matrix: place([x - s * (t / 2), yg + t / 2, d.zf1], Z, [-s, 0, 0]),
          group: "Gantry",
          label: "Upright gusset",
          rides: ["y"],
          massKg: gusset * gusset * 0.5 * t * RHO_ALU,
        });
      }
    }

    // Beam(s) between the uprights, bolted through them into the end taps.
    for (let k = 0; k < m.gantry.beams; k++) {
      const z = d.zg0 + (k + 0.5) * B.hMm;
      const from: Vec3 = [-d.beamLen / 2, d.yG, z];
      this.stock(B, from, X, Z, d.beamLen, "Gantry", "Gantry beam", ["y"]);
      const beam = asm.member(from, [d.beamLen / 2, d.yG, z], stockBeam(B), Z, "beam");
      this.beams.push(beam);
      for (const [i, upright] of this.uprights.entries()) {
        const s = i ? 1 : -1;
        this.join(upright.at(z - (d.zf0 + t / 2)), beam.at(s < 0 ? 0 : d.beamLen), plateJoint, "beam-upright");
        const cells = B.kind === "tslot" ? B.profile! : null;
        const pts: Array<[number, number]> = cells
          ? Array.from({ length: cells.cols * cells.rows }, (_, n) => [(-B.wMm / 2 + ((n % cells.cols) + 0.5) * cells.moduleMm), -B.hMm / 2 + (Math.floor(n / cells.cols) + 0.5) * cells.moduleMm])
          : [[-B.wMm / 2 + 12, -B.hMm / 2 + 12], [B.wMm / 2 - 12, -B.hMm / 2 + 12], [-B.wMm / 2 + 12, B.hMm / 2 - 12], [B.wMm / 2 - 12, B.hMm / 2 - 12]];
        for (const [py, pz] of pts) this.screw("cap", 8, t + 30, [s * (d.xs + t / 2), d.yG + py, z + pz], [s, 0, 0], "Gantry", ["y"]);
      }
    }
    for (let k = 1; k < this.beams.length; k++) {
      for (const tie of this.ties(d.beamLen, 150)) asm.rigid(this.beams[k - 1].at(tie), this.beams[k].at(tie));
    }
  }

  // ------------------------------------------------------------ X axis

  xAxis() {
    const { r, d, asm } = this;
    const railL = d.beamLen - 10;
    const sX = d.zW - r.gx.block.lengthMm - 10;
    const t = d.t;
    const yPlate = d.yXBlockTop - t / 2;

    // Z plate: a ladder of plate strips through the carriage rows and the Z rail lines.
    const zpH = d.zp1 - d.zp0;
    this.plate(d.zW, zpH, t, [0, d.yXBlockTop, (d.zp0 + d.zp1) / 2], neg(Y), Z, "X axis", "Z axis back plate", ["y", "x"]);
    for (const x of [-d.zRailX, d.zRailX]) {
      this.zPlate.verticals.push(asm.member([x, yPlate, d.zp0], [x, yPlate, d.zp1], plateBeam(d.zW / 2, t), X, "zplate"));
    }
    const rowZ = [...d.xRailZ, d.zp1 - 20];
    for (const z of rowZ) {
      const row = asm.member([-d.zW / 2, yPlate, z], [d.zW / 2, yPlate, z], plateBeam(Math.min(80, zpH / rowZ.length), t), Z, "zplate");
      this.zPlate.rows.set(z, row);
      for (const v of this.zPlate.verticals) this.weld(row.near(v.from), v.near([v.from[0], v.from[1], z]));
    }

    for (const z of d.xRailZ) {
      const start: Vec3 = [-railL / 2, d.beamFront, z];
      this.railAndBlocks(r.gx, start, X, neg(Y), railL, [railL / 2 - sX / 2, railL / 2 + sX / 2], "X axis", ["y"], ["y", "x"]);
      const beam = this.beams[Math.min(this.beams.length - 1, Math.floor((z - d.zg0) / r.beam.hMm))];
      const rail = asm.member([-railL / 2, d.beamFront - r.gx.rail.heightMm / 2, z], [railL / 2, d.beamFront - r.gx.rail.heightMm / 2, z], railBeam(r.gx), neg(Y), "rail");
      for (const tie of this.ties(railL)) asm.rigid(beam.at(tie + 5), rail.at(tie));
      this.xRails.push(rail);
      const row = this.zPlate.rows.get(z)!;
      for (const x of [-sX / 2, sX / 2]) {
        this.slide(rail, railL / 2 + x, [x, d.yXBlockTop, z], row.near([x, yPlate, z]), "x", r.gx);
        this.blockScrews(r.gx, [x, d.yZPlate, z], X, neg(Y), "X axis", ["y", "x"]);
      }
    }
  }

  // ------------------------------------------------------------ Z axis

  zAxis() {
    const { r, d, asm } = this;
    const t = d.t;
    const railL = d.zp1 - d.zp0 - 10;
    const yRailFace = d.yZPlate;
    const zc = [d.spb + r.gz.block.lengthMm / 2 + 8, d.spb + d.hsp - r.gz.block.lengthMm / 2 - 8];
    const yPlate = d.yZBlockTop - t / 2;

    this.plate(d.zW, d.hsp, t, [0, d.yZBlockTop, d.spb + d.hsp / 2], neg(Y), Z, "Z axis", "Spindle plate", ["y", "x", "z"]);
    for (const x of [-d.zRailX, d.zRailX]) {
      this.spindlePlate.verticals.push(asm.member([x, yPlate, d.spb], [x, yPlate, d.spb + d.hsp], plateBeam(d.zW / 2, t), X, "splate"));
    }
    const mountZ = [d.spb + 10, d.spb + 70];
    for (const z of [...zc, ...mountZ]) {
      const row = asm.member([-d.zW / 2, yPlate, z], [d.zW / 2, yPlate, z], plateBeam(50, t), Z, "splate");
      this.spindlePlate.rows.set(z, row);
      for (const v of this.spindlePlate.verticals) this.weld(row.near(v.from), v.near([v.from[0], v.from[1], z]));
    }

    for (const [i, x] of [-d.zRailX, d.zRailX].entries()) {
      const start: Vec3 = [x, yRailFace, d.zp0 + 5];
      this.railAndBlocks(r.gz, start, Z, neg(Y), railL, zc.map((z) => z - start[2]), "Z axis", ["y", "x"], ["y", "x", "z"]);
      const rail = asm.member([x, yRailFace - r.gz.rail.heightMm / 2, d.zp0 + 5], [x, yRailFace - r.gz.rail.heightMm / 2, d.zp0 + 5 + railL], railBeam(r.gz), neg(Y), "rail");
      const back = this.zPlate.verticals[i];
      for (const tie of this.ties(railL)) asm.rigid(back.at(tie + 5), rail.at(tie));
      this.zRails.push(rail);
      for (const z of zc) {
        const row = this.spindlePlate.rows.get(z)!;
        this.slide(rail, z - start[2], [x, d.yZBlockTop, z], row.near([x, yPlate, z]), "z", r.gz);
        this.blockScrews(r.gz, [x, d.ySpindlePlate, z], Z, neg(Y), "Z axis", ["y", "x", "z"]);
      }
    }

    // Spindle in its clamp mount, tool touching the table.
    const sp = r.spindle;
    asm.add({
      item: hardware.mount(sp.diameterMm),
      qty: 1,
      shape: `mount-${sp.diameterMm}`,
      build: () => spindleMountGeometry(sp.diameterMm),
      matrix: place([0, d.ySpindlePlate, d.spb + 10], Z, Y),
      group: "Spindle",
      label: `${sp.diameterMm} mm spindle mount`,
      rides: ["y", "x", "z"],
      massKg: 0.9,
    });
    asm.add({
      item: sp,
      qty: 1,
      shape: `spindle-${sp.id}`,
      build: () => spindleGeometry(sp),
      matrix: place([0, d.spindleAxisY, d.zTool], Z, Y),
      group: "Spindle",
      label: sp.name,
      rides: ["y", "x", "z"],
      massKg: sp.massKg,
    });
    const top = 64 + sp.lengthMm;
    this.spindleMember = asm.member([0, d.spindleAxisY, d.zTool], [0, d.spindleAxisY, d.zTool + top], spindleBeam(sp.diameterMm, sp.massKg, top), Y, "spindle");
    for (const z of mountZ) {
      asm.rigid(this.spindlePlate.rows.get(z)!.near([0, yPlate, z]), this.spindleMember.at(z - d.zTool));
    }
    asm.marks.set("tool", this.spindleMember.at(0));
  }

  // ------------------------------------------------------------ drives

  drives() {
    const { r, d, asm } = this;
    const F = r.frame;

    // Y: one drive per side on the side rail's outer face, motors at the back.
    for (const [i, side] of this.sides.entries()) {
      const s = i ? 1 : -1;
      const off = r.dy.kind === "ballscrew" ? 1.98 * r.dy.diameterMm + 2 : 20;
      const x = s * (d.xs + F.wMm / 2 + off);
      const z = d.zb - (F.profile ? F.profile.moduleMm / 2 : 25);
      this.drive(r.dy, [x, 15, z], Y, d.baseL - 30, d.yG - 15, [-s, 0, 0], Z, "Y axis", [], ["y"], r.my);
      const k = this.driveStiffness(r.dy, d.baseL - 30 - d.yG, d.yG - 15);
      asm.spring(side.near([s * d.xs, d.yG, 0]), this.feet[i].at(d.footL / 2), [0, k, 0, 0, 0, 0], "drive-y");
      asm.mass(side.at(d.baseL), r.my.massKg);
      // Nut bracket up to the foot plate.
      const nutTop = z + (r.dy.kind === "ballscrew" ? r.dy.diameterMm : 10);
      const h = d.zf0 - nutTop;
      if (h > 5) this.plate(off + F.wMm / 2 + 20, h, 8, [s * (d.xs + (off + F.wMm / 2) / 2), d.yG - 4, nutTop + h / 2], Y, Z, "Y axis", "Nut bracket", ["y"]);
    }

    // X: along the beam's front face between the rails, motor outside the right upright.
    const zx = d.xRailZ.length > 1 ? (d.xRailZ[0] + d.xRailZ[1]) / 2 : d.xRailZ[0] + 30;
    const yx = d.beamFront - r.gx.block.heightMm / 2;
    this.drive(r.dx, [-d.beamLen / 2 + 10, yx, zx], X, d.beamLen - 20, d.beamLen / 2 - 10, Y, neg(Y), "X axis", ["y"], ["y", "x"], r.mx);
    const beam = this.beams[Math.min(this.beams.length - 1, Math.floor((zx - d.zg0) / r.beam.hMm))];
    const row = [...this.zPlate.rows.values()][0];
    asm.spring(beam.at(d.beamLen / 2), row.at(d.zW / 2), [this.driveStiffness(r.dx, d.beamLen / 2, d.beamLen / 2), 0, 0, 0, 0, 0], "drive-x");
    asm.mass(this.uprights[1].at(d.uprightTop - d.zf0), r.mx.massKg);

    // Z: between the Z rails, motor on top.
    const yz = d.yZPlate - r.gz.block.heightMm / 2;
    const zTop = d.zp1 - 15;
    this.drive(r.dz, [0, yz, d.zp0 + 15], Z, zTop - d.zp0 - 15, d.spb + d.hsp / 2 - d.zp0 - 15, Y, neg(Y), "Z axis", ["y", "x"], ["y", "x", "z"], r.mz);
    const topRow = this.zPlate.rows.get(d.zp1 - 20)!;
    const midRow = this.spindlePlate.rows.get(d.spb + 70)!;
    const kz = this.driveStiffness(r.dz, zTop - (d.spb + d.hsp / 2), d.hsp);
    asm.spring(topRow.at(d.zW / 2), midRow.at(d.zW / 2), [0, 0, kz, 0, 0, 0], "drive-z");
    asm.mass(topRow.at(d.zW / 2), r.mz.massKg);
  }

  /** Axial stiffness of a drive with the load `free` mm from its fixed end (N/m). */
  driveStiffness(drive: Drive, free: number, other: number) {
    if (drive.kind === "belt") return drive.specificStiffnessN * (1 / (Math.max(free, 50) / 1000) + 1 / (Math.max(other, 50) / 1000));
    const screw = (200e9 * Math.PI * ((drive.rootMm / 2) * 1e-3) ** 2) / (Math.max(free, 30) / 1000);
    return 1 / (1 / screw + 1 / (drive.nutStiffnessNPerUm * 1e6) + 1 / (drive.bearingStiffnessNPerUm * 1e6));
  }

  /**
   * Screw or belt with its supports, nut, coupler and motor. `side` points from
   * the screw to the face it mounts on; `up` is where the nut housing faces.
   */
  drive(dr: Drive, start: Vec3, dir: Vec3, length: number, nutAt: number, side: Vec3, up: Vec3, group: Group, rides: Axis[], nutRides: Axis[], motor: Resolved["mx"]) {
    const { asm } = this;
    const end = add(start, scale(dir, length));
    if (dr.kind === "ballscrew") {
      asm.add({ item: dr.screw, qty: length / 1000, cutMm: Math.round(length), shape: `screw-${dr.diameterMm}-${Math.round(length)}`, build: () => screwGeometry(dr.diameterMm, length), matrix: place(start, dir, up), group, label: `${dr.id} ball screw`, rides, massKg: 7.85e-6 * Math.PI * (dr.diameterMm / 2) ** 2 * length });
      asm.add({ item: dr.kit, qty: 1, shape: `nut-${dr.diameterMm}`, build: () => ballNutGeometry(dr.diameterMm), matrix: place(add(start, scale(dir, nutAt)), dir, up), group, label: `${dr.id} ball nut`, rides: nutRides, massKg: dr.nutMassKg });
      for (const [at, fixed] of [[10, false], [length - 20, true]] as const) {
        asm.add({ item: { sku: fixed ? "BK-SUPPORT" : "BF-SUPPORT", name: fixed ? "BK fixed support" : "BF floating support", offer: { ...dr.kit.offer, price: 0 } }, qty: 0, shape: `support-${dr.diameterMm}-${fixed}`, build: () => supportGeometry(dr.diameterMm, fixed), matrix: place(add(start, scale(dir, at)), dir, neg(side)), group, label: fixed ? "BK support (in kit)" : "BF support (in kit)", rides, massKg: 0.4 });
      }
    } else {
      asm.add({ item: dr.belt, qty: (length * 2) / 1000, shape: `belt-${dr.id}-${Math.round(length)}`, build: () => sheetGeometry(dr.widthMm, length, 1.4, "rubber"), matrix: place(add(start, scale(up, 0)), up, dir), group, label: `${dr.id} belt`, rides, massKg: 0.02 * length * 0.001 });
      asm.add({ item: dr.kit, qty: 1, shape: "pulley-kit", build: () => couplerGeometry(10), matrix: place(add(start, scale(dir, nutAt)), side, dir), group, label: "Pulley set", rides: nutRides, massKg: 0.15 });
    }
    asm.add({ item: { sku: `COUPLER`, name: "Flexible coupler", offer: { vendor: "Amazon", url: "https://www.amazon.com/s?k=flexible+shaft+coupler", price: null, unit: "each", asOf: "" } }, qty: 1, shape: "coupler", build: () => couplerGeometry(8), matrix: place(add(end, scale(dir, -6)), dir, up), group, label: "Flexible coupler", rides, massKg: 0.05 });
    asm.add({ item: motor, qty: 1, shape: `motor-${motor.id}`, build: () => motorGeometry(motor.frameMm, motor.lengthMm, motor.shaftMm), matrix: place(add(end, scale(dir, 28)), neg(dir), up), group, label: motor.name, rides, massKg: motor.massKg });
    this.plate(motor.frameMm + 16, motor.frameMm + 16, 10, add(end, scale(dir, 14)), dir, up, group, "Motor mount plate", rides, [[0, 0, motor.frameMm * 0.68]]);
  }

  // ------------------------------------------------------------ electronics

  electronics() {
    const { r, d, asm } = this;
    const at: Vec3 = [d.xs + r.frame.wMm / 2 + 170, d.baseL * 0.7, 0];
    asm.add({ item: r.controller, qty: 1, shape: "enclosure", build: () => enclosureGeometry(300, 380, 140), matrix: place(add(at, [0, 0, 190]), X, Z), group: "Electronics", label: r.controller.name, massKg: 3 });
    for (const extra of r.controller.extras) {
      asm.add({ item: extra, qty: extra.count, shape: "none", build: () => [], matrix: place(at, Z, Y), group: "Electronics", label: extra.name, massKg: 0 });
    }
    for (const extra of r.spindle.extras) asm.add({ item: extra, qty: 1, shape: "none", build: () => [], matrix: place(at, Z, Y), group: "Spindle", label: extra.name, massKg: 0 });
  }
}
