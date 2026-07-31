import Link from "next/link"

import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"

interface TermsCheckboxProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  error?: string
}

export function TermsCheckbox({ checked, onCheckedChange, error }: TermsCheckboxProps) {
  return (
    <Field invalid={!!error} className="gap-2">
      <FieldLabel>
        <Checkbox checked={checked} onCheckedChange={onCheckedChange} />
        I have read and agree to the{" "}
        <Link href="/terms" className="underline underline-offset-4 hover:text-foreground">
          Terms of Service
        </Link>
      </FieldLabel>
      {error && <FieldError match>{error}</FieldError>}
      <p className="text-sm text-muted-foreground">
        Submitting this form sends a commission request, not a confirmed slot. Requests are
        reviewed on a first-come-first-served basis, and the artist reserves the right to decline
        any commission for any reason.
      </p>
    </Field>
  )
}
