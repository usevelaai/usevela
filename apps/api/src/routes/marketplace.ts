import { agents, agentTools, and, eq, getDb, toolTemplates } from "@vela/db";
import { Hono } from "hono";

const marketplace = new Hono();

// GET /marketplace/tools - Public endpoint to list all available tool templates
marketplace.get("/tools", async (c) => {
	const db = getDb();

	const tools = await db
		.select({
			id: toolTemplates.id,
			slug: toolTemplates.slug,
			name: toolTemplates.name,
			description: toolTemplates.description,
			longDescription: toolTemplates.longDescription,
			category: toolTemplates.category,
			icon: toolTemplates.icon,
			isFree: toolTemplates.isFree,
			requiredConfig: toolTemplates.requiredConfig,
		})
		.from(toolTemplates)
		.where(eq(toolTemplates.isActive, true))
		.orderBy(toolTemplates.category, toolTemplates.name);

	return c.json(tools);
});

// GET /marketplace/tools/:slug - Get a single tool template by slug
marketplace.get("/tools/:slug", async (c) => {
	const slug = c.req.param("slug");
	const db = getDb();

	const [tool] = await db
		.select()
		.from(toolTemplates)
		.where(and(eq(toolTemplates.slug, slug), eq(toolTemplates.isActive, true)))
		.limit(1);

	if (!tool) {
		return c.json({ error: "Tool not found" }, 404);
	}

	return c.json(tool);
});

// POST /marketplace/tools/:slug/install - Install a tool template to an agent (authenticated)
marketplace.post("/tools/:slug/install", async (c) => {
	// @ts-expect-error - user is set by auth middleware
	const user = c.get("user") as { id: string } | null;
	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const slug = c.req.param("slug");
	const body = await c.req.json<{
		agentId: string;
		config?: Record<string, string>;
	}>();

	if (!body.agentId) {
		return c.json({ error: "agentId is required" }, 400);
	}

	const db = getDb();

	// Verify agent ownership
	const [agent] = await db
		.select()
		.from(agents)
		.where(and(eq(agents.id, body.agentId), eq(agents.userId, user.id)))
		.limit(1);

	if (!agent) {
		return c.json({ error: "Agent not found" }, 404);
	}

	// Get the tool template
	const [template] = await db
		.select()
		.from(toolTemplates)
		.where(and(eq(toolTemplates.slug, slug), eq(toolTemplates.isActive, true)))
		.limit(1);

	if (!template) {
		return c.json({ error: "Tool template not found" }, 404);
	}

	// Check if tool is already installed for this agent
	const [existing] = await db
		.select()
		.from(agentTools)
		.where(and(eq(agentTools.agentId, body.agentId), eq(agentTools.name, template.toolName)))
		.limit(1);

	if (existing) {
		return c.json({ error: "Tool already installed for this agent" }, 409);
	}

	// Substitute config values into URL and headers
	let httpUrl = template.httpUrl;
	let httpHeaders = template.httpHeaders || {};

	if (body.config) {
		for (const [key, value] of Object.entries(body.config)) {
			const placeholder = new RegExp(`\\$\\{${key}\\}`, "g");
			if (httpUrl) {
				httpUrl = httpUrl.replace(placeholder, value);
			}
			// Replace in headers
			httpHeaders = Object.fromEntries(
				Object.entries(httpHeaders).map(([hKey, hValue]) => [
					hKey,
					hValue.replace(placeholder, value),
				]),
			);
		}
	}

	// Create the agent tool
	const [newTool] = await db
		.insert(agentTools)
		.values({
			agentId: body.agentId,
			name: template.toolName,
			description: template.toolDescription,
			inputSchema: template.inputSchema,
			executionType: template.executionType,
			httpUrl,
			httpMethod: template.httpMethod,
			httpHeaders,
			mockResponse: template.mockResponse,
			isEnabled: true,
		})
		.returning();

	return c.json({
		success: true,
		tool: newTool,
	});
});

export { marketplace };
