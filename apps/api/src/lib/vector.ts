import { getDb, sql } from "@vela/db";
import type { VectorSearchResult } from "@vela/types";
import { createQueryEmbedding } from "./embeddings";

export interface VectorClient {
	search(query: string, agentId: string, limit?: number): Promise<VectorSearchResult[]>;
}

export class VectorSearchClient implements VectorClient {
	async search(query: string, agentId: string, limit = 5): Promise<VectorSearchResult[]> {
		const db = getDb();
		const embedding = await createQueryEmbedding(query);

		// Skip vector search if embeddings are unavailable
		if (!embedding || embedding.length === 0) {
			return [];
		}

		const embeddingStr = `[${embedding.join(",")}]`;

		// Search document_chunks, text_source_chunks, qa_source_chunks, and web_source_page_chunks for the specific agent
		const results = await db.execute<{
			id: string;
			content: string;
			score: number;
		}>(sql`
      (SELECT dc.id, dc.content, 1 - (dc.embedding <=> ${embeddingStr}::vector) as score
       FROM document_chunks dc
       JOIN documents d ON dc.document_id = d.id
       WHERE dc.embedding IS NOT NULL AND d.agent_id = ${agentId}::uuid)
      UNION ALL
      (SELECT tsc.id, tsc.content, 1 - (tsc.embedding <=> ${embeddingStr}::vector) as score
       FROM text_source_chunks tsc
       JOIN text_sources ts ON tsc.text_source_id = ts.id
       WHERE tsc.embedding IS NOT NULL AND ts.agent_id = ${agentId}::uuid)
      UNION ALL
      (SELECT qsc.id, qsc.content, 1 - (qsc.embedding <=> ${embeddingStr}::vector) as score
       FROM qa_source_chunks qsc
       JOIN qa_sources qs ON qsc.qa_source_id = qs.id
       WHERE qsc.embedding IS NOT NULL AND qs.agent_id = ${agentId}::uuid)
      UNION ALL
      (SELECT wspc.id, wspc.content, 1 - (wspc.embedding <=> ${embeddingStr}::vector) as score
       FROM web_source_page_chunks wspc
       JOIN web_source_pages wsp ON wspc.web_source_page_id = wsp.id
       JOIN web_sources ws ON wsp.web_source_id = ws.id
       WHERE wspc.embedding IS NOT NULL AND ws.agent_id = ${agentId}::uuid AND wsp.status = 'crawled')
      ORDER BY score DESC
      LIMIT ${limit}
    `);

		return (results as unknown as { id: string; content: string; score: number }[]).map((r) => ({
			id: r.id,
			content: r.content,
			score: Number(r.score),
		}));
	}
}

export const vectorClient = new VectorSearchClient();
