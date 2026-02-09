import os
import sys
from datetime import datetime, timezone, timedelta
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse

import requests
from dotenv import load_dotenv, find_dotenv
import psycopg

TIINGO_URL = "https://api.tiingo.com/tiingo/news"


def log(message: str) -> None:
  print(message, flush=True)


def parse_int(value: str | None, default: int) -> int:
  if value is None:
    return default
  try:
    return int(value)
  except ValueError:
    return default


def parse_iso_datetime(value: str | None) -> datetime | None:
  if not value:
    return None
  if value.endswith("Z"):
    value = value[:-1] + "+00:00"
  try:
    dt = datetime.fromisoformat(value)
  except ValueError:
    return None
  if dt.tzinfo is None:
    dt = dt.replace(tzinfo=timezone.utc)
  return dt.astimezone(timezone.utc)


def normalize_tickers(raw) -> list[str]:
  if raw is None:
    return []
  if isinstance(raw, str):
    items = [raw]
  elif isinstance(raw, list):
    items = raw
  else:
    return []

  cleaned = []
  for item in items:
    if not item:
      continue
    symbol = str(item).strip().upper()
    if symbol and symbol not in cleaned:
      cleaned.append(symbol)
  return cleaned


def ensure_sslmode(url: str) -> str:
  parsed = urlparse(url)
  query = parse_qs(parsed.query, keep_blank_values=True)
  if "sslmode" in query:
    return url
  query["sslmode"] = ["require"]
  new_query = urlencode(query, doseq=True)
  return urlunparse(parsed._replace(query=new_query))


def fetch_tiingo_news(token: str) -> list[dict]:
  headers = {"Authorization": f"Token {token}"}
  res = requests.get(TIINGO_URL, headers=headers, timeout=30)
  if res.status_code != 200:
    raise RuntimeError(f"Tiingo request failed: {res.status_code} {res.text}")
  data = res.json()
  if not isinstance(data, list):
    raise RuntimeError("Unexpected Tiingo response format")
  return data


def main() -> int:
  load_dotenv(find_dotenv())

  token = os.getenv("TIINGO_API_TOKEN")
  db_url = os.getenv("DATABASE_URL")
  run_type = os.getenv("RUN_TYPE", "news:tiingo")
  lookback_minutes = parse_int(os.getenv("LOOKBACK_MINUTES"), 180)
  max_items = parse_int(os.getenv("MAX_ITEMS"), 500)

  if not token:
    raise RuntimeError("TIINGO_API_TOKEN is not set")
  if not db_url:
    raise RuntimeError("DATABASE_URL is not set")

  now = datetime.now(timezone.utc)
  cutoff = now - timedelta(minutes=max(1, lookback_minutes))
  db_url = ensure_sslmode(db_url)

  with psycopg.connect(db_url) as conn:
    with conn.cursor() as cur:
      cur.execute(
        """
        insert into ingestion_runs ("runType", "status", "startedAt")
        values (%s, %s, %s)
        returning id
        """,
        (run_type, "running", now),
      )
      run_id = cur.fetchone()[0]

      cur.execute(
        """
        insert into ingestion_run_progress
          ("runId", "status", "stage", "progress", "message", "startedAt")
        values (%s, %s, %s, %s, %s, %s)
        """,
        (run_id, "running", "fetch", 0, None, now),
      )
      conn.commit()

      def update_progress(stage: str, progress: int, status: str = "running"):
        cur.execute(
          """
          update ingestion_run_progress
          set "stage" = %s,
              "status" = %s,
              "progress" = %s,
              "updatedAt" = %s
          where "runId" = %s
          """,
          (stage, status, progress, datetime.now(timezone.utc), run_id),
        )
        conn.commit()

      try:
        log("Fetching Tiingo news...")
        items = fetch_tiingo_news(token)
        update_progress("normalize", 25)

        normalized = []
        for item in items:
          published = parse_iso_datetime(
            item.get("publishedAt") or item.get("publishedDate")
          )
          if not published:
            continue
          if published < cutoff:
            continue

          normalized.append(
            {
              "source": "tiingo",
              "title": item.get("title") or "",
              "body": item.get("description") or item.get("summary") or "",
              "url": item.get("url") or "",
              "tickers": normalize_tickers(item.get("tickers")),
              "publishedAt": published,
            }
          )

        normalized = [item for item in normalized if item["url"] and item["title"]]
        if max_items > 0:
          normalized = normalized[:max_items]

        log(f"Normalized {len(normalized)} items after filtering.")
        update_progress("upsert_documents", 75)

        inserted = 0
        skipped = 0
        if normalized:
          insert_sql = (
            """
            insert into documents
              (source, title, body, url, tickers, "publishedAt")
            values (%s, %s, %s, %s, %s, %s)
            on conflict (source, url) do nothing
            """
          )
          for item in normalized:
            cur.execute(
              insert_sql,
              (
                item["source"],
                item["title"],
                item["body"],
                item["url"],
                item["tickers"],
                item["publishedAt"],
              ),
            )
            if cur.rowcount == 1:
              inserted += 1
            else:
              skipped += 1

        update_progress("complete", 100, "success")
        cur.execute(
          """
          update ingestion_runs
          set "status" = %s,
              "completedAt" = %s,
              "error" = null
          where id = %s
          """,
          ("success", datetime.now(timezone.utc), run_id),
        )
        cur.execute(
          """
          update ingestion_run_progress
          set "completedAt" = %s,
              "updatedAt" = %s
          where "runId" = %s
          """,
          (datetime.now(timezone.utc), datetime.now(timezone.utc), run_id),
        )
        conn.commit()

        log(f"Ingestion complete. Inserted {inserted}, skipped {skipped}.")
        return 0
      except Exception as exc:
        conn.rollback()
        error_message = str(exc)
        log(f"Error during ingestion: {error_message}")

        cur.execute(
          """
          update ingestion_runs
          set "status" = %s,
              "completedAt" = %s,
              "error" = %s
          where id = %s
          """,
          ("error", datetime.now(timezone.utc), error_message, run_id),
        )
        cur.execute(
          """
          update ingestion_run_progress
          set "status" = %s,
              "completedAt" = %s,
              "updatedAt" = %s
          where "runId" = %s
          """,
          ("error", datetime.now(timezone.utc), datetime.now(timezone.utc), run_id),
        )
        conn.commit()
        return 1


if __name__ == "__main__":
  try:
    sys.exit(main())
  except Exception as exc:
    log(str(exc))
    sys.exit(1)
