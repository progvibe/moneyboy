import "dotenv/config";
import {
  getTickerBatch,
  ingestFinnhubCompanyNews,
  ingestFinnhubNews,
  markTickersSynced,
} from "@/ingest/finnhub";

async function main() {
  console.log("Starting Finnhub ingestion...");
  await ingestFinnhubNews({
    categories: ["general", "forex", "crypto", "merger"],
    maxPages: 3,
    minId: 0,
  });

  const maxTickers = 500;
  const tickerRows = await getTickerBatch(maxTickers);
  const tickers = tickerRows.map((row) => row.symbol);

  if (tickers.length === 0) {
    console.log("No active tickers found for company-news ingestion.");
    return;
  }

  console.log(`Ingesting ${tickers.length} tickers from DB.`);
  await ingestFinnhubCompanyNews({
    tickers,
    lookbackDays: 7,
    maxPerTicker: 30,
    minDelayMs: 1000,
  });

  await markTickersSynced(tickers, new Date());
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
