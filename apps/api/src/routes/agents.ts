import {
	agents,
	and,
	count,
	desc,
	eq,
	getDb,
	interfaceSettings,
	ne,
	userSubscriptions,
} from "@vela/db";
import { Hono } from "hono";
import { z } from "zod";
import { getAgentLimit } from "../lib/plans";

const agentsRoute = new Hono();

const SUPPORTED_MODELS = [
	"claude-sonnet-4-20250514",
	"claude-opus-4-20250514",
	"gpt-4o",
	"gpt-4o-mini",
	"gpt-4-turbo",
] as const;

// Generate URL-friendly slug from name
function generateSlug(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 50);
}

const createAgentSchema = z.object({
	name: z.string().min(1, "name required").max(100, "name too long"),
	model: z.string().min(1, "model required"),
	temperature: z.number().min(0).max(100).default(50),
	systemPrompt: z.string().min(1, "system prompt required").default("You are a helpful assistant."),
	isDefault: z.boolean().default(false),
});

const updateAgentSchema = z.object({
	name: z.string().min(1, "name required").max(100, "name too long").optional(),
	model: z.string().min(1, "model required").optional(),
	temperature: z.number().min(0).max(100).optional(),
	systemPrompt: z.string().min(1, "system prompt required").optional(),
	isDefault: z.boolean().optional(),
});

// Helper to get userId from context
function getUserId(c: { get: (key: string) => unknown }): string | null {
	const user = c.get("user") as { id: string } | null;
	return user?.id ?? null;
}

// List all agents for the authenticated user
agentsRoute.get("/", async (c) => {
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const db = getDb();
	const allAgents = await db
		.select()
		.from(agents)
		.where(eq(agents.userId, userId))
		.orderBy(desc(agents.isDefault), desc(agents.createdAt));

	return c.json(allAgents);
});

// Get agent limits for the authenticated user
agentsRoute.get("/limits", async (c) => {
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	// Self-hosted mode has no limits
	if (process.env.SELF_HOSTED === "true") {
		const db = getDb();
		const [agentCount] = await db
			.select({ count: count() })
			.from(agents)
			.where(eq(agents.userId, userId));

		return c.json({
			current: agentCount?.count ?? 0,
			limit: null,
			planId: "self-hosted",
			canCreate: true,
		});
	}

	const db = getDb();

	const [subscription] = await db
		.select()
		.from(userSubscriptions)
		.where(eq(userSubscriptions.userId, userId))
		.limit(1);

	const planId = subscription?.planId ?? "free";
	const limit = getAgentLimit(planId);

	const [agentCount] = await db
		.select({ count: count() })
		.from(agents)
		.where(eq(agents.userId, userId));

	return c.json({
		current: agentCount?.count ?? 0,
		limit,
		planId,
		canCreate: (agentCount?.count ?? 0) < limit,
	});
});

// Get supported models
agentsRoute.get("/models", async (c) => {
	const isSelfHosted = process.env.SELF_HOSTED === "true";
	const models: string[] = [...SUPPORTED_MODELS];

	// Add local models when self-hosted
	if (isSelfHosted && process.env.OPENAI_API_BASE) {
		try {
			// Fetch available models from Ollama-compatible endpoint
			const response = await fetch(`${process.env.OPENAI_API_BASE}/models`);
			if (response.ok) {
				const data = (await response.json()) as { data?: { id: string }[] };
				const localModels = data.data?.map((m) => m.id) || [];
				// Add local models with a prefix to identify them
				models.push(...localModels);
			}
		} catch (err) {
			console.warn("[agents] Failed to fetch local models:", err);
		}
	}

	return c.json(models);
});

// Get single agent by ID (must belong to user)
agentsRoute.get("/:id", async (c) => {
	const id = c.req.param("id");
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const db = getDb();

	const [agent] = await db
		.select()
		.from(agents)
		.where(and(eq(agents.id, id), eq(agents.userId, userId)));

	if (!agent) {
		return c.json({ error: "agent not found" }, 404);
	}

	return c.json(agent);
});

// Get agent by slug (for public chat embeds - no auth required)
agentsRoute.get("/by-slug/:slug", async (c) => {
	const slug = c.req.param("slug");
	const db = getDb();

	const [agent] = await db.select().from(agents).where(eq(agents.slug, slug));

	if (!agent) {
		return c.json({ error: "agent not found" }, 404);
	}

	// Return limited info for public access
	return c.json({
		id: agent.id,
		name: agent.name,
		slug: agent.slug,
	});
});

