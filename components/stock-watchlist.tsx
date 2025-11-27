import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { WatchlistEntry } from "@/lib/queries/dashboard"

type StockWatchlistProps = {
  entries: WatchlistEntry[]
}

export function StockWatchlist({ entries }: StockWatchlistProps) {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg font-mono text-foreground flex items-center gap-2">
          <Star className="w-5 h-5 text-(--color-warning)" />
          WATCHLIST
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {entries.length === 0 && (
            <p className="text-sm text-muted-foreground font-mono">No tickers mentioned yet.</p>
          )}
          {entries.map((stock) => {
            const isPositive = (stock.sentiment ?? 0) >= 0
            return (
              <div
                key={stock.ticker}
                className="p-3 rounded-lg bg-secondary/30 border border-border hover:border-primary/50 transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-mono font-bold text-foreground">{stock.ticker}</p>
                      {isPositive ? (
                        <TrendingUp className="w-3 h-3 text-(--color-success)" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-destructive" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {stock.latest ? `Last seen ${stock.latest.toLocaleDateString()}` : "No recent articles"}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="font-mono font-bold text-foreground">{stock.mentions} mentions</p>
                    <p className={`text-xs font-mono ${isPositive ? "text-(--color-success)" : "text-destructive"}`}>
                      {(stock.sentiment ?? 0).toFixed(2)} sentiment
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
          <Button className="w-full mt-4 bg-primary hover:bg-primary/90 text-primary-foreground font-mono" disabled>
            Synced from news
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
