import { NextResponse } from "next/server";
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

  try {
    await ingestFinnhubNews({
      categories: ["general", "forex", "crypto", "merger"],
      maxPages: 3,
      minId: 0,
    });

    const tickerRows = await getTickerBatch(500);
    const tickers = tickerRows.map((row) => row.symbol);

    if (tickers.length === 0) {
      return NextResponse.json({ ok: true, startedAt, skipped: "no tickers" });
    }

    await ingestFinnhubCompanyNews({
      tickers,
      lookbackDays: 7,
      maxPerTicker: 30,
      minDelayMs: 1000,
    });

    await markTickersSynced(tickers, new Date());

    return NextResponse.json({ ok: true, startedAt });
  } catch (err) {
    console.error("Ingest failed:", err);
    return NextResponse.json(
      { ok: false, error: "Ingest failed" },
      { status: 500 },
    );
  }
}
