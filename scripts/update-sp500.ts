import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const sp500Url =
  process.env.SP500_TICKERS_URL ??
  "https://raw.githubusercontent.com/datasets/s-and-p-500-companies/master/data/constituents.csv";

const outPath =
  process.env.SP500_TICKERS_PATH ??
  resolve(process.cwd(), "ingest/data/sp500.txt");

function parseTickersFromCsv(raw: string) {
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];
  const [header, ...rows] = lines;
  if (!header.toLowerCase().startsWith("symbol,")) return [];
  return rows
    .map((line) => line.split(",")[0]?.trim())
    .filter((symbol) => symbol && symbol.toLowerCase() !== "symbol");
}

async function main() {
  console.log(`Fetching S&P 500 tickers from ${sp500Url}...`);
  const res = await fetch(sp500Url);
  if (!res.ok) {
    throw new Error(`Failed to fetch S&P 500 list: ${res.status} ${res.statusText}`);
  }

  const csv = await res.text();
  const tickers = parseTickersFromCsv(csv);
  if (tickers.length === 0) {
    throw new Error("Unable to parse S&P 500 tickers from CSV source.");
  }

  const outDir = dirname(outPath);
  mkdirSync(outDir, { recursive: true });
  const contents = `${tickers.join("\n")}\n`;
  writeFileSync(outPath, contents, "utf8");
  console.log(`Wrote ${tickers.length} tickers to ${outPath}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
