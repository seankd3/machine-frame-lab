// T-slot cross-section as polygons (mm, centred, y up). One source for the
// extruded 3D member and the 2D glyph. Its cells, slots and cavities are where
// the machine puts rails, fasteners and fill; the analysed stiffness comes
// from the published area and inertia, not from this drawing.

export type Pt = [number, number];

export interface TSlotShape {
  cols: number;
  rows: number;
  moduleMm: number;
  slotMm: number;
  lite: boolean;
}

export interface Section2D {
  w: number;
  h: number;
  outline: Pt[];
  holes: Pt[][];
}

export function tslotSection({ cols, rows, moduleMm: m, slotMm: s, lite }: TSlotShape): Section2D {
  const w = cols * m;
  const h = rows * m;
  const lip = 0.09 * m;
  const under = Math.max(0.52 * m, s + 0.2 * m);
  const depth = 0.3 * m;
  const r = 0.04 * m;
  // Slot notch in (along, inward) coordinates from the face.
  const notch: Pt[] = [
    [-s / 2 - 0.015 * m, 0],
    [-s / 2, 0.02 * m],
    [-s / 2, lip],
    [-under / 2, lip],
    [-under / 2, lip + 0.06 * m],
    [-s / 2 - 0.02 * m, depth],
    [s / 2 + 0.02 * m, depth],
    [under / 2, lip + 0.06 * m],
    [under / 2, lip],
    [s / 2, lip],
    [s / 2, 0.02 * m],
    [s / 2 + 0.015 * m, 0],
  ];

  // Counter-clockwise walk: bottom (→), right (↑), top (←), left (↓).
  const sides = [
    { o: [-w / 2, -h / 2], a: [1, 0], n: [0, 1], cells: cols, len: w },
    { o: [w / 2, -h / 2], a: [0, 1], n: [-1, 0], cells: rows, len: h },
    { o: [w / 2, h / 2], a: [-1, 0], n: [0, -1], cells: cols, len: w },
    { o: [-w / 2, h / 2], a: [0, -1], n: [1, 0], cells: rows, len: h },
  ];
  const outline: Pt[] = [];
  for (const side of sides) {
    const at = (t: number, v: number): Pt => [side.o[0] + side.a[0] * t + side.n[0] * v, side.o[1] + side.a[1] * t + side.n[1] * v];
    // Rounded corner where the previous side meets this one.
    for (let k = 0; k <= 3; k++) {
      const phi = (k / 3) * (Math.PI / 2);
      outline.push(at(r * (1 - Math.cos(phi)), r * (1 - Math.sin(phi))));
    }
    for (let c = 0; c < side.cells; c++) {
      const centre = (c + 0.5) * m;
      for (const [u, v] of notch) outline.push(at(centre + u, v));
    }
  }

  const holes: Pt[][] = [];
  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      const cx = -w / 2 + (col + 0.5) * m;
      const cy = -h / 2 + (row + 0.5) * m;
      holes.push(circle(cx, cy, 0.105 * m, 20));
      const size = (lite ? 0.15 : 0.11) * m;
      for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
        holes.push(cornerVoid(cx + dx * 0.41 * m, cy + dy * 0.41 * m, size, dx, dy));
      }
    }
  }
  const web = (lite ? 0.34 : 0.26) * m;
  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows - 1; row++) holes.push(diamond(-w / 2 + (col + 0.5) * m, -h / 2 + (row + 1) * m, web, web * 0.5));
  }
  for (let col = 0; col < cols - 1; col++) {
    for (let row = 0; row < rows; row++) holes.push(diamond(-w / 2 + (col + 1) * m, -h / 2 + (row + 0.5) * m, web * 0.5, web));
  }
  for (let col = 0; col < cols - 1; col++) {
    for (let row = 0; row < rows - 1; row++) holes.push(circle(-w / 2 + (col + 1) * m, -h / 2 + (row + 1) * m, 0.12 * m, 16));
  }
  return { w, h, outline, holes };
}

/** Rectangular steel tube: rounded outer and inner corners (EN 10219 radii ≈ 2t / t). */
export function tubeSection(w: number, h: number, t: number): Section2D {
  return { w, h, outline: roundedRect(w, h, 2 * t), holes: [roundedRect(w - 2 * t, h - 2 * t, t).reverse()] };
}

export function roundedRect(w: number, h: number, r: number, segments = 4): Pt[] {
  const pts: Pt[] = [];
  const corners: Array<[number, number, number]> = [
    [w / 2 - r, -h / 2 + r, -Math.PI / 2],
    [w / 2 - r, h / 2 - r, 0],
    [-w / 2 + r, h / 2 - r, Math.PI / 2],
    [-w / 2 + r, -h / 2 + r, Math.PI],
  ];
  for (const [cx, cy, start] of corners) {
    for (let k = 0; k <= segments; k++) {
      const a = start + (k / segments) * (Math.PI / 2);
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
  }
  return pts;
}

export function circle(cx: number, cy: number, r: number, segments: number): Pt[] {
  return Array.from({ length: segments }, (_, i) => {
    const a = (-i / segments) * Math.PI * 2;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
}

const diamond = (cx: number, cy: number, rx: number, ry: number): Pt[] => [
  [cx, cy - ry],
  [cx - rx, cy],
  [cx, cy + ry],
  [cx + rx, cy],
];

function cornerVoid(ox: number, oy: number, size: number, dx: number, dy: number): Pt[] {
  return [
    [ox, oy],
    [ox - dx * size, oy],
    [ox - dx * size, oy - dy * size * 0.45],
    [ox - dx * size * 0.45, oy - dy * size],
    [ox, oy - dy * size],
  ];
}

/** SVG path data for a section (y flipped to SVG's downward axis). */
export function sectionPath(section: Section2D) {
  const loop = (pts: Pt[]) => `M${pts.map(([x, y]) => `${x.toFixed(2)} ${(-y).toFixed(2)}`).join("L")}Z`;
  return [loop(section.outline), ...section.holes.map(loop)].join("");
}
