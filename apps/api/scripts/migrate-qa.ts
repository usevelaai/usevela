import "dotenv/config";
import { getDb, sql } from "@vela/db";

async function migrate() {
	const db = getDb();

	console.log("Creating qa_sources table...");
	await db.execute(sql`
    CREATE TABLE IF NOT EXISTS qa_sources (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      questions json NOT NULL,
      answer text NOT NULL,
      created_at timestamp DEFAULT now() NOT NULL,
      updated_at timestamp DEFAULT now() NOT NULL
    )
  `);

	console.log("Creating qa_source_chunks table...");
	await db.execute(sql`
    CREATE TABLE IF NOT EXISTS qa_source_chunks (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      qa_source_id uuid NOT NULL REFERENCES qa_sources(id) ON DELETE CASCADE,
      question text NOT NULL,
      content text NOT NULL,
      chunk_index integer NOT NULL,
      embedding vector(1024),
      created_at timestamp DEFAULT now() NOT NULL
    )
  `);

	console.log("Creating index...");
	await db.execute(
		sql`CREATE INDEX IF NOT EXISTS qa_source_embedding_idx ON qa_source_chunks USING hnsw (embedding vector_cosine_ops)`,
	);

	console.log("Done!");
	process.exit(0);
}

migrate().catch((e) => {
	console.error(e);
	process.exit(1);
});
