ALTER TABLE "tickers" ADD COLUMN IF NOT EXISTS "enabled" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "tickers" ADD COLUMN IF NOT EXISTS "priority" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "tickers" ADD COLUMN IF NOT EXISTS "last_price_ingested_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "tickers" ADD COLUMN IF NOT EXISTS "last_news_ingested_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "tickers" ADD COLUMN IF NOT EXISTS "last_sentiment_at" timestamp with time zone;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tickers_priority_idx" ON "tickers" USING btree ("priority");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ticker_ingestion_state" (
	"symbol" text NOT NULL,
	"source" text NOT NULL,
	"cursor" text,
	"last_success_at" timestamp with time zone,
	"last_error" text,
	CONSTRAINT "ticker_ingestion_state_symbol_source_pk" PRIMARY KEY("symbol","source")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ticker_prices" (
	"symbol" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"price" real NOT NULL,
	"change" real,
	"percent_change" real,
	"priced_at" timestamp with time zone NOT NULL,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ticker_prices_priced_at_idx" ON "ticker_prices" USING btree ("priced_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ticker_sentiments" (
	"symbol" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"score" real NOT NULL,
	"article_count" integer DEFAULT 0 NOT NULL,
	"window_days" integer DEFAULT 21 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ticker_sentiments_label_idx" ON "ticker_sentiments" USING btree ("label");
