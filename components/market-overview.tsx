import { Card } from "@/components/ui/card"
import { TrendingUp, TrendingDown } from "lucide-react"

const markets = [
  { name: "S&P 500", value: "4,783.45", change: "+1.24%", isPositive: true },
  { name: "DOW", value: "37,545.33", change: "+0.89%", isPositive: true },
  { name: "NASDAQ", value: "15,055.65", change: "+1.67%", isPositive: true },
  { name: "BTC/USD", value: "68,432.10", change: "-2.34%", isPositive: false },
  { name: "ETH/USD", value: "3,845.67", change: "-1.89%", isPositive: false },
]

export function MarketOverview() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {markets.map((market) => (
        <Card key={market.name} className="p-4 bg-card border-border hover:border-primary/50 transition-colors">
          <div className="space-y-2">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{market.name}</p>
            <p className="text-xl font-bold font-mono text-foreground">{market.value}</p>
            <div className="flex items-center gap-1">
              {market.isPositive ? (
                <TrendingUp className="w-4 h-4 text-(--color-success)" />
              ) : (
                <TrendingDown className="w-4 h-4 text-destructive" />
              )}
              <span
                className={`text-sm font-mono ${market.isPositive ? "text-(--color-success)" : "text-destructive"}`}
              >
                {market.change}
              </span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
