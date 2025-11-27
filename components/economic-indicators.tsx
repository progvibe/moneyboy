import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3 } from "lucide-react"
import type { IndicatorSnapshot } from "@/lib/queries/dashboard"

type EconomicIndicatorsProps = {
  indicators: IndicatorSnapshot[]
}

export function EconomicIndicators({ indicators }: EconomicIndicatorsProps) {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg font-mono text-foreground flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-(--color-info)" />
          ECONOMIC INDICATORS
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {indicators.length === 0 && (
            <div className="col-span-2 text-sm text-muted-foreground font-mono">No sources yet.</div>
          )}
          {indicators.map((indicator) => (
            <div key={indicator.name} className="p-4 rounded-lg bg-secondary/30 border border-border">
              <p className="text-xs text-muted-foreground mb-2 font-mono uppercase">{indicator.name}</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold font-mono text-foreground">{indicator.value}</p>
                <span
                  className={`text-sm font-mono ${
                    indicator.trend === "up"
                      ? "text-(--color-success)"
                      : indicator.trend === "down"
                        ? "text-destructive"
                        : "text-muted-foreground"
                  }`}
                >
                  {indicator.change}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
