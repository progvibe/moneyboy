import "dotenv/config";
import { db } from "@/db/client";
import { documentChunks, documents, tickers } from "@/db/schema";
import { eq, inArray, sql } from "drizzle-orm";

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const FINNHUB_MAX_REQUESTS_PER_MINUTE = 55;

if (!FINNHUB_API_KEY) {
  throw new Error("FINNHUB_API_KEY is not set");
}

function chunkText(body: string, maxLen = 800): string[] {
  if (body.length <= maxLen) return [body];

  const chunks: string[] = [];
  let i = 0;
  while (i < body.length) {
    chunks.push(body.slice(i, i + maxLen));
    i += maxLen;
  }

  return chunks;
}

function guessSentiment(headline: string): number {
  const h = headline.toLowerCase();
  if (h.includes("surge") || h.includes("rallies") || h.includes("beats")) {
    return 0.5;
  }
  if (h.includes("slump") || h.includes("falls") || h.includes("misses")) {
    return -0.5;
  }
  return 0;
}

type FinnhubNewsItem = {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  related: string;
  source: string;
  summary: string;
  url: string;
};

type FinnhubCompanyNewsItem = {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  related: string;
  source: string;
  summary: string;
  url: string;
};

type FinnhubSymbol = {
  symbol: string;
  displaySymbol?: string;
  description?: string;
};

type FinnhubIngestOptions = {
  category?: string;
  categories?: string[];
  maxPages?: number;
  minId?: number;
};

type FinnhubCompanyIngestOptions = {
  tickers?: string[];
  exchanges?: string[];
  maxTickers?: number;
  from?: string;
  to?: string;
  lookbackDays?: number;
  maxPerTicker?: number;
  minDelayMs?: number;
};

type InsertCounts = {
  inserted: number;
  skipped: number;
};

function normalizeTickers(related: string | null, fallback?: string) {
  const collected = related && related.trim().length > 0
    ? related.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  if (fallback) {
    const normalized = fallback.trim().toUpperCase();
    if (normalized && !collected.includes(normalized)) {
      collected.unshift(normalized);
    }
  }

  return Array.from(new Set(collected));
}

