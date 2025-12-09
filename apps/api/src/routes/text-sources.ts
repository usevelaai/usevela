import { agents, and, desc, eq, getDb, textSourceChunks, textSources } from "@vela/db";
import { Hono } from "hono";
import { z } from "zod";
import { chunkText } from "../lib/chunker";
import { createEmbeddings } from "../lib/embeddings";

const textSourcesRoute = new Hono();

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

const createTextSourceSchema = z.object({
	agentId: z.string().uuid("invalid agentId"),
	title: z.string().min(1, "title required").max(500, "title too long"),
	content: z.string().min(1, "content required"),
});

const updateTextSourceSchema = z
	.object({
		title: z.string().min(1, "title required").max(500, "title too long").optional(),
		content: z.string().min(1, "content required").optional(),
	})
	.refine((data) => data.title || data.content, {
		message: "title or content required",
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

textSourcesRoute.post("/", async (c) => {
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const rawBody = await c.req.json();
	const parsed = createTextSourceSchema.safeParse(rawBody);

	if (!parsed.success) {
		return c.json({ error: parsed.error.issues[0].message }, 400);
	}

	const { agentId, title, content } = parsed.data;

	if (!(await verifyAgentOwnership(agentId, userId))) {
		return c.json({ error: "agent not found" }, 404);
	}

	const plainText = stripHtml(content);
	if (!plainText) {
		return c.json({ error: "no text content found" }, 400);
	}

	const chunks = chunkText(plainText);
	const embeddings = await createEmbeddings(chunks);

	const db = getDb();

	const [source] = await db
		.insert(textSources)
		.values({
			agentId,
			title: title.trim(),
			content,
		})
		.returning();

	const chunkRecords = chunks.map((content, index) => ({
		textSourceId: source.id,
		content,
		chunkIndex: index,
		embedding: embeddings[index],
	}));

	await db.insert(textSourceChunks).values(chunkRecords);

	return c.json({
		id: source.id,
		title: source.title,
		chunks: chunks.length,
		createdAt: source.createdAt,
	});
});

textSourcesRoute.get("/", async (c) => {
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
			id: textSources.id,
			title: textSources.title,
			createdAt: textSources.createdAt,
			updatedAt: textSources.updatedAt,
		})
		.from(textSources)
		.where(eq(textSources.agentId, agentId))
		.orderBy(desc(textSources.createdAt));

	return c.json(sources);
});

textSourcesRoute.get("/:id", async (c) => {
	const id = c.req.param("id");
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const db = getDb();

	const [source] = await db.select().from(textSources).where(eq(textSources.id, id));

	if (!source) {
		return c.json({ error: "text source not found" }, 404);
	}

	// Verify ownership via agent
	if (!(await verifyAgentOwnership(source.agentId, userId))) {
		return c.json({ error: "text source not found" }, 404);
	}

	return c.json(source);
});

textSourcesRoute.put("/:id", async (c) => {
	const id = c.req.param("id");
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const rawBody = await c.req.json();
	const parsed = updateTextSourceSchema.safeParse(rawBody);

	if (!parsed.success) {
		return c.json({ error: parsed.error.issues[0].message }, 400);
	}

	const { title, content } = parsed.data;

	const db = getDb();

	const [existing] = await db.select().from(textSources).where(eq(textSources.id, id));

	if (!existing) {
		return c.json({ error: "text source not found" }, 404);
	}

	// Verify ownership via agent
	if (!(await verifyAgentOwnership(existing.agentId, userId))) {
		return c.json({ error: "text source not found" }, 404);
	}

	const newTitle = title?.trim() || existing.title;
	const newContent = content ?? existing.content;

	const [updated] = await db
		.update(textSources)
		.set({
			title: newTitle,
			content: newContent,
			updatedAt: new Date(),
		})
		.where(eq(textSources.id, id))
		.returning();

	// Re-chunk and re-embed if content changed
	if (content && content !== existing.content) {
		await db.delete(textSourceChunks).where(eq(textSourceChunks.textSourceId, id));

		const plainText = stripHtml(newContent);
		const chunks = chunkText(plainText);
		const embeddings = await createEmbeddings(chunks);

		const chunkRecords = chunks.map((content, index) => ({
			textSourceId: id,
			content,
			chunkIndex: index,
			embedding: embeddings[index],
		}));

		await db.insert(textSourceChunks).values(chunkRecords);
	}

	return c.json(updated);
});

textSourcesRoute.delete("/:id", async (c) => {
	const id = c.req.param("id");
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const db = getDb();

	const [source] = await db
		.select({ agentId: textSources.agentId })
		.from(textSources)
		.where(eq(textSources.id, id));

	if (!source) {
		return c.json({ error: "text source not found" }, 404);
	}

	// Verify ownership via agent
	if (!(await verifyAgentOwnership(source.agentId, userId))) {
		return c.json({ error: "text source not found" }, 404);
	}

	await db.delete(textSources).where(eq(textSources.id, id));

	return c.json({ deleted: true });
});

export { textSourcesRoute };
