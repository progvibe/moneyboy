CREATE TABLE "important_tickers" (
	"symbol" text PRIMARY KEY NOT NULL,
	"rank" integer DEFAULT 100 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "important_tickers_rank_idx" ON "important_tickers" USING btree ("rank");
