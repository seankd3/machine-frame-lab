import type { ResonanceReadout } from "./types";

const MIN_RPM = 500;
const MAX_RPM = 24000;

export function buildResonanceReadout(
  modesHz: number[],
  rpm: number,
  flutes: number,
  minSeparationPct: number,
): ResonanceReadout {
  const structuralModes = modesHz.filter((mode) => Number.isFinite(mode) && mode > 0);
  const spindleHz = rpm / 60;
  const toothPassingHz = (rpm * Math.max(1, flutes)) / 60;
  const nearestOverall = nearestPair(structuralModes, [
    { label: "Spindle" as const, frequencyHz: spindleHz },
    { label: "Tooth pass" as const, frequencyHz: toothPassingHz },
  ]);
  const nearestTooth = nearestPair(structuralModes, [
    { label: "Tooth pass" as const, frequencyHz: toothPassingHz },
  ]);
  const toothPassesLimit = nearestTooth.marginPct >= minSeparationPct;

  return {
    spindleHz,
    toothPassingHz,
    nearestModeHz: nearestOverall.modeHz,
    nearestExcitationHz: nearestOverall.excitationHz,
    nearestExcitationLabel: nearestOverall.label,
    nearestMarginPct: nearestOverall.marginPct,
    nearestToothModeHz: nearestTooth.modeHz,
    toothMarginPct: nearestTooth.marginPct,
    toothPassesLimit,
    saferRpm: toothPassesLimit
      ? undefined
      : nearestSafeRpm(structuralModes, rpm, Math.max(1, flutes), minSeparationPct),
  };
}

function nearestPair(
  modesHz: number[],
  excitations: Array<{ label: "Spindle" | "Tooth pass"; frequencyHz: number }>,
) {
  let modeHz = modesHz[0] ?? 0;
  let excitationHz = excitations[0]?.frequencyHz ?? 0;
  let label = excitations[0]?.label ?? "Tooth pass";
  let marginPct = Number.POSITIVE_INFINITY;

  modesHz.forEach((mode) => {
    excitations.forEach((excitation) => {
      const margin = modalMarginPct(mode, excitation.frequencyHz);
      if (margin < marginPct) {
        marginPct = margin;
        modeHz = mode;
        excitationHz = excitation.frequencyHz;
        label = excitation.label;
      }
    });
  });

  return {
    modeHz,
    excitationHz,
    label,
    marginPct: Number.isFinite(marginPct) ? marginPct : 0,
  };
}

function nearestSafeRpm(
  modesHz: number[],
  currentRpm: number,
  flutes: number,
  minSeparationPct: number,
) {
  const blockedBands = mergeBands(
    modesHz
      .map((mode) => rpmBandForMode(mode, flutes, minSeparationPct))
      .filter((band) => band.end >= MIN_RPM && band.start <= MAX_RPM)
      .map((band) => ({ start: clampRpm(band.start), end: clampRpm(band.end) })),
  );
  const containingBand = blockedBands.find((band) => currentRpm >= band.start && currentRpm <= band.end);
  if (!containingBand) return undefined;

  const candidates = [
    candidateAtRpm(modesHz, containingBand.start, currentRpm, flutes, "lower"),
    candidateAtRpm(modesHz, containingBand.end, currentRpm, flutes, "higher"),
  ].filter(Boolean) as Array<{
    rpm: number;
    direction: "lower" | "higher";
    toothPassingHz: number;
    marginPct: number;
  }>;

  return candidates.sort((left, right) => Math.abs(left.rpm - currentRpm) - Math.abs(right.rpm - currentRpm))[0];
}

function rpmBandForMode(modeHz: number, flutes: number, minSeparationPct: number) {
  const ratio = minSeparationPct / 100;
  return {
    start: (modeHz * (1 - ratio) * 60) / flutes,
    end: (modeHz * (1 + ratio) * 60) / flutes,
  };
}

function mergeBands(bands: Array<{ start: number; end: number }>) {
  const sorted = [...bands].sort((left, right) => left.start - right.start);
  const merged: Array<{ start: number; end: number }> = [];

  sorted.forEach((band) => {
    const previous = merged[merged.length - 1];
    if (!previous || band.start > previous.end) {
      merged.push({ ...band });
      return;
    }

    previous.end = Math.max(previous.end, band.end);
  });

  return merged;
}

function candidateAtRpm(
  modesHz: number[],
  bandEdgeRpm: number,
  currentRpm: number,
  flutes: number,
  direction: "lower" | "higher",
) {
  const rpm = direction === "lower" ? Math.floor(bandEdgeRpm) : Math.ceil(bandEdgeRpm);
  if (rpm < MIN_RPM || rpm > MAX_RPM || (direction === "lower" ? rpm >= currentRpm : rpm <= currentRpm)) {
    return undefined;
  }

  const toothPassingHz = (rpm * flutes) / 60;
  return {
    rpm,
    direction,
    toothPassingHz,
    marginPct: minimumMarginPct(modesHz, toothPassingHz),
  };
}

function minimumMarginPct(modesHz: number[], excitationHz: number) {
  return Math.min(...modesHz.map((mode) => modalMarginPct(mode, excitationHz)));
}

function modalMarginPct(modeHz: number, excitationHz: number) {
  if (!modeHz || !excitationHz) return Number.POSITIVE_INFINITY;
  return (Math.abs(modeHz - excitationHz) / modeHz) * 100;
}

function clampRpm(rpm: number) {
  return Math.min(MAX_RPM, Math.max(MIN_RPM, rpm));
}
