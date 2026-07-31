export type Currency = "PHP";

export type BackgroundComplexity = "none" | "simple" | "detailed";

export type ComplexityTier = "simple" | "moderate" | "complex";

export type TraditionalSurface = "paper" | "canvas";

export type TraditionalMedium = "acrylic" | "gouache" | "ink" | "graphite";

export type DigitalPortraitTier = "headshot" | "halfBody" | "fullBody";

export type SizePreset = "8x10" | "11x14" | "16x20" | "custom";

export type CustomCategory =
  | "petPortrait"
  | "landscape"
  | "storybookIllustration"
  | "albumArt"
  | "mascot"
  | "other";

export interface PriceRange {
  min: number;
  max: number;
}

export interface PricingConfig {
  baseCurrency: Currency;
  digitalPortrait: Record<DigitalPortraitTier, number>;
  traditionalPortrait: {
    ratePerSqInPaper: number;
    ratePerSqInCanvas: number;
  };
  additionalSubjectMultiplier: number;
  backgroundFee: Record<BackgroundComplexity, number>;
  rushFee: number;
  customWork: {
    complexityTiers: Record<ComplexityTier, PriceRange>;
  };
}

interface PortraitCalcShared {
  subjectCount: number;
  background: BackgroundComplexity;
  isRush: boolean;
}

export type PortraitCalcInput = PortraitCalcShared &
  (
    | { medium: "digital"; digitalTier: DigitalPortraitTier }
    | {
        medium: "traditional";
        surface: TraditionalSurface;
        widthIn: number;
        heightIn: number;
      }
  );

interface CustomCalcShared {
  category: CustomCategory;
  tier: ComplexityTier;
  background: BackgroundComplexity;
  isRush: boolean;
}

export type CustomCalcInput = CustomCalcShared &
  ({ category: "storybookIllustration"; pageCount: number } | { category: Exclude<CustomCategory, "storybookIllustration"> });

export interface PriceResult<T = number> {
  total: T;
  downpayment: T;
}
