import { agents, agentTools, and, desc, eq, getDb } from "@vela/db";
import { Hono } from "hono";
import { z } from "zod";

const toolsRoute = new Hono();

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

const inputSchemaPropertySchema = z.object({
	type: z.string(),
	description: z.string().optional(),
	enum: z.array(z.string()).optional(),
});

const inputSchemaSchema = z.object({
	type: z.literal("object"),
	properties: z.record(z.string(), inputSchemaPropertySchema),
	required: z.array(z.string()).optional(),
});

const createToolSchema = z.object({
	agentId: z.string().uuid("invalid agentId"),
	name: z
		.string()
		.min(1, "name required")
		.max(100, "name too long")
		.regex(/^[a-z_][a-z0-9_]*$/, "name must be lowercase with underscores"),
	description: z.string().min(1, "description required").max(1000, "description too long"),
	inputSchema: inputSchemaSchema,
	executionType: z.enum(["mock", "http"]).default("mock"),
	httpUrl: z.string().url().optional().nullable(),
	httpMethod: z.enum(["GET", "POST", "PUT", "DELETE"]).optional().nullable(),
	httpHeaders: z.record(z.string(), z.string()).optional().nullable(),
	mockResponse: z.string().optional().nullable(),
	isEnabled: z.boolean().default(true),
});

const updateToolSchema = z
	.object({
		name: z
			.string()
			.min(1, "name required")
			.max(100, "name too long")
			.regex(/^[a-z_][a-z0-9_]*$/, "name must be lowercase with underscores")
			.optional(),
		description: z
			.string()
			.min(1, "description required")
			.max(1000, "description too long")
			.optional(),
		inputSchema: inputSchemaSchema.optional(),
		executionType: z.enum(["mock", "http"]).optional(),
		httpUrl: z.string().url().optional().nullable(),
		httpMethod: z.enum(["GET", "POST", "PUT", "DELETE"]).optional().nullable(),
		httpHeaders: z.record(z.string(), z.string()).optional().nullable(),
		mockResponse: z.string().optional().nullable(),
		isEnabled: z.boolean().optional(),
	})
	.refine((data) => Object.keys(data).length > 0, {
		message: "at least one field required",
	});

// List all tools for an agent
toolsRoute.get("/", async (c) => {
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const agentId = c.req.query("agentId");
	if (!agentId) {
		return c.json({ error: "agentId required" }, 400);
	}

	const isOwner = await verifyAgentOwnership(agentId, userId);
	if (!isOwner) {
		return c.json({ error: "Agent not found" }, 404);
	}

	const db = getDb();
	const tools = await db
		.select()
		.from(agentTools)
		.where(eq(agentTools.agentId, agentId))
		.orderBy(desc(agentTools.createdAt));

	return c.json(tools);
});

// Get a single tool
toolsRoute.get("/:id", async (c) => {
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const toolId = c.req.param("id");
	const db = getDb();

	const [tool] = await db.select().from(agentTools).where(eq(agentTools.id, toolId));

	if (!tool) {
		return c.json({ error: "Tool not found" }, 404);
	}

	// Verify ownership via agent
	const isOwner = await verifyAgentOwnership(tool.agentId, userId);
	if (!isOwner) {
		return c.json({ error: "Tool not found" }, 404);
	}

	return c.json(tool);
});

// Create a new tool
toolsRoute.post("/", async (c) => {
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const body = await c.req.json();
	const parsed = createToolSchema.safeParse(body);

	if (!parsed.success) {
		return c.json({ error: parsed.error.issues[0].message }, 400);
	}

	const data = parsed.data;

	// Verify agent ownership
	const isOwner = await verifyAgentOwnership(data.agentId, userId);
	if (!isOwner) {
		return c.json({ error: "Agent not found" }, 404);
	}

	const db = getDb();

	// Check for duplicate name within agent
	const [existing] = await db
		.select({ id: agentTools.id })
		.from(agentTools)
		.where(and(eq(agentTools.agentId, data.agentId), eq(agentTools.name, data.name)));

	if (existing) {
		return c.json({ error: "A tool with this name already exists for this agent" }, 400);
	}

	const [newTool] = await db
		.insert(agentTools)
		.values({
			agentId: data.agentId,
			name: data.name,
			description: data.description,
			inputSchema: data.inputSchema,
			executionType: data.executionType,
			httpUrl: data.httpUrl,
			httpMethod: data.httpMethod,
			httpHeaders: data.httpHeaders,
			mockResponse: data.mockResponse,
			isEnabled: data.isEnabled,
		})
		.returning();

	return c.json(newTool, 201);
});

// Update a tool
toolsRoute.put("/:id", async (c) => {
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const toolId = c.req.param("id");
	const body = await c.req.json();
	const parsed = updateToolSchema.safeParse(body);

	if (!parsed.success) {
		return c.json({ error: parsed.error.issues[0].message }, 400);
	}

	const data = parsed.data;
	const db = getDb();

	// Get existing tool
	const [tool] = await db.select().from(agentTools).where(eq(agentTools.id, toolId));

	if (!tool) {
		return c.json({ error: "Tool not found" }, 404);
	}

	// Verify ownership via agent
	const isOwner = await verifyAgentOwnership(tool.agentId, userId);
	if (!isOwner) {
		return c.json({ error: "Tool not found" }, 404);
	}

	// Check for duplicate name if name is being changed
	if (data.name && data.name !== tool.name) {
		const [existing] = await db
			.select({ id: agentTools.id })
			.from(agentTools)
			.where(and(eq(agentTools.agentId, tool.agentId), eq(agentTools.name, data.name)));

		if (existing) {
			return c.json({ error: "A tool with this name already exists for this agent" }, 400);
		}
	}

	const [updated] = await db
		.update(agentTools)
		.set({
			...data,
			updatedAt: new Date(),
		})
		.where(eq(agentTools.id, toolId))
		.returning();

	return c.json(updated);
});

// Delete a tool
toolsRoute.delete("/:id", async (c) => {
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const toolId = c.req.param("id");
	const db = getDb();

	// Get existing tool
	const [tool] = await db.select().from(agentTools).where(eq(agentTools.id, toolId));

	if (!tool) {
		return c.json({ error: "Tool not found" }, 404);
	}

	// Verify ownership via agent
	const isOwner = await verifyAgentOwnership(tool.agentId, userId);
	if (!isOwner) {
		return c.json({ error: "Tool not found" }, 404);
	}

	await db.delete(agentTools).where(eq(agentTools.id, toolId));

	return c.json({ success: true });
});

export { toolsRoute };
