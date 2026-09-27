// A machine is a small document of choices. Everything physical — every part,
// its cut length, every joint, the FE model, the bill of materials — is
// compiled from it, so the picture, the costs and the physics always agree.
// The URL hash holds the document, so a copied address is the share link.

export interface AxisChoice {
  guide: string; // rail id
  drive: string; // drive id
  motor: string; // motor id
}

export interface Machine {
  /** Travel in mm. */
  work: { x: number; y: number; z: number };
  frame: { stock: string; joinery: Joinery };
  gantry: { beam: string; beams: 1 | 2; plateMm: number; clearanceMm: number };
  x: AxisChoice;
  y: AxisChoice;
  z: AxisChoice;
  spindle: string;
  controller: string;
  /** Peak cutting force used for the tool-deflection check (N). */
  cutN: number;
}

export type Joinery = "brackets" | "plates" | "welded";

export const defaultMachine: Machine = {
  work: { x: 800, y: 800, z: 150 },
  frame: { stock: "40-4080", joinery: "plates" },
  gantry: { beam: "40-8080", beams: 1, plateMm: 12, clearanceMm: 150 },
  x: { guide: "HGR20", drive: "SFU1605", motor: "23HS30" },
  y: { guide: "HGR20", drive: "SFU1605", motor: "23HS30" },
  z: { guide: "HGR15", drive: "SFU1605", motor: "23HS22" },
  spindle: "spindle-2.2kw",
  controller: "fluidnc-6pack",
  cutN: 150,
};

type Path = { key: string; get: (m: Machine) => string | number; set: (m: Machine, v: string) => void; numeric: boolean };

const field = (key: string, numeric: boolean): Path => {
  const parts = key.split(".");
  return {
    key,
    numeric,
    get: (m) => parts.reduce<any>((o, p) => o[p], m),
    set: (m, v) => {
      const owner = parts.slice(0, -1).reduce<any>((o, p) => o[p], m);
      owner[parts[parts.length - 1]] = numeric ? Number(v) : v;
    },
  };
};

const paths: Path[] = [
  ...["work.x", "work.y", "work.z", "gantry.beams", "gantry.plateMm", "gantry.clearanceMm", "cutN"].map((k) => field(k, true)),
  ...["frame.stock", "frame.joinery", "gantry.beam", "spindle", "controller"].map((k) => field(k, false)),
  ...["x", "y", "z"].flatMap((a) => ["guide", "drive", "motor"].map((k) => field(`${a}.${k}`, false))),
];

export const cloneMachine = (m: Machine): Machine => JSON.parse(JSON.stringify(m));

/** Readable key=value hash; unknown keys and unreadable values fall back to defaults. */
export function parseMachine(text: string, valid: (key: string, value: string | number) => boolean): Machine {
  const params = new URLSearchParams(text.replace(/^#/, ""));
  const machine = cloneMachine(defaultMachine);
  for (const path of paths) {
    const raw = params.get(path.key);
    if (raw === null) continue;
    const value = path.numeric ? Number(raw) : raw;
    if ((path.numeric && !Number.isFinite(value)) || !valid(path.key, value)) continue;
    path.set(machine, raw);
  }
  return machine;
}

export const formatMachine = (m: Machine) =>
  new URLSearchParams(paths.map((p) => [p.key, String(p.get(m))])).toString();

/** Immutable update of one dotted path, e.g. set(m, "x.guide", "HGR15"). */
export function setPath(m: Machine, key: string, value: string | number): Machine {
  const next = cloneMachine(m);
  const path = paths.find((p) => p.key === key);
  if (!path) throw new Error(`Unknown machine field ${key}`);
  path.set(next, String(value));
  return next;
}
