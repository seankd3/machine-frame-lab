import type { ModeShape, SupportType } from "./types";
import {
  addElement,
  choleskyDecompose,
  jacobiEigenSymmetric,
  selectMatrix,
  solveLinearSystem,
  solveLowerTriangular,
  solveUpperFromLowerTranspose,
  zeroMatrix,
} from "./linearAlgebra";

export interface BeamFeaInput {
  lengthM: number;
  elements: number;
  eiNm2: number;
  massKgM: number;
  pointMassKg?: number;
  loadN: number;
  loadPositionPct: number;
  support: SupportType;
}

export interface BeamFeaOutput {
  maxDeflectionM: number;
  stiffnessNPerM: number;
  frequenciesHz: number[];
  modeShapes: ModeShape[];
}

const MODE_COUNT = 4;
const SHAPE_POINTS = 36;

export function runBeamFea(input: BeamFeaInput): BeamFeaOutput {
  if (!isValidInput(input)) return emptyOutput();

  try {
    const nodes = input.elements + 1;
    const dofCount = nodes * 2;
    const elementLength = input.lengthM / input.elements;
    const stiffness = zeroMatrix(dofCount);
    const mass = zeroMatrix(dofCount);
    const load = Array(dofCount).fill(0);

    for (let element = 0; element < input.elements; element += 1) {
      const elementDofs = elementDofIndexes(element);
      addElement(stiffness, beamStiffness(input.eiNm2, elementLength), elementDofs);
      addElement(mass, beamMass(input.massKgM, elementLength), elementDofs);
    }

    addNodalLoad(load, input.loadN, input.loadPositionPct, input.elements);
    addPointMass(mass, input.pointMassKg ?? 0, input.loadPositionPct, input.elements);

    const freeDofs = freeDofIndexes(dofCount, input.elements, input.support);
    const reducedK = selectMatrix(stiffness, freeDofs);
    const reducedM = selectMatrix(mass, freeDofs);
    const reducedLoad = freeDofs.map((index) => load[index]);
    const solved = solveLinearSystem(reducedK, reducedLoad);
    const displacement = expandToFullDofs(solved, freeDofs, dofCount);

    const modes = solveModalSystem(reducedK, reducedM, freeDofs, dofCount, input);
    const maxDeflectionM = Math.max(
      ...Array.from({ length: nodes }, (_, index) => Math.abs(displacement[index * 2])),
    );

    return {
      maxDeflectionM,
      stiffnessNPerM:
        maxDeflectionM > 0 ? Math.abs(input.loadN) / maxDeflectionM : Number.POSITIVE_INFINITY,
      frequenciesHz: modes.map((mode) => mode.frequencyHz),
      modeShapes: modes,
    };
  } catch {
    return emptyOutput();
  }
}

function isValidInput(input: BeamFeaInput) {
  return (
    Number.isFinite(input.lengthM) &&
    Number.isFinite(input.elements) &&
    Number.isFinite(input.eiNm2) &&
    Number.isFinite(input.massKgM) &&
    input.lengthM > 0 &&
    input.elements >= 2 &&
    input.eiNm2 > 0 &&
    input.massKgM > 0
  );
}

function emptyOutput(): BeamFeaOutput {
  return {
    maxDeflectionM: 0,
    stiffnessNPerM: Number.POSITIVE_INFINITY,
    frequenciesHz: [],
    modeShapes: [],
  };
}

function beamStiffness(ei: number, length: number) {
  const l2 = length ** 2;
  const factor = ei / length ** 3;

  return [
    [12, 6 * length, -12, 6 * length],
    [6 * length, 4 * l2, -6 * length, 2 * l2],
    [-12, -6 * length, 12, -6 * length],
    [6 * length, 2 * l2, -6 * length, 4 * l2],
  ].map((row) => row.map((value) => value * factor));
}

function beamMass(massKgM: number, length: number) {
  const l2 = length ** 2;
  const factor = (massKgM * length) / 420;

  return [
    [156, 22 * length, 54, -13 * length],
    [22 * length, 4 * l2, 13 * length, -3 * l2],
    [54, 13 * length, 156, -22 * length],
    [-13 * length, -3 * l2, -22 * length, 4 * l2],
  ].map((row) => row.map((value) => value * factor));
}

function elementDofIndexes(element: number) {
  return [element * 2, element * 2 + 1, element * 2 + 2, element * 2 + 3];
}

function addNodalLoad(load: number[], loadN: number, loadPositionPct: number, elements: number) {
  const { lowerNode, upperNode, blend } = loadPosition(loadPositionPct, elements);
  load[lowerNode * 2] += loadN * (1 - blend);
  load[upperNode * 2] += loadN * blend;
}

function addPointMass(mass: number[][], pointMassKg: number, loadPositionPct: number, elements: number) {
  if (!Number.isFinite(pointMassKg) || pointMassKg <= 0) return;

  const { lowerNode, upperNode, blend } = loadPosition(loadPositionPct, elements);
  mass[lowerNode * 2][lowerNode * 2] += pointMassKg * (1 - blend);
  mass[upperNode * 2][upperNode * 2] += pointMassKg * blend;
}

