import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3 } from "lucide-react"

const indicators = [
  { name: "Unemployment Rate", value: "3.7%", change: "-0.1%", trend: "down" },
  { name: "Inflation (CPI)", value: "3.2%", change: "-0.3%", trend: "down" },
  { name: "GDP Growth", value: "2.9%", change: "+0.4%", trend: "up" },
  { name: "Fed Funds Rate", value: "5.33%", change: "0%", trend: "neutral" },
]

export function EconomicIndicators() {
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
