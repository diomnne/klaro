import type { Metadata } from "next"

import { CommissionForm } from "@/components/commission/commission-form"

export const metadata: Metadata = {
  title: "Commission Request",
  description: "Request a commission and get an instant price estimate.",
}

export default function CommissionPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-2xl font-semibold">Commission Request</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Tell me what you have in mind. I&apos;ll review your request and follow up to confirm.
      </p>
      <div className="mt-8">
        <CommissionForm />
      </div>
    </main>
  )
}
