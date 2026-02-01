import "dotenv/config";
import { ingestFinnhubNews } from "@/ingest/finnhub";

async function main() {
  console.log("Starting Finnhub ingestion...");
  await ingestFinnhubNews({
    categories: ["general", "forex", "crypto", "merger"],
    maxPages: 3,
    minId: 0,
  });
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
