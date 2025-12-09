import { agents, and, chatMessages, conversations, desc, eq, getDb } from "@vela/db";
import { Hono } from "hono";

const conversationsRoute = new Hono();

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

// List all conversations for an agent
conversationsRoute.get("/", async (c) => {
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
	const convos = await db
		.select({
			id: conversations.id,
			agentId: conversations.agentId,
			userId: conversations.userId,
			title: conversations.title,
			createdAt: conversations.createdAt,
			updatedAt: conversations.updatedAt,
		})
		.from(conversations)
		.where(eq(conversations.agentId, agentId))
		.orderBy(desc(conversations.updatedAt));

	return c.json(convos);
});

// Get single conversation with messages
conversationsRoute.get("/:id", async (c) => {
	const id = c.req.param("id");
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const db = getDb();

	const [convo] = await db.select().from(conversations).where(eq(conversations.id, id));

	if (!convo) {
		return c.json({ error: "conversation not found" }, 404);
	}

	// Verify ownership via agent
	if (!(await verifyAgentOwnership(convo.agentId, userId))) {
		return c.json({ error: "conversation not found" }, 404);
	}

	const messages = await db
		.select()
		.from(chatMessages)
		.where(eq(chatMessages.conversationId, id))
		.orderBy(chatMessages.createdAt);

	return c.json({ ...convo, messages });
});

// Delete conversation
conversationsRoute.delete("/:id", async (c) => {
	const id = c.req.param("id");
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const db = getDb();

	const [convo] = await db
		.select({ agentId: conversations.agentId })
		.from(conversations)
		.where(eq(conversations.id, id));

	if (!convo) {
		return c.json({ error: "conversation not found" }, 404);
	}

	// Verify ownership via agent
	if (!(await verifyAgentOwnership(convo.agentId, userId))) {
		return c.json({ error: "conversation not found" }, 404);
	}

	await db.delete(conversations).where(eq(conversations.id, id));

	return c.json({ deleted: true });
});

export { conversationsRoute };
