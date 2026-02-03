CREATE TABLE "document_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"documentId" uuid NOT NULL,
	"chunkIndex" integer NOT NULL,
	"text" text NOT NULL,
	"embedding" text NOT NULL,
	"sentiment" real,
	"topicClusterId" uuid,
	"publishedAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"url" text NOT NULL,
	"tickers" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"publishedAt" timestamp with time zone NOT NULL,
	"ingestedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingestion_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"runType" text NOT NULL,
	"status" text NOT NULL,
	"startedAt" timestamp with time zone NOT NULL,
	"completedAt" timestamp with time zone,
	"error" text,
	"metadata" text
);
--> statement-breakpoint
CREATE TABLE "tickers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"symbol" text NOT NULL,
	"exchange" text NOT NULL,
	"name" text,
	"active" boolean DEFAULT true NOT NULL,
	"lastSyncedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_documentId_documents_id_fk" FOREIGN KEY ("documentId") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "document_chunks_document_idx" ON "document_chunks" USING btree ("documentId");--> statement-breakpoint
CREATE INDEX "document_chunks_order_idx" ON "document_chunks" USING btree ("documentId","chunkIndex");--> statement-breakpoint
CREATE INDEX "ingestion_runs_started_at_idx" ON "ingestion_runs" USING btree ("startedAt");--> statement-breakpoint
CREATE UNIQUE INDEX "tickers_symbol_exchange_idx" ON "tickers" USING btree ("symbol","exchange");--> statement-breakpoint
CREATE INDEX "tickers_last_synced_idx" ON "tickers" USING btree ("lastSyncedAt");