async function insertNewsItems(items: FinnhubNewsItem[], fallbackTicker?: string) {
  const counts: InsertCounts = { inserted: 0, skipped: 0 };

  for (const item of items) {
    const publishedAt = new Date(item.datetime * 1000);
    const tickers = normalizeTickers(item.related ?? null, fallbackTicker);
    const body = item.summary || item.headline;

    const existing = await db
      .select()
      .from(documents)
      .where(eq(documents.url, item.url))
      .limit(1);

    if (existing.length > 0) {
      counts.skipped += 1;
      continue;
    }

    const [doc] = await db
      .insert(documents)
      .values({
        source: item.source ?? "finnhub",
        title: item.headline,
        body,
        url: item.url,
        tickers,
        publishedAt,
      })
      .returning();

    const chunks = chunkText(body);
    const sentiment = guessSentiment(item.headline);

    for (let i = 0; i < chunks.length; i++) {
      await db.insert(documentChunks).values({
        documentId: doc.id,
        chunkIndex: i,
        text: chunks[i],
        embedding: JSON.stringify(Array(16).fill(0)),
        sentiment,
        topicClusterId: null,
        publishedAt,
      });
    }

    counts.inserted += 1;
  }

  return counts;
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toDateRange(opts?: { from?: string; to?: string; lookbackDays?: number }) {
  const to = opts?.to ?? formatDate(new Date());
  if (opts?.from) {
    return { from: opts.from, to };
  }
  const lookbackDays = Math.max(1, opts?.lookbackDays ?? 7);
  const fromDate = new Date(Date.now() - lookbackDays * 86_400_000);
  return { from: formatDate(fromDate), to };
}

const requestTimestamps: number[] = [];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function rateLimit() {
  const limit = Number.isFinite(FINNHUB_MAX_REQUESTS_PER_MINUTE)
    ? FINNHUB_MAX_REQUESTS_PER_MINUTE
    : 55;
  if (limit <= 0) return;

  const windowMs = 60_000;
  const now = Date.now();
  while (requestTimestamps.length > 0 && now - requestTimestamps[0] >= windowMs) {
    requestTimestamps.shift();
  }

  if (requestTimestamps.length < limit) {
    requestTimestamps.push(now);
    return;
  }

  const waitFor = windowMs - (now - requestTimestamps[0]);
  await sleep(waitFor);
  return rateLimit();
}

async function fetchWithRetry(url: string, options?: RequestInit) {
  const maxRetries = 5;
  let attempt = 0;
  let delayMs = 800;

  while (true) {
    await rateLimit();
    const res = await fetch(url, options);

    if (res.ok) return res;

    if (res.status === 429 || res.status >= 500) {
      attempt += 1;
      if (attempt > maxRetries) {
        return res;
      }
      const retryAfter = res.headers.get("retry-after");
      const retryAfterMs = retryAfter ? Number(retryAfter) * 1000 : 0;
      const backoff = Math.max(delayMs, retryAfterMs);
      await sleep(backoff);
      delayMs = Math.min(delayMs * 2, 15_000);
      continue;
    }

    return res;
  }
}

async function fetchFinnhubNewsPage(category: string, minId: number) {
  const url = `https://finnhub.io/api/v1/news?category=${encodeURIComponent(
    category,
  )}&minId=${minId}&token=${FINNHUB_API_KEY}`;

  const res = await fetchWithRetry(url);
  if (!res.ok) {
    throw new Error(`Finnhub request failed: ${res.status} ${res.statusText}`);
  }

  return (await res.json()) as FinnhubNewsItem[];
}

async function fetchFinnhubCompanyNews(
  ticker: string,
  range: { from: string; to: string },
) {
  const url = `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(
    ticker,
  )}&from=${range.from}&to=${range.to}&token=${FINNHUB_API_KEY}`;

  const res = await fetchWithRetry(url);
  if (!res.ok) {
    throw new Error(`Finnhub request failed: ${res.status} ${res.statusText}`);
  }

  return (await res.json()) as FinnhubCompanyNewsItem[];
}

export async function fetchFinnhubSymbols(exchange: string) {
  const url = `https://finnhub.io/api/v1/stock/symbol?exchange=${encodeURIComponent(
    exchange,
  )}&token=${FINNHUB_API_KEY}`;

  const res = await fetchWithRetry(url);
  if (!res.ok) {
    throw new Error(`Finnhub request failed: ${res.status} ${res.statusText}`);
  }

  return (await res.json()) as FinnhubSymbol[];
}

export async function ingestFinnhubNews(opts?: FinnhubIngestOptions) {
  const categories =
    opts?.categories && opts.categories.length > 0
      ? opts.categories
      : [opts?.category ?? "general"];
  const maxPages = Math.max(1, opts?.maxPages ?? 1);
  const defaultMinId = Math.max(0, opts?.minId ?? 0);

  let insertedCount = 0;
  let skippedCount = 0;

  for (const category of categories) {
    let minId = defaultMinId;

    for (let page = 0; page < maxPages; page++) {
      const data = await fetchFinnhubNewsPage(category, minId);

      console.log(
        `Fetched ${data.length} news items from Finnhub (${category}) page ${
          page + 1
        }/${maxPages} (minId=${minId}).`,
      );

      if (data.length === 0) {
        break;
      }

      let pageMaxId = minId;

      for (const item of data) {
        pageMaxId = Math.max(pageMaxId, item.id);
      }

      const counts = await insertNewsItems(data);
      insertedCount += counts.inserted;
      skippedCount += counts.skipped;

      if (pageMaxId <= minId) {
        break;
      }

      minId = pageMaxId;
    }
  }

  console.log(
    `Ingestion complete. Inserted ${insertedCount}, skipped ${skippedCount} (dedup by URL).`,
  );
}

export async function ingestFinnhubCompanyNews(
  opts?: FinnhubCompanyIngestOptions,
) {
  const range = toDateRange(opts);
  const maxPerTicker = Math.max(1, opts?.maxPerTicker ?? 50);
  const minDelayMs = Math.max(0, opts?.minDelayMs ?? 250);

  let tickers = opts?.tickers ?? [];
  if (tickers.length === 0 && opts?.exchanges?.length) {
    for (const exchange of opts.exchanges) {
      const symbols = await fetchFinnhubSymbols(exchange);
      tickers = tickers.concat(symbols.map((item) => item.symbol));
    }
  }

  tickers = Array.from(
    new Set(
      tickers
        .map((ticker) => ticker.trim().toUpperCase())
        .filter(Boolean),
    ),
  );

  if (opts?.maxTickers && opts.maxTickers > 0) {
    tickers = tickers.slice(0, opts.maxTickers);
  }

  console.log(
    `Starting company-news ingestion for ${tickers.length} tickers (${range.from} to ${range.to}).`,
  );

  let insertedCount = 0;
  let skippedCount = 0;

  for (const ticker of tickers) {
    const items = await fetchFinnhubCompanyNews(ticker, range);
    const sorted = items.sort((a, b) => b.datetime - a.datetime);
    const limited = sorted.slice(0, maxPerTicker);

    console.log(
      `Fetched ${limited.length} company news items for ${ticker} (${range.from} to ${range.to}).`,
    );

    const counts = await insertNewsItems(limited, ticker);
    insertedCount += counts.inserted;
    skippedCount += counts.skipped;

    if (minDelayMs > 0) {
      await sleep(minDelayMs);
    }
  }

  console.log(
    `Company-news ingestion complete. Inserted ${insertedCount}, skipped ${skippedCount} (dedup by URL).`,
  );
}

export async function getTickerBatch(limit: number) {
  const safeLimit = Math.max(1, limit);
  return db
    .select({ symbol: tickers.symbol })
    .from(tickers)
    .where(eq(tickers.active, true))
    .orderBy(
      sql`${tickers.lastSyncedAt} IS NULL DESC`,
      tickers.lastSyncedAt,
      tickers.symbol,
    )
    .limit(safeLimit);
}

export async function markTickersSynced(
  symbols: string[],
  syncedAt = new Date(),
) {
  if (symbols.length === 0) return;
  await db
    .update(tickers)
    .set({ lastSyncedAt: syncedAt })
    .where(inArray(tickers.symbol, symbols));
}
