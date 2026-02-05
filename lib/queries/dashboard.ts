import { db } from "@/db/client";
import { documentChunks, documents } from "@/db/schema";
import { sql } from "drizzle-orm";

export type MarketMetric = {
  name: string;
  value: string;
  change: string;
  isPositive: boolean;
};

export type NewsItem = {
  id: string;
  title: string;
  source: string;
  url: string;
  timeLabel: string;
  tickers: string[];
  sentiment: "positive" | "negative" | "neutral";
  summary: string;
  score?: number;
};

export type WatchlistEntry = {
  ticker: string;
  mentions: number;
  latest: Date | null;
  sentiment: number | null;
  sentimentLabel: "Bullish" | "Bearish" | "Neutral";
};

export type IndicatorSnapshot = {
  name: string;
  value: string;
  change: string;
  trend: "up" | "down" | "neutral";
};

export type SentimentBucket = {
  category: string;
  label: string;
  strength: number;
  mentions?: number;
  color: "success" | "destructive" | "info";
};

function getExecuteRows<T>(result: { rows?: T[] } | T[]): T[] {
  if (Array.isArray(result)) return result;
  if ("rows" in result && Array.isArray(result.rows)) return result.rows;
  return [];
}

function formatChange(
  current: number,
  previous: number,
): { label: string; positive: boolean } {
  if (previous === 0) {
    const positive = current > 0;
    return { label: positive ? "+100%" : "0%", positive };
  }

  const diff = ((current - previous) / previous) * 100;
  const label = `${diff >= 0 ? "+" : ""}${diff.toFixed(1)}%`;
  return { label, positive: diff >= 0 };
}

function getSentimentLabel(
  score: number | null,
): "positive" | "negative" | "neutral" {
  if (score === null) return "neutral";
  if (score > 0.1) return "positive";
  if (score < -0.1) return "negative";
  return "neutral";
}

function bucketLabel(score: number): {
  label: string;
  color: "success" | "destructive" | "info";
} {
  if (score > 0.25) return { label: "Bullish", color: "success" };
  if (score < -0.25) return { label: "Bearish", color: "destructive" };
  return { label: "Neutral", color: "info" };
}

function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();

  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export async function getMarketOverview(): Promise<MarketMetric[]> {
  const result = await db.execute<{
    documentsCount: number;
    chunkCount: number;
    sourcesCount: number;
    tickerCount: number;
    todayCount: number;
    prevDayCount: number;
    avgSentiment: number | null;
  }>(sql`
    select
      (select count(*)::int from documents) as "documentsCount",
      (select count(*)::int from document_chunks) as "chunkCount",
      (select count(distinct source)::int from documents) as "sourcesCount",
      (select count(distinct ticker)::int from (select unnest(tickers) as ticker from documents) as t) as "tickerCount",
      (select count(*)::int from documents where "publishedAt" > now() - interval '1 day') as "todayCount",
      (select count(*)::int from documents where "publishedAt" > now() - interval '2 days' and "publishedAt" <= now() - interval '1 day') as "prevDayCount",
      (select avg(sentiment)::float from document_chunks) as "avgSentiment"
  `);

  const rows = getExecuteRows(result);

  const stats = rows[0] ?? {
    documentsCount: 0,
    chunkCount: 0,
    sourcesCount: 0,
    tickerCount: 0,
    todayCount: 0,
    prevDayCount: 0,
    avgSentiment: 0,
  };
  const { label: docChange, positive: docPositive } = formatChange(
    stats.todayCount,
    stats.prevDayCount,
  );
  const sentimentLabel =
    stats.avgSentiment !== null
      ? `${(stats.avgSentiment * 100).toFixed(1)}%`
      : "n/a";

  return [
    {
      name: "Docs Today",
      value: stats.todayCount.toLocaleString(),
      change: docChange,
      isPositive: docPositive,
    },
    {
      name: "Sources",
      value: stats.sourcesCount.toLocaleString(),
      change: "Live",
      isPositive: true,
    },
    {
      name: "Tracked Tickers",
      value: stats.tickerCount.toLocaleString(),
      change: "Live",
      isPositive: true,
    },
    {
      name: "Chunks",
      value: stats.chunkCount.toLocaleString(),
      change: "Indexed",
      isPositive: true,
    },
    {
      name: "Avg Sentiment",
      value: sentimentLabel,
      change: "Updated",
      isPositive: stats.avgSentiment !== null ? stats.avgSentiment >= 0 : true,
    },
  ];
}