// Get default agent for user
agentsRoute.get("/default/config", async (c) => {
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const db = getDb();

	const [agent] = await db
		.select()
		.from(agents)
		.where(and(eq(agents.userId, userId), eq(agents.isDefault, true)));

	if (!agent) {
		// Return first agent if no default
		const [firstAgent] = await db.select().from(agents).where(eq(agents.userId, userId)).limit(1);
		if (!firstAgent) {
			return c.json({ error: "no agents configured" }, 404);
		}
		return c.json(firstAgent);
	}

	return c.json(agent);
});

// Create agent
agentsRoute.post("/", async (c) => {
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const rawBody = await c.req.json();
	const parsed = createAgentSchema.safeParse(rawBody);

	if (!parsed.success) {
		return c.json({ error: parsed.error.issues[0].message }, 400);
	}

	const { name, model, temperature, systemPrompt, isDefault } = parsed.data;

	const db = getDb();

	// Check agent limit based on user's plan
	const [subscription] = await db
		.select()
		.from(userSubscriptions)
		.where(eq(userSubscriptions.userId, userId))
		.limit(1);

	const planId = subscription?.planId ?? "free";
	const agentLimit = getAgentLimit(planId);

	const [agentCount] = await db
		.select({ count: count() })
		.from(agents)
		.where(eq(agents.userId, userId));

	if ((agentCount?.count ?? 0) >= agentLimit) {
		return c.json(
			{
				error: `You've reached your limit of ${agentLimit} agent${agentLimit === 1 ? "" : "s"}. Please upgrade your plan to create more agents.`,
				code: "AGENT_LIMIT_REACHED",
				limit: agentLimit,
				current: agentCount?.count ?? 0,
			},
			403,
		);
	}

	// Generate unique slug
	let slug = generateSlug(name);
	let slugSuffix = 0;
	let slugExists = true;

	while (slugExists) {
		const checkSlug = slugSuffix > 0 ? `${slug}-${slugSuffix}` : slug;
		const [existing] = await db
			.select({ id: agents.id })
			.from(agents)
			.where(eq(agents.slug, checkSlug));
		if (!existing) {
			slug = checkSlug;
			slugExists = false;
		} else {
			slugSuffix++;
		}
	}

	// If setting as default, unset other defaults for this user
	if (isDefault) {
		await db.update(agents).set({ isDefault: false }).where(eq(agents.userId, userId));
	}

	const [agent] = await db
		.insert(agents)
		.values({
			userId,
			name,
			slug,
			model,
			temperature,
			systemPrompt,
			isDefault,
		})
		.returning();

	// Create default interface settings for this agent
	await db.insert(interfaceSettings).values({
		agentId: agent.id,
		displayName: name,
	});

	return c.json(agent);
});

// Update agent
agentsRoute.put("/:id", async (c) => {
	const id = c.req.param("id");
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const rawBody = await c.req.json();
	const parsed = updateAgentSchema.safeParse(rawBody);

	if (!parsed.success) {
		return c.json({ error: parsed.error.issues[0].message }, 400);
	}

	const db = getDb();

	const [existing] = await db
		.select()
		.from(agents)
		.where(and(eq(agents.id, id), eq(agents.userId, userId)));

	if (!existing) {
		return c.json({ error: "agent not found" }, 404);
	}

	// If setting as default, unset other defaults for this user
	if (parsed.data.isDefault) {
		await db.update(agents).set({ isDefault: false }).where(eq(agents.userId, userId));
	}

	// If name changed, update slug
	let newSlug = existing.slug;
	if (parsed.data.name && parsed.data.name !== existing.name) {
		const slug = generateSlug(parsed.data.name);
		let slugSuffix = 0;
		let slugExists = true;

		while (slugExists) {
			const checkSlug = slugSuffix > 0 ? `${slug}-${slugSuffix}` : slug;
			const [existingSlug] = await db
				.select({ id: agents.id })
				.from(agents)
				.where(and(eq(agents.slug, checkSlug), ne(agents.id, id)));
			if (!existingSlug) {
				newSlug = checkSlug;
				slugExists = false;
			} else {
				slugSuffix++;
			}
		}
	}

	const [updated] = await db
		.update(agents)
		.set({
			...parsed.data,
			slug: newSlug,
			updatedAt: new Date(),
		})
		.where(eq(agents.id, id))
		.returning();

	return c.json(updated);
});

// Delete agent
agentsRoute.delete("/:id", async (c) => {
	const id = c.req.param("id");
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const db = getDb();

	const [deleted] = await db
		.delete(agents)
		.where(and(eq(agents.id, id), eq(agents.userId, userId)))
		.returning();

	if (!deleted) {
		return c.json({ error: "agent not found" }, 404);
	}

	return c.json({ deleted: true });
});

export { agentsRoute };
