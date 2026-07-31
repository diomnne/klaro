import type { PricingConfig } from "./types";

/**
 * Placeholder values (flagged below) are round-number estimates for a
 * functional calculator and must be confirmed with the artist before
 * this ships to real clients.
 */
export const PRICING_CONFIG: PricingConfig = {
  baseCurrency: "PHP",
  digitalPortrait: {
    headshot: 1500,
    halfBody: 3000,
    fullBody: 4500,
  },
  traditionalPortrait: {
    ratePerSqInPaper: 10,
    ratePerSqInCanvas: 40,
  },
  additionalSubjectMultiplier: 0.5,
  backgroundFee: {
    none: 0,
    simple: 150, // PLACEHOLDER — confirm with artist
    detailed: 300, // PLACEHOLDER — confirm with artist
  },
  rushFee: 500, // PLACEHOLDER — confirm with artist
  customWork: {
    complexityTiers: {
      simple: { min: 1500, max: 3000 }, // PLACEHOLDER — confirm with artist
      moderate: { min: 3000, max: 6000 }, // PLACEHOLDER — confirm with artist
      complex: { min: 6000, max: 12000 }, // PLACEHOLDER — confirm with artist
    },
  },
};
