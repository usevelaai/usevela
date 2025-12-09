import { agents, and, documentChunks, documents, eq, getDb } from "@vela/db";
import { Hono } from "hono";
import { chunkText } from "../lib/chunker";
import { createEmbeddings } from "../lib/embeddings";
import { extractText, isSupportedType } from "../lib/extractors";

const upload = new Hono();

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Helper to get userId from context
function getUserId(c: { get: (key: string) => unknown }): string | null {
	const user = c.get("user") as { id: string } | null;
	return user?.id ?? null;
}

// Helper to verify agent belongs to user
async function verifyAgentOwnership(agentId: string, userId: string): Promise<boolean> {
	const db = getDb();
	const [agent] = await db
		.select({ id: agents.id })
		.from(agents)
		.where(and(eq(agents.id, agentId), eq(agents.userId, userId)));
	return !!agent;
}

upload.post("/", async (c) => {
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const formData = await c.req.formData();
	const file = formData.get("file");
	const agentId = formData.get("agentId") as string;

	if (!agentId) {
		return c.json({ error: "agentId required" }, 400);
	}

	if (!(await verifyAgentOwnership(agentId, userId))) {
		return c.json({ error: "agent not found" }, 404);
	}

	if (!file || !(file instanceof File)) {
		return c.json({ error: "file required" }, 400);
	}

	if (file.size > MAX_FILE_SIZE) {
		return c.json({ error: "file too large (max 10MB)" }, 400);
	}

	if (!isSupportedType(file.type)) {
		return c.json({ error: "unsupported file type (PDF, DOCX, TXT only)" }, 400);
	}

	const buffer = Buffer.from(await file.arrayBuffer());
	const text = await extractText(buffer, file.type);

	if (!text.trim()) {
		return c.json({ error: "no text content extracted" }, 400);
	}

	const chunks = chunkText(text);
	const embeddings = await createEmbeddings(chunks);

	const db = getDb();

	const [doc] = await db
		.insert(documents)
		.values({
			agentId,
			filename: file.name,
			mimeType: file.type,
			size: file.size,
		})
		.returning();

	const chunkRecords = chunks.map((content, index) => ({
		documentId: doc.id,
		content,
		chunkIndex: index,
		embedding: embeddings[index],
	}));

	await db.insert(documentChunks).values(chunkRecords);

	return c.json({
		id: doc.id,
		filename: doc.filename,
		chunks: chunks.length,
		createdAt: doc.createdAt,
	});
});

// List documents for an agent
upload.get("/", async (c) => {
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const agentId = c.req.query("agentId");
	if (!agentId) {
		return c.json({ error: "agentId required" }, 400);
	}

	if (!(await verifyAgentOwnership(agentId, userId))) {
		return c.json({ error: "agent not found" }, 404);
	}

	const db = getDb();
	const docs = await db
		.select()
		.from(documents)
		.where(eq(documents.agentId, agentId))
		.orderBy(documents.createdAt);

	return c.json(docs);
});

upload.delete("/:id", async (c) => {
	const id = c.req.param("id");
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const db = getDb();

	// Verify document belongs to user's agent
	const [doc] = await db
		.select({ id: documents.id, agentId: documents.agentId })
		.from(documents)
		.where(eq(documents.id, id));

	if (!doc) {
		return c.json({ error: "document not found" }, 404);
	}

	if (!(await verifyAgentOwnership(doc.agentId, userId))) {
		return c.json({ error: "document not found" }, 404);
	}

	const [_deleted] = await db.delete(documents).where(eq(documents.id, id)).returning();

	return c.json({ deleted: true });
});

export { upload };