export async function getLatestNews(limit = 3): Promise<NewsItem[]> {
  const priorityResult = await db.execute<{
    id: string;
    title: string;
    source: string;
    url: string;
    publishedAt: Date;
    tickers: string[];
    summary: string;
    sentiment: number | null;
    priorityRank: number | null;
  }>(sql`
    select
      d.id,
      d.title,
      d.source,
      d.url,
      d."publishedAt",
      d.tickers,
      left(d.body, 220) as summary,
      avg(dc.sentiment)::float as sentiment,
      pr.rank as "priorityRank"
    from documents d
    left join document_chunks dc on dc."documentId" = d.id
    join lateral (
      select min(it.rank) as rank
      from unnest(d.tickers) as t(symbol)
      join important_tickers it on upper(it.symbol) = upper(trim(t.symbol))
    ) pr on true
    group by d.id, pr.rank
    order by pr.rank asc, d."publishedAt" desc
    limit ${limit}
  `);

  const priorityRows = getExecuteRows(priorityResult);
  const remaining = Math.max(limit - priorityRows.length, 0);

  if (remaining === 0) {
    return priorityRows.map((row) => ({
      id: row.id,
      title: row.title,
      source: row.source,
      url: row.url,
      timeLabel: formatRelativeTime(new Date(row.publishedAt)),
      tickers: row.tickers ?? [],
      sentiment: getSentimentLabel(row.sentiment),
      summary: row.summary,
    }));
  }

  const fallbackResult = await db.execute<{
    id: string;
    title: string;
    source: string;
    url: string;
    publishedAt: Date;
    tickers: string[];
    summary: string;
    sentiment: number | null;
  }>(sql`
    select
      d.id,
      d.title,
      d.source,
      d.url,
      d."publishedAt",
      d.tickers,
      left(d.body, 220) as summary,
      avg(dc.sentiment)::float as sentiment
    from documents d
    left join document_chunks dc on dc."documentId" = d.id
    where not exists (
      select 1
      from unnest(d.tickers) as t(symbol)
      join important_tickers it on upper(it.symbol) = upper(trim(t.symbol))
    )
    group by d.id
    order by d."publishedAt" desc
    limit ${remaining}
  `);

  const fallbackRows = getExecuteRows(fallbackResult);

  return [...priorityRows, ...fallbackRows].map((row) => ({
    id: row.id,
    title: row.title,
    source: row.source,
    url: row.url,
    timeLabel: formatRelativeTime(new Date(row.publishedAt)),
    tickers: row.tickers ?? [],
    sentiment: getSentimentLabel(row.sentiment),
    summary: row.summary,
  }));
}

export async function getWatchlistSnapshots(
  limit = 10,
): Promise<WatchlistEntry[]> {
  const result = await db.execute<{
    ticker: string;
    mentions: number;
    latest: Date | null;
    avgSentiment: number | null;
  }>(sql`
    select
      t.ticker as ticker,
      count(*)::int as mentions,
      max(d."publishedAt") as latest,
      avg(dc.sentiment)::float as "avgSentiment"
    from documents d
    left join document_chunks dc on dc."documentId" = d.id
    cross join lateral unnest(d.tickers) as t(ticker)
    where d."publishedAt" >= now() - interval '3 days'
    group by t.ticker
    order by count(*) desc, max(d."publishedAt") desc nulls last
    limit ${limit}
  `);

  const rows = getExecuteRows(result);

  return rows.map((row) => ({
    ticker: row.ticker,
    mentions: row.mentions,
    latest: row.latest ? new Date(row.latest) : null,
    sentiment: row.avgSentiment,
    sentimentLabel: bucketLabel(row.avgSentiment ?? 0).label,
  }));
}

export async function getIndicatorSnapshots(
  limit = 4,
): Promise<IndicatorSnapshot[]> {
  const result = await db.execute<{
    source: string;
    articles: number;
    latest: Date | null;
    prev: number;
  }>(sql`
    with source_counts as (
      select
        source,
        count(*)::int as articles,
        max("publishedAt") as latest,
        count(*) filter (where "publishedAt" between now() - interval '2 days' and now() - interval '1 day')::int as prev
      from documents
      group by source
    )
    select * from source_counts
    order by articles desc
    limit ${limit}
  `);

  const rows = getExecuteRows(result);

  return rows.map((row) => {
    const { label, positive } = formatChange(row.articles, row.prev);
    return {
      name: row.source,
      value: `${row.articles} articles`,
      change: label,
      trend: positive ? "up" : "down",
    };
  });
}

export async function getSentimentBuckets(
  limit = 10,
): Promise<SentimentBucket[]> {
  const overall = await db.execute<{
    score: number | null;
  }>(sql`
    select avg(dc.sentiment)::float as score
    from document_chunks dc
    join documents d on d.id = dc."documentId"
    where d."publishedAt" >= now() - interval '3 days'
  `);

  const result = await db.execute<{
    ticker: string;
    score: number | null;
    mentions: number;
  }>(sql`
    select
      t.ticker,
      avg(dc.sentiment)::float as score,
      count(*)::int as mentions
    from documents d
    join document_chunks dc on dc."documentId" = d.id
    cross join lateral unnest(d.tickers) as t(ticker)
    where d."publishedAt" >= now() - interval '3 days'
    group by t.ticker
    order by count(*) desc
    limit ${limit}
  `);

  const rows = getExecuteRows(result);

  const buckets: SentimentBucket[] = [];

  const overallScore = getExecuteRows(overall)[0]?.score ?? 0;
  const overallLabel = bucketLabel(overallScore);
  buckets.push({
    category: "Overall Market",
    strength: Math.min(100, Math.round(Math.abs(overallScore ?? 0) * 100)),
    label: overallLabel.label,
    color: overallLabel.color,
  });

  rows.forEach((row) => {
    const score = row.score ?? 0;
    const { label, color } = bucketLabel(score);
    buckets.push({
      category: row.ticker,
      strength: Math.min(100, Math.round(Math.abs(score) * 100)),
      mentions: row.mentions,
      label,
      color,
    });
  });

  return buckets;
}
