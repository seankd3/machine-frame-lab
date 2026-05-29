import { ALUMINUM_DAMPING_LOSS, ALUMINUM_E_GPA, getFill } from "../data/materials";
import { getRail } from "../data/rails";
import type { CompositeSection, FillSelection, ProfileSpec, RailSelection } from "./types";
import { gpaToPa, mm2ToM2, mm4ToM4 } from "./units";

export function buildCompositeSection(
  profile: ProfileSpec,
  railSelection: RailSelection,
  fillSelection: FillSelection,
): CompositeSection {
  const rail = getRail(railSelection.modelId);
  const fill = getFill(fillSelection.mediumId);
  const aluminumE = gpaToPa(ALUMINUM_E_GPA);
  const railE = gpaToPa(rail.eGPa);
  const fillE = gpaToPa(fill.eGPa * fill.stiffnessEfficiency);

  const baseVertical = aluminumE * mm4ToM4(profile.iVerticalMm4);
  const baseLateral = aluminumE * mm4ToM4(profile.iLateralMm4);
  const railCounts = rail.id === "none" ? { top: 0, side: 0 } : {
    top: railSelection.topCount,
    side: railSelection.sideCount,
  };

  const railVertical = railCounts.top
    ? topRailEi(profile, rail.widthMm, rail.heightMm, railE, "vertical", railCounts.top)
    : 0;
  const railLateral = railCounts.top
    ? topRailEi(profile, rail.widthMm, rail.heightMm, railE, "lateral", railCounts.top)
    : 0;
  const sideVertical = railCounts.side
    ? sideRailEi(profile, rail.widthMm, rail.heightMm, railE, "vertical", railCounts.side)
    : 0;
  const sideLateral = railCounts.side
    ? sideRailEi(profile, rail.widthMm, rail.heightMm, railE, "lateral", railCounts.side)
    : 0;

  const fillRatio = fill.id === "none" ? 0 : fillSelection.ratio;
  const fillVertical = fillE * mm4ToM4(profile.iVerticalMm4 * 0.2 * fillRatio);
  const fillLateral = fillE * mm4ToM4(profile.iLateralMm4 * 0.2 * fillRatio);
  const fillMassKgM = fill.densityKgM3 * mm2ToM2(profile.fillableAreaMm2) * fillRatio;
  const railMassKgM = rail.massKgM * (railCounts.top + railCounts.side);
  const massKgM = profile.massKgM + railMassKgM + fillMassKgM;

  const railLoss = railMassKgM * rail.dampingLoss;
  const fillLoss = fillMassKgM * fill.dampingLoss;
  const baseLoss = profile.massKgM * ALUMINUM_DAMPING_LOSS;
  const dampingLoss = massKgM > 0 ? (baseLoss + railLoss + fillLoss) / massKgM : 0;
  const dampingRatio = Math.max(0.001, dampingLoss / 2);

  const eiVerticalNm2 = baseVertical + railVertical + sideVertical + fillVertical;
  const eiLateralNm2 = baseLateral + railLateral + sideLateral + fillLateral;
  const railContribution = railVertical + railLateral + sideVertical + sideLateral;
  const fillContribution = fillVertical + fillLateral;
  const combined = eiVerticalNm2 + eiLateralNm2;

  return {
    massKgM,
    baseMassKgM: profile.massKgM,
    railMassKgM,
    fillMassKgM,
    eiVerticalNm2,
    eiLateralNm2,
    dampingRatio,
    railContributionPct: combined > 0 ? (railContribution / combined) * 100 : 0,
    fillContributionPct: combined > 0 ? (fillContribution / combined) * 100 : 0,
  };
}

function topRailEi(
  profile: ProfileSpec,
  railWidthMm: number,
  railHeightMm: number,
  ePa: number,
  axis: "vertical" | "lateral",
  count: number,
) {
  const area = railWidthMm * railHeightMm;
  const offsets = distributeOffsets(count, profile.widthMm / 2 - railWidthMm / 2);

  return offsets.reduce((total, lateralOffset) => {
    const localI =
      axis === "vertical"
        ? (railWidthMm * railHeightMm ** 3) / 12
        : (railHeightMm * railWidthMm ** 3) / 12;
    const offset =
      axis === "vertical"
        ? profile.heightMm / 2 + railHeightMm / 2
        : Math.abs(lateralOffset);

    return total + ePa * mm4ToM4(localI + area * offset ** 2);
  }, 0);
}

function sideRailEi(
  profile: ProfileSpec,
  railWidthMm: number,
  railHeightMm: number,
  ePa: number,
  axis: "vertical" | "lateral",
  count: number,
) {
  const area = railWidthMm * railHeightMm;
  const offsets = distributeOffsets(count, profile.widthMm / 2 + railHeightMm / 2);

  return offsets.reduce((total, lateralOffset) => {
    const localI =
      axis === "vertical"
        ? (railHeightMm * railWidthMm ** 3) / 12
        : (railWidthMm * railHeightMm ** 3) / 12;
    const offset = axis === "lateral" ? Math.abs(lateralOffset) : 0;

    return total + ePa * mm4ToM4(localI + area * offset ** 2);
  }, 0);
}

function distributeOffsets(count: number, edgeOffset: number) {
  if (count <= 0) return [];
  if (count === 1) return [0];
  if (count === 2) return [-edgeOffset, edgeOffset];

  const step = (edgeOffset * 2) / (count - 1);
  return Array.from({ length: count }, (_, index) => -edgeOffset + step * index);
}
