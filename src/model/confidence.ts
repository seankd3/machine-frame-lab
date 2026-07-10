import type { ProfileSpec } from "./types";

export function profileConfidence(profile: ProfileSpec, hasCustomProfile: boolean) {
  if (hasCustomProfile) {
    return {
      label: "Custom/imported profile",
      tone: "strong" as const,
      summary:
        "Profile dimensions came from the current import/custom entry. Treat EI and mass as verified only if they match drawing or CAD mass properties.",
      needs: [
        "Confirm area, mass per meter, Ix/Iy, and fillable area against CAD or supplier tables.",
        "Confirm rail-to-extrusion mounting stiffness and real support conditions.",
      ],
    };
  }

  return {
    label: "Seeded approximate profile",
    tone: "caution" as const,
    summary:
      "Catalog seed dimensions are useful for comparison, but section properties are estimated from profile geometry.",
    needs: [
      "Replace with supplier section tables or CAD mass properties before ordering material.",
      "Check connection stiffness, fastener spacing, rail preload, and base-frame load paths.",
    ],
  };
}
