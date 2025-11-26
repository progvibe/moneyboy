import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Brain, TrendingUp, TrendingDown, Minus } from "lucide-react"

const sentimentData = [
  { category: "Overall Market", score: 72, label: "Bullish", icon: TrendingUp, color: "success" },
  { category: "Tech Sector", score: 85, label: "Very Bullish", icon: TrendingUp, color: "success" },
  { category: "Energy Sector", score: 45, label: "Bearish", icon: TrendingDown, color: "destructive" },
  { category: "Financial Sector", score: 58, label: "Neutral", icon: Minus, color: "info" },
]

export function SentimentAnalysis() {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg font-mono text-foreground flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          AI SENTIMENT ANALYSIS
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sentimentData.map((item) => {
            const Icon = item.icon
            return (
              <div key={item.category} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon
                      className={`w-4 h-4 ${
                        item.color === "success"
                          ? "text-(--color-success)"
                          : item.color === "destructive"
                            ? "text-destructive"
                            : "text-(--color-info)"
                      }`}
                    />
                    <span className="text-sm text-foreground">{item.category}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-mono ${
                        item.color === "success"
                          ? "text-(--color-success)"
                          : item.color === "destructive"
                            ? "text-destructive"
                            : "text-(--color-info)"
                      }`}
                    >
                      {item.label}
                    </span>
                    <span className="text-sm font-mono text-muted-foreground">{item.score}</span>
                  </div>
                </div>
                <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      item.color === "success"
                        ? "bg-(--color-success)"
                        : item.color === "destructive"
                          ? "bg-destructive"
                          : "bg-(--color-info)"
                    }`}
                    style={{ width: `${item.score}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-6 p-4 rounded-lg bg-primary/10 border border-primary/30">
          <p className="text-xs text-muted-foreground font-mono mb-2">AI INSIGHT</p>
          <p className="text-sm text-foreground leading-relaxed text-pretty">
            Market sentiment remains strong with tech leading gains. Energy sector shows weakness due to geopolitical
            concerns. Overall outlook suggests continued bullish momentum in Q1.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
