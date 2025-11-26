import "dotenv/config";
import { ingestFinnhubNews } from "@/ingest/finnhub";

async function main() {
  console.log("Starting Finnhub ingestion...");
  await ingestFinnhubNews({ category: "general" });
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
