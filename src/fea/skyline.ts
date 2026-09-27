// Symmetric skyline (variable-band) matrix with in-place LDLᵀ factorisation.
// Column j stores rows first[j]..j; a frame renumbered by reverse
// Cuthill-McKee keeps the profile narrow, so factorising costs ~n·b².

export class Skyline {
  readonly n: number;
  readonly first: Int32Array;
  readonly cols: Float64Array[];

  constructor(first: Int32Array) {
    this.n = first.length;
    this.first = first;
    this.cols = Array.from(first, (f, j) => new Float64Array(j - f + 1));
  }

  static like(other: Skyline) {
    return new Skyline(other.first);
  }

  /** Adds v at (i, j); either triangle may be addressed. */
  add(i: number, j: number, v: number) {
    if (i > j) [i, j] = [j, i];
    this.cols[j][i - this.first[j]] += v;
  }

  get(i: number, j: number) {
    if (i > j) [i, j] = [j, i];
    const f = this.first[j];
    return i < f ? 0 : this.cols[j][i - f];
  }

  /** y = A x */
  multiply(x: Float64Array, y = new Float64Array(this.n)) {
    y.fill(0);
    for (let j = 0; j < this.n; j++) {
      const col = this.cols[j];
      const f = this.first[j];
      let sum = 0;
      for (let k = 0; k < col.length - 1; k++) {
        const i = f + k;
        sum += col[k] * x[i];
        y[i] += col[k] * x[j];
      }
      y[j] += sum + col[col.length - 1] * x[j];
    }
    return y;
  }

  /** In-place LDLᵀ: afterwards cols hold L (strict upper, by column) and D (diagonal). */
  factor() {
    const { n, first, cols } = this;
    for (let j = 0; j < n; j++) {
      const cj = cols[j];
      const fj = first[j];
      // Reduce off-diagonal entries of column j: g_ij = a_ij − Σ l_ki g_kj
      for (let i = fj + 1; i < j; i++) {
        const ci = cols[i];
        const fi = first[i];
        const start = Math.max(fi, fj);
        let sum = 0;
        for (let k = start; k < i; k++) sum += ci[k - fi] * cj[k - fj];
        cj[i - fj] -= sum;
      }
      // l_ij = g_ij / d_i ; d_j = a_jj − Σ l_ij g_ij
      let d = cj[j - fj];
      for (let i = fj; i < j; i++) {
        const g = cj[i - fj];
        const l = g / cols[i][i - first[i]];
        cj[i - fj] = l;
        d -= l * g;
      }
      if (!(d > 0)) throw new Error(`Stiffness is singular at equation ${j}: part of the machine is unconstrained`);
      cj[j - fj] = d;
    }
    return this;
  }

  /** Solves A x = b after factor(). */
  solve(b: Float64Array, x = new Float64Array(b)) {
    const { n, first, cols } = this;
    if (x !== b) x.set(b);
    for (let j = 0; j < n; j++) {
      const cj = cols[j];
      const fj = first[j];
      let sum = 0;
      for (let i = fj; i < j; i++) sum += cj[i - fj] * x[i];
      x[j] -= sum;
    }
    for (let j = 0; j < n; j++) x[j] /= cols[j][j - first[j]];
    for (let j = n - 1; j >= 0; j--) {
      const cj = cols[j];
      const fj = first[j];
      const xj = x[j];
      for (let i = fj; i < j; i++) x[i] -= cj[i - fj] * xj;
    }
    return x;
  }
}

/** Reverse Cuthill-McKee ordering of a graph given as adjacency lists. */
export function reverseCuthillMcKee(adjacency: number[][]) {
  const n = adjacency.length;
  const order: number[] = [];
  const seen = new Uint8Array(n);
  const degree = adjacency.map((a) => a.length);
  while (order.length < n) {
    let start = -1;
    for (let v = 0; v < n; v++) if (!seen[v] && (start < 0 || degree[v] < degree[start])) start = v;
    seen[start] = 1;
    const queue = [start];
    for (let head = 0; head < queue.length; head++) {
      const v = queue[head];
      order.push(v);
      const next = adjacency[v].filter((w) => !seen[w]).sort((a, b) => degree[a] - degree[b]);
      for (const w of next) {
        seen[w] = 1;
        queue.push(w);
      }
    }
  }
  return order.reverse();
}
