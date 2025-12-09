import { agents, and, eq, getDb, securitySettings } from "@vela/db";
import { Hono } from "hono";
import { z } from "zod";

const securitySettingsRoute = new Hono();

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

const updateSettingsSchema = z.object({
	messageLimit: z.number().int().min(1).max(10000).optional(),
	messageLimitWindow: z.number().int().min(1).max(86400).optional(), // max 24 hours
	allowedDomains: z.array(z.string().max(255)).max(100).optional(),
});

// Get settings for an agent
securitySettingsRoute.get("/:agentId", async (c) => {
	const agentId = c.req.param("agentId");
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	if (!(await verifyAgentOwnership(agentId, userId))) {
		return c.json({ error: "agent not found" }, 404);
	}

	const db = getDb();

	const [settings] = await db
		.select()
		.from(securitySettings)
		.where(eq(securitySettings.agentId, agentId));

	if (!settings) {
		// Create default settings if none exist
		const [created] = await db.insert(securitySettings).values({ agentId }).returning();
		return c.json(created);
	}

	return c.json(settings);
});

// Update settings for an agent
securitySettingsRoute.put("/:agentId", async (c) => {
	const agentId = c.req.param("agentId");
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	if (!(await verifyAgentOwnership(agentId, userId))) {
		return c.json({ error: "agent not found" }, 404);
	}

	const rawBody = await c.req.json();
	const parsed = updateSettingsSchema.safeParse(rawBody);

	if (!parsed.success) {
		return c.json({ error: parsed.error.issues[0].message }, 400);
	}

	const db = getDb();

	// Get or create settings
	const [settings] = await db
		.select()
		.from(securitySettings)
		.where(eq(securitySettings.agentId, agentId));

	if (!settings) {
		const [created] = await db
			.insert(securitySettings)
			.values({
				agentId,
				...parsed.data,
			})
			.returning();
		return c.json(created);
	}

	// Update existing
	const [updated] = await db
		.update(securitySettings)
		.set({
			...parsed.data,
			updatedAt: new Date(),
		})
		.where(eq(securitySettings.agentId, agentId))
		.returning();

	return c.json(updated);
});

export { securitySettingsRoute };
