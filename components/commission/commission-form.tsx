"use client"

import type * as React from "react"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { calculateCustomPrice, calculatePortraitPrice } from "@/lib/pricing"
import type { CommissionRequestPayload } from "@/lib/commission/types"
import { submitCommissionRequest } from "@/lib/commission/submit-commission-request"
import { commissionRequestSchema } from "@/lib/validation/commission-schema"

import { ClientInfoFields } from "./client-info-fields"
import { CommissionTypeTabs } from "./commission-type-tabs"
import {
  CustomPieceFields,
  DEFAULT_CUSTOM_STATE,
  toCustomCalcInput,
  type CustomFormState,
} from "./custom-piece-fields"
import {
  DEFAULT_PORTRAIT_STATE,
  PortraitFields,
  toPortraitCalcInput,
  type PortraitFormState,
} from "./portrait-fields"
import { PricePreviewPanel } from "./price-preview-panel"
import { ReferenceImageUpload, type ReferenceImage } from "./reference-image-upload"
import { RushToggle } from "./rush-toggle"
import { SocialLinksField, type SocialLink } from "./social-links-field"
import { SubmitResult } from "./submit-result"
import { TermsCheckbox } from "./terms-checkbox"

function createEmptySocialLink(index: number): SocialLink {
  return { id: `social-${index}`, url: "" }
}

export function CommissionForm() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [notes, setNotes] = useState("")
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(() => [createEmptySocialLink(0)])
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([])
  const [isRush, setIsRush] = useState(false)
  const [rushNote, setRushNote] = useState("")
  const [commissionType, setCommissionType] = useState<"portrait" | "custom">("portrait")
  const [portraitState, setPortraitState] = useState<PortraitFormState>(DEFAULT_PORTRAIT_STATE)
  const [customState, setCustomState] = useState<CustomFormState>(DEFAULT_CUSTOM_STATE)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<{ message: string } | null>(null)

  const priceResult = useMemo(() => {
    if (commissionType === "portrait") {
      return calculatePortraitPrice(toPortraitCalcInput(portraitState, isRush))
    }
    return calculateCustomPrice(toCustomCalcInput(customState, isRush))
  }, [commissionType, portraitState, customState, isRush])

  function handleCommissionTypeChange(type: "portrait" | "custom") {
    setCommissionType(type)
    setPortraitState(DEFAULT_PORTRAIT_STATE)
    setCustomState(DEFAULT_CUSTOM_STATE)
  }

  function buildFormValues() {
    const client = {
      name,
      email,
      socialLinks: socialLinks.map((link) => link.url).filter((url) => url.length > 0),
    }

    if (commissionType === "portrait") {
      const details =
        portraitState.medium === "digital"
          ? {
              medium: "digital" as const,
              digitalTier: portraitState.digitalTier,
              subjectCount: portraitState.subjectCount,
              background: portraitState.background,
            }
          : {
              medium: "traditional" as const,
              traditionalMedium: portraitState.traditionalMedium,
              surface: portraitState.surface,
              sizePreset: portraitState.sizePreset,
              widthIn: portraitState.widthIn,
              heightIn: portraitState.heightIn,
              subjectCount: portraitState.subjectCount,
              background: portraitState.background,
            }

      return {
        commissionType: "portrait" as const,
        client,
        notes: notes || undefined,
        isRush,
        rushNote: isRush ? rushNote || undefined : undefined,
        agreedToTerms,
        details,
      }
    }

    return {
      commissionType: "custom" as const,
      client,
      notes: notes || undefined,
      isRush,
      rushNote: isRush ? rushNote || undefined : undefined,
      agreedToTerms,
      details: {
        category: customState.category,
        customCategoryLabel:
          customState.category === "other" ? customState.customCategoryLabel || undefined : undefined,
        medium: customState.medium,
        tier: customState.tier,
        background: customState.background,
        pageCount:
          customState.category === "storybookIllustration" ? customState.pageCount : undefined,
      },
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitResult(null)

    const formValues = buildFormValues()
    const result = commissionRequestSchema.safeParse(formValues)

    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const key = issue.path.join(".")
        if (!fieldErrors[key]) fieldErrors[key] = issue.message
      }
      setErrors(fieldErrors)
      return
    }

    setErrors({})
    setIsSubmitting(true)

    const payload: CommissionRequestPayload = {
      client: result.data.client,
      notes: result.data.notes,
      referenceImageNames: referenceImages.map((image) => image.file.name),
      isRush: result.data.isRush,
      rushNote: result.data.rushNote,
      commissionType: result.data.commissionType,
      details: result.data.details,
      computedPrice: priceResult,
      agreedToTerms: true,
    }

    try {
      const response = await submitCommissionRequest(payload)
      setSubmitResult({ message: response.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitResult) {
    return <SubmitResult message={submitResult.message} />
  }

  return (
    <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_320px]">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Client Info</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ClientInfoFields
              name={name}
              onNameChange={setName}
              email={email}
              onEmailChange={setEmail}
              errors={{ name: errors["client.name"], email: errors["client.email"] }}
            />
            <SocialLinksField links={socialLinks} onLinksChange={setSocialLinks} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Commission Details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <CommissionTypeTabs
              commissionType={commissionType}
              onCommissionTypeChange={handleCommissionTypeChange}
              portraitContent={<PortraitFields state={portraitState} onChange={setPortraitState} />}
              customContent={<CustomPieceFields state={customState} onChange={setCustomState} />}
            />
            <Field>
              <FieldLabel>Commission description / notes (optional)</FieldLabel>
              <Textarea
                placeholder="Describe what you want..."
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reference Images</CardTitle>
          </CardHeader>
          <CardContent>
            <ReferenceImageUpload images={referenceImages} onImagesChange={setReferenceImages} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rush</CardTitle>
          </CardHeader>
          <CardContent>
            <RushToggle
              isRush={isRush}
              onIsRushChange={setIsRush}
              rushNote={rushNote}
              onRushNoteChange={setRushNote}
            />
          </CardContent>
        </Card>

        <div className="lg:hidden">
          <PricePreviewPanel
            commissionType={commissionType}
            total={priceResult.total}
            downpayment={priceResult.downpayment}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Terms &amp; Submit</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <TermsCheckbox
              checked={agreedToTerms}
              onCheckedChange={setAgreedToTerms}
              error={errors.agreedToTerms}
            />
            <Button type="submit" disabled={!agreedToTerms || isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Request"}
            </Button>
          </CardContent>
        </Card>
      </form>

      <div className="hidden lg:sticky lg:top-8 lg:block lg:self-start">
        <PricePreviewPanel
          commissionType={commissionType}
          total={priceResult.total}
          downpayment={priceResult.downpayment}
        />
      </div>
    </div>
  )
}
