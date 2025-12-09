CREATE TABLE "web_source_page_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"web_source_page_id" uuid NOT NULL,
	"content" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"embedding" vector(1024),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "web_source_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"web_source_id" uuid NOT NULL,
	"url" text NOT NULL,
	"title" text,
	"content" text,
	"content_size" integer DEFAULT 0,
	"status" text DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"last_crawled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "web_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"url" text NOT NULL,
	"source_type" text NOT NULL,
	"name" text,
	"max_pages" integer DEFAULT 100,
	"status" text DEFAULT 'pending' NOT NULL,
	"last_crawled_at" timestamp,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "web_source_page_chunks" ADD CONSTRAINT "web_source_page_chunks_web_source_page_id_web_source_pages_id_fk" FOREIGN KEY ("web_source_page_id") REFERENCES "public"."web_source_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "web_source_pages" ADD CONSTRAINT "web_source_pages_web_source_id_web_sources_id_fk" FOREIGN KEY ("web_source_id") REFERENCES "public"."web_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "web_sources" ADD CONSTRAINT "web_sources_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "web_source_page_chunks_idx" ON "web_source_page_chunks" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "web_source_pages_source_idx" ON "web_source_pages" USING btree ("web_source_id");