import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { ingestionRuns } from "@/db/schema";
import {
  getTickerBatch,
  ingestFinnhubCompanyNews,
  ingestFinnhubNews,
  markTickersSynced,
} from "@/ingest/finnhub";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(req: Request) {
  const secret = req.headers.get("x-moneyboy-secret");
  if (!secret || secret !== process.env.INGEST_SECRET) return unauthorized();

  const startedAt = new Date();
  const [run] = await db
    .insert(ingestionRuns)
    .values({ runType: "manual", status: "running", startedAt })
    .returning();

  try {
    const newsResult = await ingestFinnhubNews({
      categories: ["general", "forex", "crypto", "merger"],
      maxPages: 3,
      minId: 0,
    });

    const tickerRows = await getTickerBatch(500);
    const tickers = tickerRows.map((row) => row.symbol);

    if (tickers.length === 0) {
      await db
        .update(ingestionRuns)
        .set({
          status: "success",
          completedAt: new Date(),
          metadata: JSON.stringify({ newsResult, tickers: 0 }),
        })
        .where(eq(ingestionRuns.id, run.id));
      return NextResponse.json({ ok: true, startedAt, skipped: "no tickers" });
    }

    const companyResult = await ingestFinnhubCompanyNews({
      tickers,
      lookbackDays: 7,
      maxPerTicker: 30,
      minDelayMs: 1000,
    });

    await markTickersSynced(tickers, new Date());

    await db
      .update(ingestionRuns)
      .set({
        status: "success",
        completedAt: new Date(),
        metadata: JSON.stringify({
          newsResult,
          companyResult,
          tickers: tickers.length,
        }),
      })
      .where(eq(ingestionRuns.id, run.id));

    return NextResponse.json({ ok: true, startedAt });
  } catch (err) {
    console.error("Ingest failed:", err);
    await db
      .update(ingestionRuns)
      .set({
        status: "error",
        completedAt: new Date(),
        error: err instanceof Error ? err.message : "Ingest failed",
      })
      .where(eq(ingestionRuns.id, run.id));
    return NextResponse.json(
      { ok: false, error: "Ingest failed" },
      { status: 500 },
    );
  }
}
