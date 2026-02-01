import "dotenv/config";
import { db } from "@/db/client";
import { documentChunks, documents } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

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

type FinnhubIngestOptions = {
  category?: string;
  categories?: string[];
  maxPages?: number;
  minId?: number;
};

async function fetchFinnhubNewsPage(category: string, minId: number) {
  const url = `https://finnhub.io/api/v1/news?category=${encodeURIComponent(
    category,
  )}&minId=${minId}&token=${FINNHUB_API_KEY}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Finnhub request failed: ${res.status} ${res.statusText}`);
  }

  return (await res.json()) as FinnhubNewsItem[];
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
        const publishedAt = new Date(item.datetime * 1000);
        const tickers =
          item.related && item.related.trim().length > 0
            ? item.related.split(",").map((s) => s.trim())
            : [];

        const body = item.summary || item.headline;

        const existing = await db
          .select()
          .from(documents)
          .where(eq(documents.url, item.url))
          .limit(1);

        if (existing.length > 0) {
          skippedCount++;
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

        insertedCount++;
      }

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