function loadPosition(loadPositionPct: number, elements: number) {
  const exactNode = (Math.max(0, Math.min(100, loadPositionPct)) / 100) * elements;
  const lowerNode = Math.max(0, Math.min(elements, Math.floor(exactNode)));
  const upperNode = Math.max(0, Math.min(elements, Math.ceil(exactNode)));

  return {
    lowerNode,
    upperNode,
    blend: exactNode - lowerNode,
  };
}

function freeDofIndexes(dofCount: number, elements: number, support: SupportType) {
  const lastNodeDof = elements * 2;
  const fixed = new Set<number>();

  if (support === "simply-supported") {
    fixed.add(0);
    fixed.add(lastNodeDof);
  }

  if (support === "fixed-fixed") {
    fixed.add(0);
    fixed.add(1);
    fixed.add(lastNodeDof);
    fixed.add(lastNodeDof + 1);
  }

  if (support === "cantilever") {
    fixed.add(0);
    fixed.add(1);
  }

  return Array.from({ length: dofCount }, (_, index) => index).filter((index) => !fixed.has(index));
}

function expandToFullDofs(reduced: number[], freeDofs: number[], dofCount: number) {
  const full = Array(dofCount).fill(0);
  freeDofs.forEach((index, reducedIndex) => {
    full[index] = reduced[reducedIndex];
  });

  return full;
}

function solveModalSystem(
  reducedK: number[][],
  reducedM: number[][],
  freeDofs: number[],
  dofCount: number,
  input: BeamFeaInput,
): ModeShape[] {
  const lowerMass = choleskyDecompose(reducedM);
  const symmetric = generalizedToStandardSymmetric(reducedK, lowerMass);
  const eigenPairs = jacobiEigenSymmetric(symmetric);
  const modes: ModeShape[] = [];

  for (const pair of eigenPairs) {
    if (modes.length >= MODE_COUNT) break;
    if (!Number.isFinite(pair.value) || pair.value <= 1e-8) continue;

    const reducedVector = solveUpperFromLowerTranspose(lowerMass, pair.vector);
    const fullVector = normalizeModeVector(expandToFullDofs(reducedVector, freeDofs, dofCount));

    modes.push({
      mode: modes.length + 1,
      frequencyHz: Math.sqrt(pair.value) / (Math.PI * 2),
      points: sampleModeShape(fullVector, input.lengthM, input.elements),
    });
  }

  return modes;
}

function generalizedToStandardSymmetric(stiffness: number[][], lowerMass: number[][]) {
  const size = stiffness.length;
  const inverseLowerColumns = Array.from({ length: size }, (_, col) => {
    const basis = Array(size).fill(0);
    basis[col] = 1;
    return solveLowerTriangular(lowerMass, basis);
  });
  const inverseLower = Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, col) => inverseLowerColumns[col][row]),
  );
  const matrix = zeroMatrix(size);

  for (let row = 0; row < size; row += 1) {
    for (let col = row; col < size; col += 1) {
      let value = 0;
      for (let i = 0; i < size; i += 1) {
        for (let j = 0; j < size; j += 1) {
          value += inverseLower[row][i] * stiffness[i][j] * inverseLower[col][j];
        }
      }
      matrix[row][col] = value;
      matrix[col][row] = value;
    }
  }

  return matrix;
}

function normalizeModeVector(vector: number[]) {
  const max = Math.max(...vector.filter((_, index) => index % 2 === 0).map((value) => Math.abs(value)));
  if (!Number.isFinite(max) || max <= 0) return vector;

  return vector.map((value) => value / max);
}

function sampleModeShape(vector: number[], lengthM: number, elements: number) {
  const elementLength = lengthM / elements;
  const rawPoints = Array.from({ length: SHAPE_POINTS }, (_, index) => {
    const xRatio = index / (SHAPE_POINTS - 1);
    const xM = xRatio * lengthM;
    const element = Math.min(elements - 1, Math.floor(xM / elementLength));
    const localX = (xM - element * elementLength) / elementLength;
    const baseDof = element * 2;
    const y = hermiteDisplacement(
      localX,
      elementLength,
      vector[baseDof],
      vector[baseDof + 1],
      vector[baseDof + 2],
      vector[baseDof + 3],
    );

    return { x: xRatio, y };
  });
  const scale = Math.max(...rawPoints.map((point) => Math.abs(point.y)), 1e-12);
  const peak = rawPoints.reduce((best, point) => (Math.abs(point.y) > Math.abs(best.y) ? point : best));
  const sign = peak.y < 0 ? -1 : 1;

  return rawPoints.map((point) => ({ x: point.x, y: (point.y / scale) * sign }));
}

function hermiteDisplacement(
  xi: number,
  length: number,
  w1: number,
  theta1: number,
  w2: number,
  theta2: number,
) {
  const n1 = 1 - 3 * xi ** 2 + 2 * xi ** 3;
  const n2 = length * (xi - 2 * xi ** 2 + xi ** 3);
  const n3 = 3 * xi ** 2 - 2 * xi ** 3;
  const n4 = length * (-(xi ** 2) + xi ** 3);

  return n1 * w1 + n2 * theta1 + n3 * w2 + n4 * theta2;
}
