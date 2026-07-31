import { PRICING_CONFIG } from "./config";
import type { PortraitCalcInput, PriceResult, PricingConfig } from "./types";

export function calculatePortraitPrice(
  input: PortraitCalcInput,
  config: PricingConfig = PRICING_CONFIG
): PriceResult<number> {
  const base =
    input.medium === "digital"
      ? config.digitalPortrait[input.digitalTier]
      : input.widthIn *
        input.heightIn *
        (input.surface === "canvas"
          ? config.traditionalPortrait.ratePerSqInCanvas
          : config.traditionalPortrait.ratePerSqInPaper);

  const total =
    base +
    (input.subjectCount - 1) * config.additionalSubjectMultiplier * base +
    config.backgroundFee[input.background] +
    (input.isRush ? config.rushFee : 0);

  return { total, downpayment: total * 0.5 };
}
