export type Medium = 'digital' | 'traditional' | 'oil-painting' | 'watercolor';

export type Size = 'small' | 'medium' | 'large';

export type Complexity = 'simple' | 'detailed' | 'complex';

export interface AddOns {
  extraCharacter: boolean;
  customBackground: boolean;
  commercialLicense: boolean;
  rushOrder: boolean;
}

export interface PricingSelection {
  medium: Medium;
  size: Size;
  complexity: Complexity;
  addOns: AddOns;
}

export interface PricingLineItem {
  label: string;
  amount: number;
}

export interface PricingBreakdown {
  lineItems: PricingLineItem[];
  total: number;
}

export const MEDIUM_LABELS: Record<Medium, string> = {
  digital: 'Digital Illustration',
  traditional: 'Traditional (Ink / Graphite)',
  'oil-painting': 'Oil Painting',
  watercolor: 'Watercolor',
};

const BASE_PRICE: Record<Medium, number> = {
  digital: 60,
  traditional: 80,
  'oil-painting': 180,
  watercolor: 120,
};

export const SIZE_LABELS: Record<Size, string> = {
  small: 'Small (up to 8×10")',
  medium: 'Medium (up to 16×20")',
  large: 'Large (up to 24×36")',
};

const SIZE_MULTIPLIER: Record<Size, number> = {
  small: 1,
  medium: 1.5,
  large: 2.25,
};

export const COMPLEXITY_LABELS: Record<Complexity, string> = {
  simple: 'Simple (single subject, flat colors)',
  detailed: 'Detailed (shading, patterns, props)',
  complex: 'Complex (multiple subjects, intricate scene)',
};

const COMPLEXITY_MULTIPLIER: Record<Complexity, number> = {
  simple: 1,
  detailed: 1.35,
  complex: 1.75,
};

const EXTRA_CHARACTER_PRICE = 45;
const CUSTOM_BACKGROUND_PRICE = 35;
const COMMERCIAL_LICENSE_PRICE = 100;
const RUSH_ORDER_RATE = 0.25;

export const DEFAULT_SELECTION: PricingSelection = {
  medium: 'digital',
  size: 'small',
  complexity: 'simple',
  addOns: {
    extraCharacter: false,
    customBackground: false,
    commercialLicense: false,
    rushOrder: false,
  },
};

export function calculatePricing(selection: PricingSelection): PricingBreakdown {
  const { medium, size, complexity, addOns } = selection;

  const base = BASE_PRICE[medium] * SIZE_MULTIPLIER[size] * COMPLEXITY_MULTIPLIER[complexity];

  const lineItems: PricingLineItem[] = [
    {
      label: `${MEDIUM_LABELS[medium]} — ${SIZE_LABELS[size]}, ${COMPLEXITY_LABELS[complexity]}`,
      amount: base,
    },
  ];

  if (addOns.extraCharacter) {
    lineItems.push({ label: 'Extra character', amount: EXTRA_CHARACTER_PRICE });
  }
  if (addOns.customBackground) {
    lineItems.push({ label: 'Custom background', amount: CUSTOM_BACKGROUND_PRICE });
  }
  if (addOns.commercialLicense) {
    lineItems.push({ label: 'Commercial license', amount: COMMERCIAL_LICENSE_PRICE });
  }

  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);

  if (addOns.rushOrder) {
    const rushFee = subtotal * RUSH_ORDER_RATE;
    lineItems.push({ label: 'Rush order (+25%)', amount: rushFee });
  }

  const total = lineItems.reduce((sum, item) => sum + item.amount, 0);

  return { lineItems, total };
}
