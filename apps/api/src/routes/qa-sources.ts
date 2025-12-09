import { agents, and, desc, eq, getDb, qaSourceChunks, qaSources } from "@vela/db";
import { Hono } from "hono";
import { z } from "zod";
import { createEmbeddings } from "../lib/embeddings";

const qaSourcesRoute = new Hono();

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

const createQaSourceSchema = z.object({
	agentId: z.string().uuid("invalid agentId"),
	questions: z.array(z.string().min(1)).min(1, "At least one question required"),
	answer: z.string().min(1, "Answer required"),
});

const updateQaSourceSchema = z
	.object({
		questions: z.array(z.string().min(1)).min(1).optional(),
		answer: z.string().min(1).optional(),
	})
	.refine((data) => data.questions || data.answer, {
		message: "questions or answer required",
	});

function stripHtml(html: string): string {
	return html
		.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
		.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
		.replace(/<[^>]+>/g, " ")
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/\s+/g, " ")
		.trim();
}

// Create a new Q&A source
qaSourcesRoute.post("/", async (c) => {
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const rawBody = await c.req.json();
	const parsed = createQaSourceSchema.safeParse(rawBody);

	if (!parsed.success) {
		return c.json({ error: parsed.error.issues[0].message }, 400);
	}

	const { agentId, questions, answer } = parsed.data;

	if (!(await verifyAgentOwnership(agentId, userId))) {
		return c.json({ error: "agent not found" }, 404);
	}

	const plainAnswer = stripHtml(answer);

	// Create embedding content for each question (question + answer combined)
	const embeddingTexts = questions.map((q) => `Q: ${q}\nA: ${plainAnswer}`);
	const embeddings = await createEmbeddings(embeddingTexts);

	const db = getDb();

	const [source] = await db.insert(qaSources).values({ agentId, questions, answer }).returning();

	const chunkRecords = questions.map((question, index) => ({
		qaSourceId: source.id,
		question,
		content: embeddingTexts[index],
		chunkIndex: index,
		embedding: embeddings[index],
	}));

	await db.insert(qaSourceChunks).values(chunkRecords);

	return c.json({
		id: source.id,
		questions: source.questions,
		chunks: questions.length,
		createdAt: source.createdAt,
	});
});

// List all Q&A sources for an agent
qaSourcesRoute.get("/", async (c) => {
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
	const sources = await db
		.select({
			id: qaSources.id,
			questions: qaSources.questions,
			createdAt: qaSources.createdAt,
			updatedAt: qaSources.updatedAt,
		})
		.from(qaSources)
		.where(eq(qaSources.agentId, agentId))
		.orderBy(desc(qaSources.updatedAt));

	return c.json(sources);
});

// Get a single Q&A source
qaSourcesRoute.get("/:id", async (c) => {
	const id = c.req.param("id");
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const db = getDb();

	const [source] = await db.select().from(qaSources).where(eq(qaSources.id, id));

	if (!source) {
		return c.json({ error: "Q&A not found" }, 404);
	}

	// Verify ownership via agent
	if (!(await verifyAgentOwnership(source.agentId, userId))) {
		return c.json({ error: "Q&A not found" }, 404);
	}

	return c.json(source);
});

// Update a Q&A source
qaSourcesRoute.put("/:id", async (c) => {
	const id = c.req.param("id");
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const rawBody = await c.req.json();
	const parsed = updateQaSourceSchema.safeParse(rawBody);

	if (!parsed.success) {
		return c.json({ error: parsed.error.issues[0].message }, 400);
	}

	const db = getDb();

	const [existing] = await db.select().from(qaSources).where(eq(qaSources.id, id));

	if (!existing) {
		return c.json({ error: "Q&A not found" }, 404);
	}

	// Verify ownership via agent
	if (!(await verifyAgentOwnership(existing.agentId, userId))) {
		return c.json({ error: "Q&A not found" }, 404);
	}

	const newQuestions = parsed.data.questions ?? existing.questions;
	const newAnswer = parsed.data.answer ?? existing.answer;

	// Delete old chunks and recreate
	await db.delete(qaSourceChunks).where(eq(qaSourceChunks.qaSourceId, id));

	const plainAnswer = stripHtml(newAnswer);
	const embeddingTexts = (newQuestions as string[]).map(
		(q: string) => `Q: ${q}\nA: ${plainAnswer}`,
	);
	const embeddings = await createEmbeddings(embeddingTexts);

	const chunkRecords = (newQuestions as string[]).map((question: string, index: number) => ({
		qaSourceId: id,
		question,
		content: embeddingTexts[index],
		chunkIndex: index,
		embedding: embeddings[index],
	}));

	await db.insert(qaSourceChunks).values(chunkRecords);

	const [updated] = await db
		.update(qaSources)
		.set({
			questions: newQuestions,
			answer: newAnswer,
			updatedAt: new Date(),
		})
		.where(eq(qaSources.id, id))
		.returning();

	return c.json(updated);
});

// Delete a Q&A source
qaSourcesRoute.delete("/:id", async (c) => {
	const id = c.req.param("id");
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const db = getDb();

	const [source] = await db
		.select({ agentId: qaSources.agentId })
		.from(qaSources)
		.where(eq(qaSources.id, id));

	if (!source) {
		return c.json({ error: "Q&A not found" }, 404);
	}

	// Verify ownership via agent
	if (!(await verifyAgentOwnership(source.agentId, userId))) {
		return c.json({ error: "Q&A not found" }, 404);
	}

	await db.delete(qaSources).where(eq(qaSources.id, id));

	return c.json({ success: true });
});

export { qaSourcesRoute };
