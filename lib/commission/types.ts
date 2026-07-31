import type { PriceRange } from "@/lib/pricing";
import type { CustomDetails, PortraitDetails } from "@/lib/validation/commission-schema";

export interface CommissionRequestPayload {
  client: { name: string; email: string; socialLinks?: string[] };
  notes?: string;
  referenceImageNames: string[];
  isRush: boolean;
  rushNote?: string;
  commissionType: "portrait" | "custom";
  details: PortraitDetails | CustomDetails;
  computedPrice: {
    total: number | PriceRange;
    downpayment: number | PriceRange;
  };
  agreedToTerms: true;
}
