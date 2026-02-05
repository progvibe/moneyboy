import { MarketOverview } from "@/components/market-overview";
import { NewsFeed } from "@/components/news-feed";
import { StockWatchlist } from "@/components/stock-watchlist";
import { EconomicIndicators } from "@/components/economic-indicators";
import { SentimentAnalysis } from "@/components/sentiment-analysis";
import { DashboardHeader } from "@/components/dashboard-header";
import { NewsSummary } from "@/components/news-summary";
import { TopThemesCard } from "@/components/top-themes-card";
import {
  getIndicatorSnapshots,
  getLatestNews,
  getMarketOverview,
  getSentimentBuckets,
  getWatchlistSnapshots,
} from "@/lib/queries/dashboard";
import { getDashboardThemes } from "@/lib/queries/dashboard-themes";
import { generateNewsSummary } from "@/lib/summary";

export default async function Home() {
  const [markets, newsAll, watchlist, indicators, sentiments, themes] = await Promise.all([
    getMarketOverview(),
    getLatestNews(50),
    getWatchlistSnapshots(10),
    getIndicatorSnapshots(),
    getSentimentBuckets(10),
    getDashboardThemes(),
  ]);

  const news = newsAll.slice(0, 20);
  const newsSummary = await generateNewsSummary(newsAll, {
    maxItems: 50,
    snippetMaxChars: 140,
  });

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Market Overview */}
        <MarketOverview markets={markets} />

        <TopThemesCard
          generatedAt={themes.generatedAt}
          windowHours={themes.windowHours}
          themes={themes.themes}
          dailySummary={themes.dailySummary}
        />

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* News Feed - Takes 2 columns on large screens */}
          <div className="lg:col-span-2">
            <NewsFeed items={news} />
          </div>

          {/* Watchlist - Takes 1 column on large screens */}
          <div className="lg:col-span-1 gap-6">
            <NewsSummary summary={newsSummary} />
            <StockWatchlist entries={watchlist} />
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <EconomicIndicators indicators={indicators} />
          <SentimentAnalysis buckets={sentiments} />
        </div>
      </main>
    </div>
  );
}
