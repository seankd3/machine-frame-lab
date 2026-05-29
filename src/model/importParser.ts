import type { McmasterDetection } from "./types";
import { findProfileByPartNumber } from "../data/profiles";

export function parseMcmasterInput(input: string): McmasterDetection {
  const text = input.trim();
  const notes: string[] = [];
  const partNumber = text.match(/\b\d{4,6}[A-Z]\d{1,5}\b/i)?.[0]?.toUpperCase();
  const matchedProfile = partNumber ? findProfileByPartNumber(partNumber) : undefined;
  const pair = text.match(/(\d+(?:\.\d+)?)\s*(?:mm)?\s*(?:x|by)\s*(\d+(?:\.\d+)?)\s*mm?/i);
  const inchPair = text.match(/(\d+(?:\.\d+)?)\s*(?:"|in)\s*(?:x|by)\s*(\d+(?:\.\d+)?)\s*(?:"|in)/i);
  const mmValues = [...text.matchAll(/(\d+(?:\.\d+)?)\s*mm/gi)].map((match) => Number(match[1]));
  const slot = text.match(/(?:slot|t-slot|t slot)\D*(\d+(?:\.\d+)?)\s*mm/i)?.[1];

  let widthMm = matchedProfile?.widthMm ?? (pair ? Number(pair[1]) : undefined);
  let heightMm = matchedProfile?.heightMm ?? (pair ? Number(pair[2]) : undefined);
  let slotMm = matchedProfile?.slotMm ?? (slot ? Number(slot) : undefined);

  if (!widthMm && inchPair) {
    widthMm = Number(inchPair[1]) * 25.4;
    heightMm = Number(inchPair[2]) * 25.4;
  }

  if (!widthMm && mmValues.length >= 2) {
    const likelyDims = mmValues.filter((value) => value >= 15 && value <= 200).slice(0, 2);
    widthMm = likelyDims[0];
    heightMm = likelyDims[1];
  }

  if (partNumber) notes.push(`Part ${partNumber}`);
  if (matchedProfile) notes.push(`Matched ${matchedProfile.name}`);
  if (widthMm && heightMm) notes.push(`${widthMm} x ${heightMm} mm envelope`);
  if (slotMm) notes.push(`${slotMm} mm slot cue`);

  const confidence = matchedProfile
    ? 1
    : [partNumber, widthMm && heightMm, slotMm].filter(Boolean).length / 3;

  return {
    partNumber,
    widthMm,
    heightMm,
    slotMm,
    confidence,
    notes,
  };
}
