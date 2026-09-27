// Dense symmetric linear algebra for small FE systems (n < ~120).

export type Matrix = number[][];

export const zeros = (n: number): Matrix => Array.from({ length: n }, () => new Array<number>(n).fill(0));

/** Lower-triangular L with A = L Lᵀ. Throws if A is not positive definite. */
export function cholesky(a: Matrix): Matrix {
  const n = a.length;
  const l = zeros(n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = a[i][j];
      for (let k = 0; k < j; k++) sum -= l[i][k] * l[j][k];
      if (i === j) {
        if (sum <= 0) throw new Error("Matrix is not positive definite");
        l[i][i] = Math.sqrt(sum);
      } else {
        l[i][j] = sum / l[j][j];
      }
    }
  }
  return l;
}

/** Solves A x = b given the Cholesky factor of A. */
export function choleskySolve(l: Matrix, b: number[]): number[] {
  const n = l.length;
  const y = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    let sum = b[i];
    for (let k = 0; k < i; k++) sum -= l[i][k] * y[k];
    y[i] = sum / l[i][i];
  }
  const x = new Array<number>(n);
  for (let i = n - 1; i >= 0; i--) {
    let sum = y[i];
    for (let k = i + 1; k < n; k++) sum -= l[k][i] * x[k];
    x[i] = sum / l[i][i];
  }
  return x;
}

/**
 * Generalized symmetric eigenproblem K φ = λ M φ with M positive definite.
 * Returns eigenvalues ascending and M-normalized eigenvectors (φᵀ M φ = 1).
 */
export function generalizedEigen(k: Matrix, m: Matrix) {
  const n = k.length;
  const l = cholesky(m);
  // C = L⁻¹ K L⁻ᵀ, built column-by-column with forward substitution.
  const lInvK = zeros(n);
  for (let col = 0; col < n; col++) {
    for (let i = 0; i < n; i++) {
      let sum = k[i][col];
      for (let p = 0; p < i; p++) sum -= l[i][p] * lInvK[p][col];
      lInvK[i][col] = sum / l[i][i];
    }
  }
  const c = zeros(n);
  for (let row = 0; row < n; row++) {
    for (let j = 0; j < n; j++) {
      let sum = lInvK[row][j];
      for (let p = 0; p < j; p++) sum -= c[row][p] * l[j][p];
      c[row][j] = sum / l[j][j];
    }
  }
  const { values, vectors } = symmetricEigen(c);
  // φ = L⁻ᵀ v (back substitution per eigenvector).
  const modes = vectors.map((v) => {
    const phi = new Array<number>(n);
    for (let i = n - 1; i >= 0; i--) {
      let sum = v[i];
      for (let p = i + 1; p < n; p++) sum -= l[p][i] * phi[p];
      phi[i] = sum / l[i][i];
    }
    return phi;
  });
  const order = values.map((_, i) => i).sort((a, b) => values[a] - values[b]);
  return { values: order.map((i) => values[i]), vectors: order.map((i) => modes[i]) };
}

/**
 * Symmetric eigen decomposition: Householder tridiagonalization then implicit
 * QL (EISPACK tred2/tql2, as in JAMA). Returns eigenpairs with vectors as rows.
 */
