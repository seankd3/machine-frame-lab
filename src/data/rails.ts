import type { RailSpec } from "../model/types";

export const rails: RailSpec[] = [
  {
    id: "none",
    name: "No linear rail",
    widthMm: 0,
    heightMm: 0,
    massKgM: 0,
    eGPa: 200,
    dampingLoss: 0,
  },
  {
    id: "mgn15",
    name: "MGN15 compact rail",
    widthMm: 15,
    heightMm: 12.5,
    massKgM: 1.45,
    eGPa: 200,
    dampingLoss: 0.0015,
  },
  {
    id: "hgr20",
    name: "HGR20 profile rail",
    widthMm: 20,
    heightMm: 17.5,
    massKgM: 2.55,
    eGPa: 200,
    dampingLoss: 0.0015,
  },
  {
    id: "hgr25",
    name: "HGR25 profile rail",
    widthMm: 23,
    heightMm: 22,
    massKgM: 3.55,
    eGPa: 200,
    dampingLoss: 0.0015,
  },
  {
    id: "hgr30",
    name: "HGR30 profile rail",
    widthMm: 28,
    heightMm: 26,
    massKgM: 5.1,
    eGPa: 200,
    dampingLoss: 0.0015,
  },
];

export function getRail(id: string) {
  return rails.find((rail) => rail.id === id) ?? rails[0];
}
