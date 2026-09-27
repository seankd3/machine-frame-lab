import { getFill } from "../data/materials";
import { getProfile, profiles, type Profile } from "../data/profiles";
import { getRail } from "../data/rails";
import { receptance, solveBeam, type Beam } from "./beam";
import { numbers, type Design } from "./design";
import { buildSection, type Section } from "./section";

export type Plane = "vertical" | "horizontal";
export const planes: Plane[] = ["vertical", "horizontal"];

export interface PlaneResult {
  beam: Beam;
  /** Tool deflection from the steady half of the cutting force (µm). */
  steadyUm: number;
  /** Vibration amplitude from the half that pulses at tooth-pass frequency (µm). */
  vibrationUm: number;
  /** steady + vibration: the worst excursion of the tool (µm). */
  peakUm: number;
  firstHz: number;
}

export interface Analysis {
  design: Design;
  profile: Profile;
  section: Section;
  toothHz: number;
  planes: Record<Plane, PlaneResult>;
  /** Beam plus carriage. */
  movingMassKg: number;
  /** Worst plane against each target. */
  worstUm: number;
  worstHz: number;
  passes: { deflection: boolean; mode: boolean; all: boolean };
}

export const toothHz = (rpm: number, flutes: number) => (rpm * flutes) / 60;

/**
 * Cutting-force response of one beam in both bending planes. A milling cut is
 * an interrupted load: the peak force F is modelled as F/2 held steady plus
 * F/2 pulsing at tooth-pass frequency, so the tool's worst excursion is
 * F/2 · (static compliance + |receptance at tooth pass|).
 */
export function analyze(design: Design): Analysis {
  const profile = getProfile(design.profile) ?? profiles[0];
  const section = buildSection({
    profile,
    orientation: design.orientation,
    rail: getRail(design.rail),
    topRails: design.topRails,
    frontRails: design.frontRails,
    fill: getFill(design.fill)!,
  });
  const tooth = toothHz(design.rpm, design.flutes);
  const plane = (ei: number): PlaneResult => {
    const beam = solveBeam({
      lengthM: design.spanMm / 1000,
      eiNm2: ei,
      massKgM: section.mass.total,
      station: design.stationPct / 100,
      pointMassKg: design.carriageKg,
      support: design.support,
    });
    const steadyUm = (design.forceN / 2) * beam.compliance * 1e6;
    const vibrationUm = (design.forceN / 2) * receptance(beam, tooth, section.dampingRatio) * 1e6;
    return { beam, steadyUm, vibrationUm, peakUm: steadyUm + vibrationUm, firstHz: beam.modes[0]?.hz ?? 0 };
  };
  const results = { vertical: plane(section.eiNm2.vertical), horizontal: plane(section.eiNm2.horizontal) };
  const worstUm = Math.max(results.vertical.peakUm, results.horizontal.peakUm);
  const worstHz = Math.min(results.vertical.firstHz, results.horizontal.firstHz);
  const deflection = worstUm <= design.maxUm;
  const mode = worstHz >= design.minHz;

  return {
    design,
    profile,
    section,
    toothHz: tooth,
    planes: results,
    movingMassKg: section.mass.total * (design.spanMm / 1000) + design.carriageKg,
    worstUm,
    worstHz,
    passes: { deflection, mode, all: deflection && mode },
  };
}

/** Peak tool deflection (µm) in one plane if the spindle ran at another speed. */
export function peakAtRpm(analysis: Analysis, plane: Plane, rpm: number) {
  const { beam, steadyUm } = analysis.planes[plane];
  const hz = toothHz(rpm, analysis.design.flutes);
  return steadyUm + (analysis.design.forceN / 2) * receptance(beam, hz, analysis.section.dampingRatio) * 1e6;
}

const worstAtRpm = (analysis: Analysis, rpm: number) => Math.max(...planes.map((p) => peakAtRpm(analysis, p, rpm)));

/** Nearest spindle speed that meets the deflection target, or null. */
export function nearestPassingRpm(analysis: Analysis) {
  const { rpm, maxUm } = analysis.design;
  const { min, max, step } = numbers.rpm;
  for (let offset = step; offset <= max - min; offset += step) {
    for (const candidate of [rpm - offset, rpm + offset]) {
      if (candidate >= min && candidate <= max && worstAtRpm(analysis, candidate) <= maxUm) return candidate;
    }
  }
  return null;
}

/** The same design with rails and fill peeled off, to show what each adds. */
export function layers(design: Design) {
  return [
    { label: "Bare extrusion", design: { ...design, rail: "none", fill: "hollow" } as Design },
    { label: "+ rails", design: { ...design, fill: "hollow" } as Design },
    { label: "+ fill", design },
  ];
}
