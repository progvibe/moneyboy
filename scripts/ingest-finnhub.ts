import "dotenv/config";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ingestFinnhubCompanyNews, ingestFinnhubNews } from "@/ingest/finnhub";

function parseTickerLines(raw: string) {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}

function parseTickersFromCsv(raw: string) {
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];
  const [header, ...rows] = lines;
  if (!header.toLowerCase().startsWith("symbol,")) return [];
  return rows
    .map((line) => line.split(",")[0]?.trim())
    .filter((symbol) => symbol && symbol.toLowerCase() !== "symbol");
}

async function loadSp500Tickers(filePath: string, url: string) {
  if (existsSync(filePath)) {
    const raw = readFileSync(filePath, "utf8");
    const fromFile = parseTickerLines(raw);
    if (fromFile.length > 0) {
      console.log(`Loaded ${fromFile.length} S&P 500 tickers from ${filePath}.`);
      return fromFile;
    }
  }

  console.log(`Fetching S&P 500 tickers from ${url}...`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch S&P 500 list: ${res.status} ${res.statusText}`);
  }
  const raw = await res.text();
  const fromCsv = parseTickersFromCsv(raw);
  if (fromCsv.length === 0) {
    throw new Error("Unable to parse S&P 500 tickers from CSV source.");
  }
  return fromCsv;
}

function loadResumeIndex(filePath: string) {
  if (!existsSync(filePath)) return 0;
  try {
    const raw = readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw) as { nextIndex?: number };
    if (typeof parsed.nextIndex === "number" && parsed.nextIndex >= 0) {
      return parsed.nextIndex;
    }
  } catch (error) {
    console.warn("Unable to read resume file, starting from beginning.", error);
  }
  return 0;
}

function saveResumeIndex(filePath: string, nextIndex: number) {
  const payload = JSON.stringify({ nextIndex }, null, 2);
  writeFileSync(filePath, payload, "utf8");
}

async function main() {
  console.log("Starting Finnhub ingestion...");
  await ingestFinnhubNews({
    categories: ["general", "forex", "crypto", "merger"],
    maxPages: 3,
    minId: 0,
  });
  const sp500Path =
    process.env.SP500_TICKERS_PATH ??
    resolve(process.cwd(), "ingest/data/sp500.txt");
  const sp500Url =
    process.env.SP500_TICKERS_URL ??
    "https://raw.githubusercontent.com/datasets/s-and-p-500-companies/master/data/constituents.csv";
  const sp500Tickers = await loadSp500Tickers(sp500Path, sp500Url);
  const resumePath =
    process.env.SP500_RESUME_PATH ??
    resolve(process.cwd(), "ingest/data/sp500.resume.json");
  const startIndex = loadResumeIndex(resumePath);
  const maxTickers = 500;
  const slicedTickers = sp500Tickers.slice(
    startIndex,
    startIndex + maxTickers,
  );
  const nextIndex =
    startIndex + slicedTickers.length >= sp500Tickers.length
      ? 0
      : startIndex + slicedTickers.length;
  console.log(
    `Ingesting tickers ${startIndex + 1}-${
      startIndex + slicedTickers.length
    } of ${sp500Tickers.length}. Next start index: ${nextIndex}.`,
  );
  await ingestFinnhubCompanyNews({
    tickers: slicedTickers,
    lookbackDays: 7,
    maxPerTicker: 30,
    minDelayMs: 300,
  });
  saveResumeIndex(resumePath, nextIndex);
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
