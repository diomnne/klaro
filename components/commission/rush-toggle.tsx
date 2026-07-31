import { Field, FieldLabel } from "@/components/ui/field"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

interface RushToggleProps {
  isRush: boolean
  onIsRushChange: (isRush: boolean) => void
  rushNote: string
  onRushNoteChange: (note: string) => void
}

export function RushToggle({
  isRush,
  onIsRushChange,
  rushNote,
  onRushNoteChange,
}: RushToggleProps) {
  return (
    <div className="flex flex-col gap-3">
      <Field className="flex-row items-center gap-2">
        <Switch checked={isRush} onCheckedChange={onIsRushChange} />
        <FieldLabel className="mb-0">I need this rushed</FieldLabel>
      </Field>
      {isRush && (
        <Field>
          <FieldLabel>Rush note (optional)</FieldLabel>
          <Textarea
            placeholder="Let me know your deadline or any context for the rush."
            value={rushNote}
            onChange={(event) => onRushNoteChange(event.target.value)}
          />
        </Field>
      )}
    </div>
  )
}
