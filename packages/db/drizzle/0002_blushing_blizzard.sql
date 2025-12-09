CREATE TABLE "qa_source_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"qa_source_id" uuid NOT NULL,
	"question" text NOT NULL,
	"content" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"embedding" vector(1024),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qa_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"questions" json NOT NULL,
	"answer" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "qa_source_chunks" ADD CONSTRAINT "qa_source_chunks_qa_source_id_qa_sources_id_fk" FOREIGN KEY ("qa_source_id") REFERENCES "public"."qa_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "qa_source_embedding_idx" ON "qa_source_chunks" USING hnsw ("embedding" vector_cosine_ops);