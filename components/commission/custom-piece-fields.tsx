"use client"

import type { ComplexityTier, CustomCalcInput, PricingConfig } from "@/lib/pricing"
import { PRICING_CONFIG, formatCurrencyRange } from "@/lib/pricing"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@/components/ui/number-field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export interface CustomFormState {
  category: "petPortrait" | "landscape" | "storybookIllustration" | "albumArt" | "mascot" | "other"
  customCategoryLabel: string
  medium: "digital" | "traditional"
  tier: ComplexityTier
  background: "none" | "simple" | "detailed"
  pageCount: number
}

export const DEFAULT_CUSTOM_STATE: CustomFormState = {
  category: "petPortrait",
  customCategoryLabel: "",
  medium: "digital",
  tier: "simple",
  background: "none",
  pageCount: 1,
}

export function toCustomCalcInput(state: CustomFormState, isRush: boolean): CustomCalcInput {
  const shared = {
    tier: state.tier,
    background: state.background,
    isRush,
  }
  if (state.category === "storybookIllustration") {
    return { ...shared, category: "storybookIllustration", pageCount: state.pageCount }
  }
  return { ...shared, category: state.category }
}

const CATEGORY_LABELS: Record<CustomFormState["category"], string> = {
  petPortrait: "Pet portrait",
  landscape: "Landscape",
  storybookIllustration: "Storybook illustration",
  albumArt: "Album art",
  mascot: "Mascot",
  other: "Other",
}

const MEDIUM_LABELS: Record<CustomFormState["medium"], string> = {
  digital: "Digital",
  traditional: "Traditional",
}

const BACKGROUND_LABELS: Record<CustomFormState["background"], string> = {
  none: "None",
  simple: "Simple",
  detailed: "Detailed",
}

const TIER_COPY: Record<ComplexityTier, { label: string; example: string }> = {
  simple: { label: "Simple", example: "One subject, minimal background" },
  moderate: { label: "Moderate", example: "A couple subjects, or a moderately detailed scene" },
  complex: { label: "Complex", example: "Multiple subjects, or intricate background and detail" },
}

function tierRangeLabel(tier: ComplexityTier, config: PricingConfig) {
  return formatCurrencyRange(config.customWork.complexityTiers[tier], config.baseCurrency)
}

interface CustomPieceFieldsProps {
  state: CustomFormState
  onChange: (state: CustomFormState) => void
}

export function CustomPieceFields({ state, onChange }: CustomPieceFieldsProps) {
  function update<K extends keyof CustomFormState>(key: K, value: CustomFormState[K]) {
    onChange({ ...state, [key]: value })
  }

  return (
    <div className="flex flex-col gap-4">
      <Field>
        <FieldLabel>Category</FieldLabel>
        <Select
          value={state.category}
          onValueChange={(value) => update("category", value as CustomFormState["category"])}
        >
          <SelectTrigger>
            <SelectValue labels={CATEGORY_LABELS} />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldDescription>
          A starting point — describe what you actually want in the notes below.
        </FieldDescription>
      </Field>

      {state.category === "other" && (
        <Field>
          <FieldLabel>What kind of piece is it?</FieldLabel>
          <Input
            placeholder="e.g. Character redesign"
            value={state.customCategoryLabel}
            onChange={(event) => update("customCategoryLabel", event.target.value)}
          />
        </Field>
      )}

      <Field>
        <FieldLabel>Medium</FieldLabel>
        <Select
          value={state.medium}
          onValueChange={(value) => update("medium", value as CustomFormState["medium"])}
        >
          <SelectTrigger>
            <SelectValue labels={MEDIUM_LABELS} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="digital">Digital</SelectItem>
            <SelectItem value="traditional">Traditional</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      {state.category === "storybookIllustration" && (
        <Field>
          <FieldLabel>Pages / spreads</FieldLabel>
          <NumberField
            value={state.pageCount}
            onValueChange={(value) => update("pageCount", value ?? 1)}
            min={1}
          >
            <NumberFieldGroup>
              <NumberFieldDecrement />
              <NumberFieldInput />
              <NumberFieldIncrement />
            </NumberFieldGroup>
          </NumberField>
        </Field>
      )}

      <Field>
        <FieldLabel>Complexity</FieldLabel>
        <Select
          value={state.tier}
          onValueChange={(value) => update("tier", value as ComplexityTier)}
        >
          <SelectTrigger>
            <SelectValue labels={Object.fromEntries(
              Object.entries(TIER_COPY).map(([tier, copy]) => [tier, copy.label])
            )} />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(TIER_COPY) as ComplexityTier[]).map((tier) => (
              <SelectItem key={tier} value={tier}>
                {TIER_COPY[tier].label} — {tierRangeLabel(tier, PRICING_CONFIG)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldDescription>{TIER_COPY[state.tier].example}</FieldDescription>
      </Field>

      <Field>
        <FieldLabel>Background</FieldLabel>
        <Select
          value={state.background}
          onValueChange={(value) => update("background", value as CustomFormState["background"])}
        >
          <SelectTrigger>
            <SelectValue labels={BACKGROUND_LABELS} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="simple">Simple</SelectItem>
            <SelectItem value="detailed">Detailed</SelectItem>
          </SelectContent>
        </Select>
      </Field>
    </div>
  )
}
