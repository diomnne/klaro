interface SubmitResultProps {
  message: string
}

export function SubmitResult({ message }: SubmitResultProps) {
  return (
    <div className="rounded-lg border border-input bg-muted/50 p-4 text-sm">
      <p className="font-medium">{message}</p>
    </div>
  )
}
