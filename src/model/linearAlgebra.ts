export function zeroMatrix(size: number) {
  return Array.from({ length: size }, () => Array(size).fill(0));
}

export function addElement(target: number[][], element: number[][], dofs: number[]) {
  dofs.forEach((rowDof, row) => {
    dofs.forEach((colDof, col) => {
      target[rowDof][colDof] += element[row][col];
    });
  });
}

export function selectMatrix(matrix: number[][], indexes: number[]) {
  return indexes.map((row) => indexes.map((col) => matrix[row][col]));
}

export function solveLinearSystem(matrix: number[][], vector: number[]) {
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
    const divisor = a[pivot][pivot];
    if (!Number.isFinite(divisor) || Math.abs(divisor) < 1e-14) {
      throw new Error("Singular matrix");
    }

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

export function choleskyDecompose(matrix: number[][]) {
  const n = matrix.length;
  const lower = zeroMatrix(n);

  for (let row = 0; row < n; row += 1) {
    for (let col = 0; col <= row; col += 1) {
      let sum = matrix[row][col];
      for (let k = 0; k < col; k += 1) {
        sum -= lower[row][k] * lower[col][k];
      }

      if (row === col) {
        if (!Number.isFinite(sum) || sum <= 1e-14) {
          throw new Error("Mass matrix is not positive definite");
        }
        lower[row][col] = Math.sqrt(sum);
      } else {
        lower[row][col] = sum / lower[col][col];
      }
    }
  }

  return lower;
}

export function solveLowerTriangular(lower: number[][], vector: number[]) {
  const n = vector.length;
  const result = Array(n).fill(0);

  for (let row = 0; row < n; row += 1) {
    let sum = vector[row];
    for (let col = 0; col < row; col += 1) {
      sum -= lower[row][col] * result[col];
    }
    result[row] = sum / lower[row][row];
  }

  return result;
}

export function solveUpperFromLowerTranspose(lower: number[][], vector: number[]) {
  const n = vector.length;
  const result = Array(n).fill(0);

  for (let row = n - 1; row >= 0; row -= 1) {
    let sum = vector[row];
    for (let col = row + 1; col < n; col += 1) {
      sum -= lower[col][row] * result[col];
    }
    result[row] = sum / lower[row][row];
  }

  return result;
}

export interface EigenPair {
  value: number;
  vector: number[];
}

export function jacobiEigenSymmetric(matrix: number[][]): EigenPair[] {
  const n = matrix.length;
  const a = matrix.map((row) => [...row]);
  const vectors = identityMatrix(n);
  const maxIterations = Math.max(40, n * n * 16);
  const tolerance = 1e-10;

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    let pivotRow = 0;
    let pivotCol = 1;
    let max = 0;

    for (let row = 0; row < n; row += 1) {
      for (let col = row + 1; col < n; col += 1) {
        const value = Math.abs(a[row][col]);
        if (value > max) {
          max = value;
          pivotRow = row;
          pivotCol = col;
        }
      }
    }

    if (max < tolerance) break;

    const app = a[pivotRow][pivotRow];
    const aqq = a[pivotCol][pivotCol];
    const apq = a[pivotRow][pivotCol];
    const angle = 0.5 * Math.atan2(2 * apq, aqq - app);
    const c = Math.cos(angle);
    const s = Math.sin(angle);

    for (let k = 0; k < n; k += 1) {
      if (k !== pivotRow && k !== pivotCol) {
        const akp = a[k][pivotRow];
        const akq = a[k][pivotCol];
        a[k][pivotRow] = c * akp - s * akq;
        a[pivotRow][k] = a[k][pivotRow];
        a[k][pivotCol] = s * akp + c * akq;
        a[pivotCol][k] = a[k][pivotCol];
      }

      const vkp = vectors[k][pivotRow];
      const vkq = vectors[k][pivotCol];
      vectors[k][pivotRow] = c * vkp - s * vkq;
      vectors[k][pivotCol] = s * vkp + c * vkq;
    }

    a[pivotRow][pivotRow] = c * c * app - 2 * s * c * apq + s * s * aqq;
    a[pivotCol][pivotCol] = s * s * app + 2 * s * c * apq + c * c * aqq;
    a[pivotRow][pivotCol] = 0;
    a[pivotCol][pivotRow] = 0;
  }

  return Array.from({ length: n }, (_, index) => ({
    value: a[index][index],
    vector: vectors.map((row) => row[index]),
  })).sort((left, right) => left.value - right.value);
}

function identityMatrix(size: number): number[][] {
  return Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, col) => (row === col ? 1 : 0)),
  );
}
