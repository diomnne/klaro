import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency, formatCurrencyRange } from "@/lib/pricing"
import type { PriceRange } from "@/lib/pricing"

interface PricePreviewPanelProps {
  commissionType: "portrait" | "custom"
  total: number | PriceRange
  downpayment: number | PriceRange
  currencyCode?: string
}

export function PricePreviewPanel({
  commissionType,
  total,
  downpayment,
  currencyCode = "PHP",
}: PricePreviewPanelProps) {
  const isRange = typeof total === "object"

  return (
    <Card>
      <CardHeader>
        <CardTitle>Price Estimate</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          Estimated Total:{" "}
          <span className="font-medium text-foreground">
            {isRange
              ? formatCurrencyRange(total as PriceRange, currencyCode)
              : formatCurrency(total as number, currencyCode)}
          </span>
        </p>
        <p className="text-sm text-muted-foreground">
          Downpayment (50%):{" "}
          <span className="font-medium text-foreground">
            {isRange
              ? formatCurrencyRange(downpayment as PriceRange, currencyCode)
              : formatCurrency(downpayment as number, currencyCode)}
          </span>
        </p>
        {commissionType === "custom" && (
          <p className="text-sm text-muted-foreground">
            This is an estimate. Final price is confirmed after the artist reviews your request.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
