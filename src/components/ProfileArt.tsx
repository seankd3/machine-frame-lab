// Illustrative T-slot cross-section drawn from the profile's cell grid. It is
// not the analysed geometry (published area and inertia are), but its cells,
// slots and cavities are where the model puts rails and fill.

export interface ProfileShape {
  cols: number;
  rows: number;
  moduleMm: number;
  slotMm: number;
  lite: boolean;
}

interface Pt {
  u: number;
  v: number;
}

/** Outline with T-slots cut into every exterior cell face, and bores as holes (mm, centred). */
export function profilePaths({ cols, rows, moduleMm: m, slotMm: s, lite }: ProfileShape) {
  const w = cols * m;
  const h = rows * m;
  const lip = 0.1 * m;
  const under = Math.max(0.5 * m, s + 0.2 * m);
  const depth = 0.32 * m;
  const notch: Pt[] = [
    { u: -s / 2, v: 0 },
    { u: -s / 2, v: lip },
    { u: -under / 2, v: lip },
    { u: -under / 2, v: lip + 0.07 * m },
    { u: -s / 2, v: depth },
    { u: s / 2, v: depth },
    { u: under / 2, v: lip + 0.07 * m },
    { u: under / 2, v: lip },
    { u: s / 2, v: lip },
    { u: s / 2, v: 0 },
  ];

  // Walk the perimeter clockwise; (x, y) in SVG axes, y down.
  const sides = [
    { start: [-w / 2, -h / 2], along: [1, 0], inward: [0, 1], cells: cols },
    { start: [w / 2, -h / 2], along: [0, 1], inward: [-1, 0], cells: rows },
    { start: [w / 2, h / 2], along: [-1, 0], inward: [0, -1], cells: cols },
    { start: [-w / 2, h / 2], along: [0, -1], inward: [1, 0], cells: rows },
  ];
  const outline: string[] = [];
  for (const side of sides) {
    const [x0, y0] = side.start;
    if (!outline.length) outline.push(`M${f(x0)} ${f(y0)}`);
    for (let c = 0; c < side.cells; c++) {
      const centre = (c + 0.5) * m;
      for (const p of notch) {
        const t = centre + p.u;
        outline.push(`L${f(x0 + side.along[0] * t + side.inward[0] * p.v)} ${f(y0 + side.along[1] * t + side.inward[1] * p.v)}`);
      }
    }
  }
  outline.push("Z");

  const cavities: string[] = [];
  const holes: string[] = [];
  const corner = (lite ? 0.16 : 0.12) * m;
  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      const cx = -w / 2 + (col + 0.5) * m;
      const cy = -h / 2 + (row + 0.5) * m;
      holes.push(circle(cx, cy, 0.1 * m));
      // Hollow corner tubes between the slot undercuts.
      for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        cavities.push(cornerVoid(cx + dx * 0.42 * m, cy + dy * 0.42 * m, corner, dx, dy));
      }
    }
  }
  // Large cavities where two cells meet (no slot on an interior face).
  const web = (lite ? 0.36 : 0.28) * m;
  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows - 1; row++) {
      cavities.push(diamond(-w / 2 + (col + 0.5) * m, -h / 2 + (row + 1) * m, web, web * 0.55));
    }
  }
  for (let col = 0; col < cols - 1; col++) {
    for (let row = 0; row < rows; row++) {
      cavities.push(diamond(-w / 2 + (col + 1) * m, -h / 2 + (row + 0.5) * m, web * 0.55, web));
    }
  }

  return { w, h, body: [outline.join(" "), ...cavities, ...holes].join(" "), cavities };
}

const f = (n: number) => Number(n.toFixed(2));

const circle = (cx: number, cy: number, r: number) =>
  `M${f(cx + r)} ${f(cy)} A${f(r)} ${f(r)} 0 1 0 ${f(cx - r)} ${f(cy)} A${f(r)} ${f(r)} 0 1 0 ${f(cx + r)} ${f(cy)} Z`;

const diamond = (cx: number, cy: number, rx: number, ry: number) =>
  `M${f(cx - rx)} ${f(cy)} L${f(cx)} ${f(cy - ry)} L${f(cx + rx)} ${f(cy)} L${f(cx)} ${f(cy + ry)} Z`;

/** A square void anchored at its outer corner (ox, oy), inner corner cut at 45°. */
function cornerVoid(ox: number, oy: number, size: number, dx: number, dy: number) {
  const pts: Array<[number, number]> = [
    [ox, oy],
    [ox - dx * size, oy],
    [ox - dx * size, oy - dy * size * 0.45],
    [ox - dx * size * 0.45, oy - dy * size],
    [ox, oy - dy * size],
  ];
  return `M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join(" L")} Z`;
}

export function ProfileGlyph({ shape, size = 36 }: { shape: ProfileShape; size?: number }) {
  const { w, h, body } = profilePaths(shape);
  const pad = Math.max(w, h) * 0.04;
  return (
    <svg className="profile-glyph" width={size} height={size} viewBox={`${f(-w / 2 - pad)} ${f(-h / 2 - pad)} ${f(w + 2 * pad)} ${f(h + 2 * pad)}`} aria-hidden="true">
      <path d={body} fillRule="evenodd" />
    </svg>
  );
}
