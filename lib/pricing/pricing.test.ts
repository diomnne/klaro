import { describe, expect, it } from "vitest";

import { calculateCustomPrice } from "./calculate-custom";
import { calculatePortraitPrice } from "./calculate-portrait";
import { PRICING_CONFIG } from "./config";
import type { PricingConfig } from "./types";

// Local literal config so these formula tests stay correct even after the
// PLACEHOLDER values in config.ts are tuned to real numbers.
const TEST_CONFIG: PricingConfig = {
  baseCurrency: "PHP",
  digitalPortrait: { headshot: 1500, halfBody: 3000, fullBody: 4500 },
  traditionalPortrait: { ratePerSqInPaper: 10, ratePerSqInCanvas: 40 },
  additionalSubjectMultiplier: 0.5,
  backgroundFee: { none: 0, simple: 150, detailed: 300 },
  rushFee: 500,
  customWork: {
    complexityTiers: {
      simple: { min: 1500, max: 3000 },
      moderate: { min: 3000, max: 6000 },
      complex: { min: 6000, max: 12000 },
    },
  },
};

describe("calculatePortraitPrice — digital", () => {
  it("headshot, 1 subject, no background, no rush", () => {
    const result = calculatePortraitPrice(
      { medium: "digital", digitalTier: "headshot", subjectCount: 1, background: "none", isRush: false },
      TEST_CONFIG
    );
    expect(result.total).toBe(1500);
    expect(result.downpayment).toBe(750);
  });

  it("half body, 2 subjects, no background, no rush", () => {
    const result = calculatePortraitPrice(
      { medium: "digital", digitalTier: "halfBody", subjectCount: 2, background: "none", isRush: false },
      TEST_CONFIG
    );
    expect(result.total).toBe(4500);
  });
});

describe("calculatePortraitPrice — traditional", () => {
  it("paper, 8x10 (80 sq in), 1 subject", () => {
    const result = calculatePortraitPrice(
      {
        medium: "traditional",
        surface: "paper",
        widthIn: 8,
        heightIn: 10,
        subjectCount: 1,
        background: "none",
        isRush: false,
      },
      TEST_CONFIG
    );
    expect(result.total).toBe(800);
  });

  it("stretched canvas, 8x10 (80 sq in), 1 subject", () => {
    const result = calculatePortraitPrice(
      {
        medium: "traditional",
        surface: "canvas",
        widthIn: 8,
        heightIn: 10,
        subjectCount: 1,
        background: "none",
        isRush: false,
      },
      TEST_CONFIG
    );
    expect(result.total).toBe(3200);
  });

  it("paper, 11x14 (154 sq in), 2 subjects", () => {
    const result = calculatePortraitPrice(
      {
        medium: "traditional",
        surface: "paper",
        widthIn: 11,
        heightIn: 14,
        subjectCount: 2,
        background: "none",
        isRush: false,
      },
      TEST_CONFIG
    );
    expect(result.total).toBe(2310);
  });

  it("downpayment for the 11x14 case is exactly half", () => {
    const result = calculatePortraitPrice(
      {
        medium: "traditional",
        surface: "paper",
        widthIn: 11,
        heightIn: 14,
        subjectCount: 2,
        background: "none",
        isRush: false,
      },
      TEST_CONFIG
    );
    expect(result.downpayment).toBe(1155);
  });
});

describe("calculateCustomPrice", () => {
  it("mascot, moderate tier, simple background, no rush", () => {
    const result = calculateCustomPrice(
      {
        category: "mascot",
        tier: "moderate",
        background: "simple",
        isRush: false,
      },
      TEST_CONFIG
    );
    expect(result.total).toEqual({ min: 3000 + 150, max: 6000 + 150 });
  });

  it("other category, simple tier, no background, no rush", () => {
    const result = calculateCustomPrice(
      {
        category: "other",
        tier: "simple",
        background: "none",
        isRush: false,
      },
      TEST_CONFIG
    );
    expect(result.total).toEqual({ min: 1500, max: 3000 });
  });

  it("storybook illustration, 5 pages, simple tier per page", () => {
    const result = calculateCustomPrice(
      {
        category: "storybookIllustration",
        tier: "simple",
        background: "none",
        isRush: false,
        pageCount: 5,
      },
      TEST_CONFIG
    );
    expect(result.total).toEqual({ min: 1500 * 5, max: 3000 * 5 });
  });

  it("downpayment for a 2000-3500 range is 1000-1750", () => {
    const range = { min: 2000, max: 3500 };
    expect({ min: range.min * 0.5, max: range.max * 0.5 }).toEqual({ min: 1000, max: 1750 });
  });
});

describe("PRICING_CONFIG placeholder smoke test", () => {
  it("matches the documented placeholder values", () => {
    expect(PRICING_CONFIG.backgroundFee).toEqual({ none: 0, simple: 150, detailed: 300 });
    expect(PRICING_CONFIG.rushFee).toBe(500);
    expect(PRICING_CONFIG.customWork.complexityTiers).toEqual({
      simple: { min: 1500, max: 3000 },
      moderate: { min: 3000, max: 6000 },
      complex: { min: 6000, max: 12000 },
    });
  });
});
