import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock } from "lucide-react"

const newsItems = [
  {
    id: 1,
    title: "Fed Signals Rate Cuts May Come Sooner Than Expected",
    source: "Bloomberg",
    time: "5m ago",
    category: "Monetary Policy",
    sentiment: "positive",
  },
  {
    id: 2,
    title: "Tech Giants Report Record Q4 Earnings, Beat Estimates",
    source: "Reuters",
    time: "12m ago",
    category: "Earnings",
    sentiment: "positive",
  },
  {
    id: 3,
    title: "Oil Prices Surge on Middle East Tensions",
    source: "WSJ",
    time: "25m ago",
    category: "Commodities",
    sentiment: "negative",
  },
  {
    id: 4,
    title: "China Manufacturing Data Shows Unexpected Growth",
    source: "Financial Times",
    time: "38m ago",
    category: "Global Markets",
    sentiment: "positive",
  },
  {
    id: 5,
    title: "Crypto Regulations Face New Congressional Scrutiny",
    source: "CNBC",
    time: "1h ago",
    category: "Crypto",
    sentiment: "neutral",
  },
]

export function NewsFeed() {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg font-mono text-foreground flex items-center gap-2">
          <div className="w-1 h-6 bg-accent rounded-full" />
          BREAKING NEWS
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {newsItems.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-lg bg-secondary/30 border border-border hover:border-accent/50 transition-colors cursor-pointer group"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-foreground font-medium leading-snug group-hover:text-accent transition-colors text-pretty">
                    {item.title}
                  </h3>
                  <Badge
                    variant="outline"
                    className={`shrink-0 font-mono text-xs ${
                      item.sentiment === "positive"
                        ? "border-(--color-success) text-(--color-success)"
                        : item.sentiment === "negative"
                          ? "border-destructive text-destructive"
                          : "border-(--color-info) text-(--color-info)"
                    }`}
                  >
                    {item.sentiment}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
                  <span>{item.source}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {item.time}
                  </span>
                  <span>•</span>
                  <span className="text-accent">{item.category}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
