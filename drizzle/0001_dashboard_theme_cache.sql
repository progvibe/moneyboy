CREATE TABLE "dashboard_theme_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cacheDate" timestamp with time zone NOT NULL,
	"windowHours" integer NOT NULL,
	"themeCount" integer NOT NULL,
	"payload" text NOT NULL,
	"generatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "dashboard_theme_cache_key_idx" ON "dashboard_theme_cache" USING btree ("cacheDate","windowHours","themeCount");
