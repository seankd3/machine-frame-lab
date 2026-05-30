import type { MachineScenario, ProfileSpec } from "./types";

const SHARE_PARAM = "design";
const DRAFT_KEY = "machine-frame-lab:draft";

export interface SharedDesign {
  version: 1;
  scenario: MachineScenario;
  customProfile: ProfileSpec | null;
}

export function createShareUrl(payload: SharedDesign) {
  const url = new URL(window.location.href);
  url.searchParams.set(SHARE_PARAM, encodeDesign(payload));
  return url.toString();
}

export function readSharedDesign(): SharedDesign | null {
  const encoded = new URLSearchParams(window.location.search).get(SHARE_PARAM);
  if (!encoded) return null;

  try {
    const parsed = JSON.parse(decodeDesign(encoded)) as SharedDesign;
    return parsed.version === 1 ? parsed : null;
  } catch {
    return null;
  }
}

export function readDraftDesign(): SharedDesign | null {
  try {
    const encoded = window.localStorage.getItem(DRAFT_KEY);
    if (!encoded) return null;

    const parsed = JSON.parse(encoded) as SharedDesign;
    return parsed.version === 1 ? parsed : null;
  } catch {
    return null;
  }
}

export function saveDraftDesign(payload: SharedDesign) {
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  } catch {
    // Private browsing and locked-down browsers can block local draft saves.
  }
}

export function clearDraftDesign() {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}

export function clearSharedDesignFromUrl() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(SHARE_PARAM)) return;

  url.searchParams.delete(SHARE_PARAM);
  window.history.replaceState(null, "", url.toString());
}

export function downloadSharedDesign(payload: SharedDesign) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "machine-frame-design.json";
  link.click();
  URL.revokeObjectURL(url);
}

function encodeDesign(payload: SharedDesign) {
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}

function decodeDesign(encoded: string) {
  const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}
