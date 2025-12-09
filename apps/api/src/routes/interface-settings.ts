import { agents, and, eq, getDb, interfaceSettings } from "@vela/db";
import { Hono } from "hono";
import { z } from "zod";

const interfaceSettingsRoute = new Hono();

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
	theme: z.enum(["light", "dark"]).optional(),
	primaryColor: z
		.string()
		.regex(/^#[0-9A-Fa-f]{6}$/, "invalid hex color")
		.optional(),
	chatBubbleColor: z
		.string()
		.regex(/^#[0-9A-Fa-f]{6}$/, "invalid hex color")
		.optional(),
	chatBubbleAlign: z.enum(["left", "right"]).optional(),
	displayName: z.string().min(1).max(100).optional(),
	profilePicture: z.string().url().nullable().optional(),
	initialMessage: z.string().max(500).nullable().optional(),
	suggestedMessages: z.array(z.string().max(200)).max(5).optional(),
	messagePlaceholder: z.string().max(100).nullable().optional(),
	footerMessage: z.string().max(200).nullable().optional(),
	dismissibleMessage: z.string().max(500).nullable().optional(),
	welcomeBubbles: z.array(z.string().max(150)).max(5).optional(),
	collectUserFeedback: z.boolean().optional(),
});

// Get settings for an agent
interfaceSettingsRoute.get("/:agentId", async (c) => {
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
		.from(interfaceSettings)
		.where(eq(interfaceSettings.agentId, agentId));

	if (!settings) {
		// Create default settings if none exist
		const [created] = await db.insert(interfaceSettings).values({ agentId }).returning();
		return c.json(created);
	}

	return c.json(settings);
});

// Get settings for public widget (no auth required)
interfaceSettingsRoute.get("/public/:agentId", async (c) => {
	const agentId = c.req.param("agentId");
	const db = getDb();

	const [settings] = await db
		.select()
		.from(interfaceSettings)
		.where(eq(interfaceSettings.agentId, agentId));

	if (!settings) {
		return c.json({ error: "agent not found" }, 404);
	}

	// Return only public-facing settings
	return c.json({
		theme: settings.theme,
		primaryColor: settings.primaryColor,
		chatBubbleColor: settings.chatBubbleColor,
		chatBubbleAlign: settings.chatBubbleAlign,
		displayName: settings.displayName,
		profilePicture: settings.profilePicture,
		initialMessage: settings.initialMessage,
		suggestedMessages: settings.suggestedMessages,
		messagePlaceholder: settings.messagePlaceholder,
		footerMessage: settings.footerMessage,
		dismissibleMessage: settings.dismissibleMessage,
		welcomeBubbles: settings.welcomeBubbles,
		collectUserFeedback: settings.collectUserFeedback,
	});
});

// Update settings for an agent
interfaceSettingsRoute.put("/:agentId", async (c) => {
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
		.from(interfaceSettings)
		.where(eq(interfaceSettings.agentId, agentId));

	if (!settings) {
		const [created] = await db
			.insert(interfaceSettings)
			.values({
				agentId,
				...parsed.data,
			})
			.returning();
		return c.json(created);
	}

	// Update existing
	const [updated] = await db
		.update(interfaceSettings)
		.set({
			...parsed.data,
			updatedAt: new Date(),
		})
		.where(eq(interfaceSettings.agentId, agentId))
		.returning();

	return c.json(updated);
});

// Upload profile picture for an agent
interfaceSettingsRoute.post("/:agentId/profile-picture", async (c) => {
	const agentId = c.req.param("agentId");
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	if (!(await verifyAgentOwnership(agentId, userId))) {
		return c.json({ error: "agent not found" }, 404);
	}

	const formData = await c.req.formData();
	const file = formData.get("file") as File;

	if (!file) {
		return c.json({ error: "file required" }, 400);
	}

	// Validate file type
	const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
	if (!allowedTypes.includes(file.type)) {
		return c.json({ error: "invalid file type. allowed: jpeg, png, gif, webp" }, 400);
	}

	// Validate file size (max 2MB)
	if (file.size > 2 * 1024 * 1024) {
		return c.json({ error: "file too large. max 2MB" }, 400);
	}

	// Convert to base64 data URL for simplicity
	// In production, you'd upload to S3/Cloudflare R2/etc
	const arrayBuffer = await file.arrayBuffer();
	const base64 = Buffer.from(arrayBuffer).toString("base64");
	const dataUrl = `data:${file.type};base64,${base64}`;

	const db = getDb();

	// Get or create settings
	const [settings] = await db
		.select()
		.from(interfaceSettings)
		.where(eq(interfaceSettings.agentId, agentId));

	if (!settings) {
		const [created] = await db
			.insert(interfaceSettings)
			.values({ agentId, profilePicture: dataUrl })
			.returning();
		return c.json({ url: created.profilePicture });
	}

	// Update existing
	const [updated] = await db
		.update(interfaceSettings)
		.set({
			profilePicture: dataUrl,
			updatedAt: new Date(),
		})
		.where(eq(interfaceSettings.agentId, agentId))
		.returning();

	return c.json({ url: updated.profilePicture });
});

// Delete profile picture for an agent
interfaceSettingsRoute.delete("/:agentId/profile-picture", async (c) => {
	const agentId = c.req.param("agentId");
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	if (!(await verifyAgentOwnership(agentId, userId))) {
		return c.json({ error: "agent not found" }, 404);
	}

	const db = getDb();

	const [updated] = await db
		.update(interfaceSettings)
		.set({
			profilePicture: null,
			updatedAt: new Date(),
		})
		.where(eq(interfaceSettings.agentId, agentId))
		.returning();

	if (!updated) {
		return c.json({ error: "no settings found" }, 404);
	}

	return c.json({ deleted: true });
});

export { interfaceSettingsRoute };