function symmetricEigen(input: Matrix) {
  const n = input.length;
  const v = input.map((row) => [...row]);
  const d = new Array<number>(n).fill(0);
  const e = new Array<number>(n).fill(0);

  // tred2
  for (let j = 0; j < n; j++) d[j] = v[n - 1][j];
  for (let i = n - 1; i > 0; i--) {
    let scale = 0;
    let h = 0;
    for (let k = 0; k < i; k++) scale += Math.abs(d[k]);
    if (scale === 0) {
      e[i] = d[i - 1];
      for (let j = 0; j < i; j++) {
        d[j] = v[i - 1][j];
        v[i][j] = 0;
        v[j][i] = 0;
      }
    } else {
      for (let k = 0; k < i; k++) {
        d[k] /= scale;
        h += d[k] * d[k];
      }
      let f = d[i - 1];
      let g = Math.sqrt(h);
      if (f > 0) g = -g;
      e[i] = scale * g;
      h -= f * g;
      d[i - 1] = f - g;
      for (let j = 0; j < i; j++) e[j] = 0;
      for (let j = 0; j < i; j++) {
        f = d[j];
        v[j][i] = f;
        g = e[j] + v[j][j] * f;
        for (let k = j + 1; k <= i - 1; k++) {
          g += v[k][j] * d[k];
          e[k] += v[k][j] * f;
        }
        e[j] = g;
      }
      f = 0;
      for (let j = 0; j < i; j++) {
        e[j] /= h;
        f += e[j] * d[j];
      }
      const hh = f / (h + h);
      for (let j = 0; j < i; j++) e[j] -= hh * d[j];
      for (let j = 0; j < i; j++) {
        f = d[j];
        g = e[j];
        for (let k = j; k <= i - 1; k++) v[k][j] -= f * e[k] + g * d[k];
        d[j] = v[i - 1][j];
        v[i][j] = 0;
      }
    }
    d[i] = h;
  }
  for (let i = 0; i < n - 1; i++) {
    v[n - 1][i] = v[i][i];
    v[i][i] = 1;
    const h = d[i + 1];
    if (h !== 0) {
      for (let k = 0; k <= i; k++) d[k] = v[k][i + 1] / h;
      for (let j = 0; j <= i; j++) {
        let g = 0;
        for (let k = 0; k <= i; k++) g += v[k][i + 1] * v[k][j];
        for (let k = 0; k <= i; k++) v[k][j] -= g * d[k];
      }
    }
    for (let k = 0; k <= i; k++) v[k][i + 1] = 0;
  }
  for (let j = 0; j < n; j++) {
    d[j] = v[n - 1][j];
    v[n - 1][j] = 0;
  }
  v[n - 1][n - 1] = 1;
  e[0] = 0;

  // tql2
  for (let i = 1; i < n; i++) e[i - 1] = e[i];
  e[n - 1] = 0;
  let f = 0;
  let tst1 = 0;
  const eps = 2 ** -52;
  for (let l = 0; l < n; l++) {
    tst1 = Math.max(tst1, Math.abs(d[l]) + Math.abs(e[l]));
    let m = l;
    while (m < n && Math.abs(e[m]) > eps * tst1) m++;
    if (m > l) {
      do {
        let g = d[l];
        let p = (d[l + 1] - g) / (2 * e[l]);
        let r = Math.hypot(p, 1);
        if (p < 0) r = -r;
        d[l] = e[l] / (p + r);
        d[l + 1] = e[l] * (p + r);
        const dl1 = d[l + 1];
        let h = g - d[l];
        for (let i = l + 2; i < n; i++) d[i] -= h;
        f += h;
        p = d[m];
        let c = 1;
        let c2 = c;
        let c3 = c;
        const el1 = e[l + 1];
        let s = 0;
        let s2 = 0;
        for (let i = m - 1; i >= l; i--) {
          c3 = c2;
          c2 = c;
          s2 = s;
          g = c * e[i];
          h = c * p;
          r = Math.hypot(p, e[i]);
          e[i + 1] = s * r;
          s = e[i] / r;
          c = p / r;
          p = c * d[i] - s * g;
          d[i + 1] = h + s * (c * g + s * d[i]);
          for (let k = 0; k < n; k++) {
            h = v[k][i + 1];
            v[k][i + 1] = s * v[k][i] + c * h;
            v[k][i] = c * v[k][i] - s * h;
          }
        }
        p = (-s * s2 * c3 * el1 * e[l]) / dl1;
        e[l] = s * p;
        d[l] = c * p;
      } while (Math.abs(e[l]) > eps * tst1);
    }
    d[l] += f;
    e[l] = 0;
  }

  return { values: d, vectors: Array.from({ length: n }, (_, col) => v.map((row) => row[col])) };
}
