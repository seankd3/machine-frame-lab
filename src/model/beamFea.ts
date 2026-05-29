import type { SupportType } from "./types";

export interface BeamFeaInput {
  lengthM: number;
  elements: number;
  eiNm2: number;
  massKgM: number;
  loadN: number;
  loadPositionPct: number;
  support: SupportType;
}

export interface BeamFeaOutput {
  maxDeflectionM: number;
  stiffnessNPerM: number;
  frequenciesHz: number[];
}

export function runBeamFea(input: BeamFeaInput): BeamFeaOutput {
  const nodes = input.elements + 1;
  const dofCount = nodes * 2;
  const elementLength = input.lengthM / input.elements;
  const stiffness = zeroMatrix(dofCount);
  const load = Array(dofCount).fill(0);

  for (let element = 0; element < input.elements; element += 1) {
    const elementDofs = [element * 2, element * 2 + 1, element * 2 + 2, element * 2 + 3];
    addElement(stiffness, beamStiffness(input.eiNm2, elementLength), elementDofs);
  }

  const exactNode = (input.loadPositionPct / 100) * input.elements;
  const lowerNode = Math.max(0, Math.min(input.elements, Math.floor(exactNode)));
  const upperNode = Math.max(0, Math.min(input.elements, Math.ceil(exactNode)));
  const blend = exactNode - lowerNode;
  load[lowerNode * 2] += input.loadN * (1 - blend);
  load[upperNode * 2] += input.loadN * blend;

  const freeDofs = freeDofIndexes(dofCount, input.elements, input.support);
  const reducedK = selectMatrix(stiffness, freeDofs);
  const reducedLoad = freeDofs.map((index) => load[index]);
  const solved = solveLinearSystem(reducedK, reducedLoad);
  const displacement = Array(dofCount).fill(0);
  freeDofs.forEach((index, reducedIndex) => {
    displacement[index] = solved[reducedIndex];
  });

  const maxDeflectionM = Math.max(
    ...Array.from({ length: nodes }, (_, index) => Math.abs(displacement[index * 2])),
  );
  const stiffnessNPerM = maxDeflectionM > 0 ? input.loadN / maxDeflectionM : Number.POSITIVE_INFINITY;
  const frequenciesHz = analyticalFrequencies(
    input.support,
    input.lengthM,
    input.eiNm2,
    input.massKgM,
    4,
  );

  return {
    maxDeflectionM,
    stiffnessNPerM,
    frequenciesHz,
  };
}

export function makeModeShape(support: SupportType, mode: number) {
  return Array.from({ length: 36 }, (_, index) => {
    const x = index / 35;
    let y = Math.sin(mode * Math.PI * x);

    if (support === "fixed-fixed") {
      y = Math.sin(mode * Math.PI * x) * Math.sin(Math.PI * x);
    }

    if (support === "cantilever") {
      y = (1 - Math.cos((mode - 0.5) * Math.PI * x)) * (1 - x * 0.12);
    }

    return { x, y };
  });
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

function addElement(target: number[][], element: number[][], dofs: number[]) {
  dofs.forEach((rowDof, row) => {
    dofs.forEach((colDof, col) => {
      target[rowDof][colDof] += element[row][col];
    });
  });
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

function analyticalFrequencies(
  support: SupportType,
  lengthM: number,
  eiNm2: number,
  massKgM: number,
  count: number,
) {
  const betaBySupport: Record<SupportType, number[]> = {
    "simply-supported": [Math.PI, Math.PI * 2, Math.PI * 3, Math.PI * 4],
    "fixed-fixed": [4.730, 7.853, 10.996, 14.137],
    cantilever: [1.875, 4.694, 7.855, 10.996],
  };
  const modalScale = Math.sqrt(eiNm2 / Math.max(massKgM, 0.001)) / (Math.PI * 2 * lengthM ** 2);

  return betaBySupport[support].slice(0, count).map((beta) => beta ** 2 * modalScale);
}

function zeroMatrix(size: number) {
  return Array.from({ length: size }, () => Array(size).fill(0));
}

function selectMatrix(matrix: number[][], indexes: number[]) {
  return indexes.map((row) => indexes.map((col) => matrix[row][col]));
}

function solveLinearSystem(matrix: number[][], vector: number[]) {
  const a = matrix.map((row, index) => [...row, vector[index]]);
  const n = vector.length;

  for (let pivot = 0; pivot < n; pivot += 1) {
    let maxRow = pivot;
    for (let row = pivot + 1; row < n; row += 1) {
      if (Math.abs(a[row][pivot]) > Math.abs(a[maxRow][pivot])) {
        maxRow = row;
      }
    }

    [a[pivot], a[maxRow]] = [a[maxRow], a[pivot]];
    const divisor = a[pivot][pivot] || 1e-12;

    for (let col = pivot; col <= n; col += 1) {
      a[pivot][col] /= divisor;
    }

    for (let row = 0; row < n; row += 1) {
      if (row === pivot) continue;
      const factor = a[row][pivot];
      for (let col = pivot; col <= n; col += 1) {
        a[row][col] -= factor * a[pivot][col];
      }
    }
  }

  return a.map((row) => row[n]);
}
