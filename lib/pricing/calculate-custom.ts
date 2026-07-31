import { PRICING_CONFIG } from "./config";
import type { CustomCalcInput, PriceRange, PriceResult, PricingConfig } from "./types";

function scale(range: PriceRange, factor: number): PriceRange {
  return { min: range.min * factor, max: range.max * factor };
}

export function calculateCustomPrice(
  input: CustomCalcInput,
  config: PricingConfig = PRICING_CONFIG
): PriceResult<PriceRange> {
  const tierRange = config.customWork.complexityTiers[input.tier];
  const backgroundFee = config.backgroundFee[input.background];
  const rush = input.isRush ? config.rushFee : 0;

  const total: PriceRange = {
    min: tierRange.min + backgroundFee + rush,
    max: tierRange.max + backgroundFee + rush,
  };

  const finalTotal =
    input.category === "storybookIllustration" ? scale(total, input.pageCount) : total;

  return {
    total: finalTotal,
    downpayment: { min: finalTotal.min * 0.5, max: finalTotal.max * 0.5 },
  };
}
