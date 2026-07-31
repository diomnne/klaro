"use client"

import type { PortraitCalcInput } from "@/lib/pricing"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@/components/ui/number-field"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const SIZE_PRESETS: Record<string, { widthIn: number; heightIn: number }> = {
  "8x10": { widthIn: 8, heightIn: 10 },
  "11x14": { widthIn: 11, heightIn: 14 },
  "16x20": { widthIn: 16, heightIn: 20 },
}

const DIGITAL_TIER_LABELS = {
  headshot: "Headshot — ₱1,500",
  halfBody: "Half Body — ₱3,000",
  fullBody: "Full Body — ₱4,500",
}

const TRADITIONAL_MEDIUM_LABELS = {
  acrylic: "Acrylic",
  gouache: "Gouache",
  ink: "Ink",
  graphite: "Graphite",
}

const SURFACE_LABELS = {
  paper: "Paper — ₱10/sq in",
  canvas: "Stretched canvas — ₱40/sq in",
}

const SIZE_PRESET_LABELS = {
  "8x10": "8 × 10 in",
  "11x14": "11 × 14 in",
  "16x20": "16 × 20 in",
  custom: "Custom size",
}

const BACKGROUND_LABELS = {
  none: "None",
  simple: "Simple",
  detailed: "Detailed",
}

export interface PortraitFormState {
  medium: "digital" | "traditional"
  digitalTier: "headshot" | "halfBody" | "fullBody"
  traditionalMedium: "acrylic" | "gouache" | "ink" | "graphite"
  surface: "paper" | "canvas"
  sizePreset: "8x10" | "11x14" | "16x20" | "custom"
  widthIn: number
  heightIn: number
  subjectCount: number
  background: "none" | "simple" | "detailed"
}

export const DEFAULT_PORTRAIT_STATE: PortraitFormState = {
  medium: "digital",
  digitalTier: "headshot",
  traditionalMedium: "acrylic",
  surface: "paper",
  sizePreset: "8x10",
  widthIn: 8,
  heightIn: 10,
  subjectCount: 1,
  background: "none",
}

export function toPortraitCalcInput(
  state: PortraitFormState,
  isRush: boolean
): PortraitCalcInput {
  if (state.medium === "digital") {
    return {
      medium: "digital",
      digitalTier: state.digitalTier,
      subjectCount: state.subjectCount,
      background: state.background,
      isRush,
    }
  }
  return {
    medium: "traditional",
    surface: state.surface,
    widthIn: state.widthIn,
    heightIn: state.heightIn,
    subjectCount: state.subjectCount,
    background: state.background,
    isRush,
  }
}

interface PortraitFieldsProps {
  state: PortraitFormState
  onChange: (state: PortraitFormState) => void
}

export function PortraitFields({ state, onChange }: PortraitFieldsProps) {
  function update<K extends keyof PortraitFormState>(key: K, value: PortraitFormState[K]) {
    onChange({ ...state, [key]: value })
  }

  return (
    <div className="flex flex-col gap-4">
      <Field>
        <FieldLabel>Medium</FieldLabel>
        <RadioGroup
          value={state.medium}
          onValueChange={(value) => update("medium", value as PortraitFormState["medium"])}
          className="flex gap-4"
        >
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="digital" />
            Digital
          </label>
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="traditional" />
            Traditional
          </label>
        </RadioGroup>
      </Field>

      {state.medium === "digital" ? (
        <Field>
          <FieldLabel>Coverage</FieldLabel>
          <Select
            value={state.digitalTier}
            onValueChange={(value) =>
              update("digitalTier", value as PortraitFormState["digitalTier"])
            }
          >
            <SelectTrigger>
              <SelectValue labels={DIGITAL_TIER_LABELS} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="headshot">Headshot — ₱1,500</SelectItem>
              <SelectItem value="halfBody">Half Body — ₱3,000</SelectItem>
              <SelectItem value="fullBody">Full Body — ₱4,500</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      ) : (
        <>
          <Field>
            <FieldLabel>Medium (does not affect price)</FieldLabel>
            <Select
              value={state.traditionalMedium}
              onValueChange={(value) =>
                update("traditionalMedium", value as PortraitFormState["traditionalMedium"])
              }
            >
              <SelectTrigger>
                <SelectValue labels={TRADITIONAL_MEDIUM_LABELS} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="acrylic">Acrylic</SelectItem>
                <SelectItem value="gouache">Gouache</SelectItem>
                <SelectItem value="ink">Ink</SelectItem>
                <SelectItem value="graphite">Graphite</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel>Surface</FieldLabel>
            <Select
              value={state.surface}
              onValueChange={(value) => update("surface", value as PortraitFormState["surface"])}
            >
              <SelectTrigger>
                <SelectValue labels={SURFACE_LABELS} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="paper">Paper — ₱10/sq in</SelectItem>
                <SelectItem value="canvas">Stretched canvas — ₱40/sq in</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel>Size</FieldLabel>
            <Select
              value={state.sizePreset}
              onValueChange={(value) => {
                const preset = value as PortraitFormState["sizePreset"]
                const dims = SIZE_PRESETS[preset]
                onChange({
                  ...state,
                  sizePreset: preset,
                  ...(dims ?? {}),
                })
              }}
            >
              <SelectTrigger>
                <SelectValue labels={SIZE_PRESET_LABELS} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="8x10">8 × 10 in</SelectItem>
                <SelectItem value="11x14">11 × 14 in</SelectItem>
                <SelectItem value="16x20">16 × 20 in</SelectItem>
                <SelectItem value="custom">Custom size</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {state.sizePreset === "custom" && (
            <div className="flex gap-4">
              <Field>
                <FieldLabel>Width (in)</FieldLabel>
                <NumberField
                  value={state.widthIn}
                  onValueChange={(value) => update("widthIn", value ?? 0)}
                  min={1}
                >
                  <NumberFieldGroup>
                    <NumberFieldDecrement />
                    <NumberFieldInput />
                    <NumberFieldIncrement />
                  </NumberFieldGroup>
                </NumberField>
              </Field>
              <Field>
                <FieldLabel>Height (in)</FieldLabel>
                <NumberField
                  value={state.heightIn}
                  onValueChange={(value) => update("heightIn", value ?? 0)}
                  min={1}
                >
                  <NumberFieldGroup>
                    <NumberFieldDecrement />
                    <NumberFieldInput />
                    <NumberFieldIncrement />
                  </NumberFieldGroup>
                </NumberField>
              </Field>
            </div>
          )}
        </>
      )}

      <Field>
        <FieldLabel>Number of subjects</FieldLabel>
        <NumberField
          value={state.subjectCount}
          onValueChange={(value) => update("subjectCount", value ?? 1)}
          min={1}
        >
          <NumberFieldGroup>
            <NumberFieldDecrement />
            <NumberFieldInput />
            <NumberFieldIncrement />
          </NumberFieldGroup>
        </NumberField>
      </Field>

      <Field>
        <FieldLabel>Background</FieldLabel>
        <Select
          value={state.background}
          onValueChange={(value) => update("background", value as PortraitFormState["background"])}
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
