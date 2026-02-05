import { TrendingUp, TrendingDown, Minus, Star } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TickerQuickLook } from "@/components/ticker-quick-look"
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
            const isPositive = stock.sentimentLabel === "Bullish"
            const isNegative = stock.sentimentLabel === "Bearish"
            const SentimentIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus
            return (
              <div
                key={stock.ticker}
                className="p-3 rounded-lg bg-secondary/30 border border-border hover:border-primary/50 transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <TickerQuickLook ticker={stock.ticker} />
                      <SentimentIcon
                        className={`w-3 h-3 ${
                          isPositive
                            ? "text-(--color-success)"
                            : isNegative
                              ? "text-destructive"
                              : "text-(--color-info)"
                        }`}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {stock.latest ? `Last seen ${stock.latest.toLocaleDateString()}` : "No recent articles"}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="font-mono font-bold text-foreground">{stock.mentions} mentions</p>
                    <p
                      className={`text-xs font-mono ${
                        isPositive
                          ? "text-(--color-success)"
                          : isNegative
                            ? "text-destructive"
                            : "text-(--color-info)"
                      }`}
                    >
                      {stock.sentimentLabel}
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
