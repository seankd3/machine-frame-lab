import { defaultMachine, type Machine } from "./document";

// Starting points, and the build check's reference machines: each must always
// compile into a solvable structure with a coherent BOM.

export interface Preset {
  id: string;
  name: string;
  blurb: string;
  machine: Machine;
}

export const presets: Preset[] = [
  {
    id: "desktop",
    name: "Desktop belt router",
    blurb: "400 × 400, 20 mm extrusion, MGN12 rails, belts, trim router",
    machine: {
      ...defaultMachine,
      work: { x: 400, y: 400, z: 80 },
      frame: { stock: "20-2040", joinery: "brackets" },
      gantry: { beam: "20-2040", beams: 1, plateMm: 8, clearanceMm: 100 },
      x: { guide: "MGN12", drive: "GT2-9", motor: "17HS19" },
      y: { guide: "MGN12", drive: "GT2-9", motor: "17HS19" },
      z: { guide: "MGN12", drive: "SFU1605", motor: "17HS19" },
      spindle: "makita-rt0701c",
      controller: "jackpot3",
      cutN: 60,
    },
  },
  {
    id: "default",
    name: "Aluminium 800 router",
    blurb: "800 × 800, 40 mm extrusion, HGR20, ball screws, 2.2 kW",
    machine: defaultMachine,
  },
  {
    id: "steel",
    name: "Welded steel mill",
    blurb: "900 × 1200, 4×2 steel tube, stacked beam, HGR25, SFU2005",
    machine: {
      ...defaultMachine,
      work: { x: 900, y: 1200, z: 200 },
      frame: { stock: "tube-4x2x0.1875", joinery: "welded" },
      gantry: { beam: "tube-3x3x0.1875", beams: 2, plateMm: 20, clearanceMm: 220 },
      x: { guide: "HGR25", drive: "SFU2005", motor: "23HS45" },
      y: { guide: "HGR25", drive: "SFU2005", motor: "23HS45" },
      z: { guide: "HGR20", drive: "SFU2005", motor: "23HS45" },
      controller: "fluidnc-dm556t",
      cutN: 300,
    },
  },
];
