import { z } from "zod";

const clientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.email("Enter a valid email address"),
  socialLinks: z.array(z.url("Enter a valid URL")).optional(),
});

const backgroundSchema = z.enum(["none", "simple", "detailed"]);
const complexityTierSchema = z.enum(["simple", "moderate", "complex"]);

const digitalPortraitDetailsSchema = z.object({
  medium: z.literal("digital"),
  digitalTier: z.enum(["headshot", "halfBody", "fullBody"]),
  subjectCount: z.number().int().min(1),
  background: backgroundSchema,
});

const traditionalPortraitDetailsSchema = z.object({
  medium: z.literal("traditional"),
  traditionalMedium: z.enum(["acrylic", "gouache", "ink", "graphite"]),
  surface: z.enum(["paper", "canvas"]),
  sizePreset: z.enum(["8x10", "11x14", "16x20", "custom"]),
  widthIn: z.number().positive(),
  heightIn: z.number().positive(),
  subjectCount: z.number().int().min(1),
  background: backgroundSchema,
});

const portraitDetailsSchema = z.discriminatedUnion("medium", [
  digitalPortraitDetailsSchema,
  traditionalPortraitDetailsSchema,
]);

const customDetailsSchema = z
  .object({
    category: z.enum([
      "petPortrait",
      "landscape",
      "storybookIllustration",
      "albumArt",
      "mascot",
      "other",
    ]),
    customCategoryLabel: z.string().min(1, "Describe the category").optional(),
    medium: z.enum(["digital", "traditional"]),
    tier: complexityTierSchema,
    background: backgroundSchema,
    pageCount: z.number().int().min(1).optional(),
  })
  .refine((data) => data.category !== "storybookIllustration" || data.pageCount !== undefined, {
    message: "Page/spread count is required for storybook illustrations",
    path: ["pageCount"],
  })
  .refine((data) => data.category !== "other" || !!data.customCategoryLabel, {
    message: "Describe the category",
    path: ["customCategoryLabel"],
  });

const portraitRequestSchema = z.object({
  commissionType: z.literal("portrait"),
  client: clientSchema,
  notes: z.string().optional(),
  isRush: z.boolean(),
  rushNote: z.string().optional(),
  agreedToTerms: z.literal(true, { error: "You must agree to the Terms of Service" }),
  details: portraitDetailsSchema,
});

const customRequestSchema = z.object({
  commissionType: z.literal("custom"),
  client: clientSchema,
  notes: z.string().optional(),
  isRush: z.boolean(),
  rushNote: z.string().optional(),
  agreedToTerms: z.literal(true, { error: "You must agree to the Terms of Service" }),
  details: customDetailsSchema,
});

export const commissionRequestSchema = z.discriminatedUnion("commissionType", [
  portraitRequestSchema,
  customRequestSchema,
]);

export type CommissionFormValues = z.infer<typeof commissionRequestSchema>;
export type PortraitDetails = z.infer<typeof portraitDetailsSchema>;
export type CustomDetails = z.infer<typeof customDetailsSchema>;
