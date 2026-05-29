import type { McmasterDetection } from "./types";

export function parseMcmasterInput(input: string): McmasterDetection {
  const text = input.trim();
  const notes: string[] = [];
  const partNumber = text.match(/\b\d{4,6}[A-Z]\d{1,5}\b/i)?.[0]?.toUpperCase();
  const pair = text.match(/(\d+(?:\.\d+)?)\s*(?:mm)?\s*(?:x|by)\s*(\d+(?:\.\d+)?)\s*mm?/i);
  const mmValues = [...text.matchAll(/(\d+(?:\.\d+)?)\s*mm/gi)].map((match) => Number(match[1]));
  const slot = text.match(/(?:slot|t-slot|t slot)\D*(\d+(?:\.\d+)?)\s*mm/i)?.[1];

  let widthMm = pair ? Number(pair[1]) : undefined;
  let heightMm = pair ? Number(pair[2]) : undefined;

  if (!widthMm && mmValues.length >= 2) {
    const likelyDims = mmValues.filter((value) => value >= 15 && value <= 200).slice(0, 2);
    widthMm = likelyDims[0];
    heightMm = likelyDims[1];
  }

  if (partNumber) notes.push(`Part ${partNumber}`);
  if (widthMm && heightMm) notes.push(`${widthMm} x ${heightMm} mm envelope`);
  if (slot) notes.push(`${slot} mm slot cue`);

  const confidence = [partNumber, widthMm && heightMm, slot].filter(Boolean).length / 3;

  return {
    partNumber,
    widthMm,
    heightMm,
    slotMm: slot ? Number(slot) : undefined,
    confidence,
    notes,
  };
}
