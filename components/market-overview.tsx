import { Card } from "@/components/ui/card"
import { TrendingUp, TrendingDown } from "lucide-react"
import type { MarketMetric } from "@/lib/queries/dashboard"

type MarketOverviewProps = {
  markets: MarketMetric[]
}

export function MarketOverview({ markets }: MarketOverviewProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {markets.length === 0 && (
        <Card className="p-4 bg-card border-border">
          <p className="text-sm text-muted-foreground font-mono">No metrics available yet.</p>
        </Card>
      )}
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
