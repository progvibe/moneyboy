import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Star } from "lucide-react"
import { Button } from "@/components/ui/button"

const watchlist = [
  { symbol: "AAPL", name: "Apple Inc.", price: "195.83", change: "+2.45%", isPositive: true },
  { symbol: "MSFT", name: "Microsoft", price: "420.55", change: "+1.89%", isPositive: true },
  { symbol: "GOOGL", name: "Alphabet", price: "141.80", change: "+3.21%", isPositive: true },
  { symbol: "TSLA", name: "Tesla", price: "248.42", change: "-1.67%", isPositive: false },
  { symbol: "NVDA", name: "NVIDIA", price: "875.28", change: "+4.12%", isPositive: true },
  { symbol: "META", name: "Meta", price: "474.99", change: "+2.88%", isPositive: true },
]

export function StockWatchlist() {
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
          {watchlist.map((stock) => (
            <div
              key={stock.symbol}
              className="p-3 rounded-lg bg-secondary/30 border border-border hover:border-primary/50 transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-mono font-bold text-foreground">{stock.symbol}</p>
                    {stock.isPositive ? (
                      <TrendingUp className="w-3 h-3 text-(--color-success)" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-destructive" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{stock.name}</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="font-mono font-bold text-foreground">${stock.price}</p>
                  <p
                    className={`text-xs font-mono ${stock.isPositive ? "text-(--color-success)" : "text-destructive"}`}
                  >
                    {stock.change}
                  </p>
                </div>
              </div>
            </div>
          ))}
          <Button className="w-full mt-4 bg-primary hover:bg-primary/90 text-primary-foreground font-mono">
            Add Symbol +
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
