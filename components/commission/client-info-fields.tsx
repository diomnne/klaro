import { Field, FieldControl, FieldError, FieldLabel } from "@/components/ui/field"

interface ClientInfoFieldsProps {
  name: string
  onNameChange: (name: string) => void
  email: string
  onEmailChange: (email: string) => void
  errors: { name?: string; email?: string }
}

export function ClientInfoFields({
  name,
  onNameChange,
  email,
  onEmailChange,
  errors,
}: ClientInfoFieldsProps) {
  return (
    <div className="flex flex-col gap-4">
      <Field invalid={!!errors.name}>
        <FieldLabel>Name</FieldLabel>
        <FieldControl
          value={name}
          onValueChange={(value) => onNameChange(value)}
          placeholder="Your name"
        />
        {errors.name && <FieldError match>{errors.name}</FieldError>}
      </Field>

      <Field invalid={!!errors.email}>
        <FieldLabel>Email</FieldLabel>
        <FieldControl
          type="email"
          value={email}
          onValueChange={(value) => onEmailChange(value)}
          placeholder="you@example.com"
        />
        {errors.email && <FieldError match>{errors.email}</FieldError>}
      </Field>
    </div>
  )
}
