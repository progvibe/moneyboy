CREATE TABLE "ingestion_run_progress" (
	"runId" uuid PRIMARY KEY NOT NULL,
	"status" text NOT NULL,
	"stage" text NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"message" text,
	"startedAt" timestamp with time zone NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"completedAt" timestamp with time zone,
	"metadata" text
);
--> statement-breakpoint
ALTER TABLE "ingestion_run_progress" ADD CONSTRAINT "ingestion_run_progress_runId_ingestion_runs_id_fk" FOREIGN KEY ("runId") REFERENCES "public"."ingestion_runs"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "ingestion_run_progress_status_idx" ON "ingestion_run_progress" USING btree ("status");
