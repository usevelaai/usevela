import { chatMessages, eq, getDb, messageFeedback } from "@vela/db";
import { Hono } from "hono";

const feedback = new Hono();

interface FeedbackBody {
	messageId: string;
	feedback: "up" | "down";
	sessionId?: string;
}

// POST /feedback - upsert feedback on a message
feedback.post("/", async (c) => {
	const body = await c.req.json<FeedbackBody>();
	const { messageId, feedback: feedbackValue, sessionId } = body;

	if (!messageId) {
		return c.json({ error: "messageId required" }, 400);
	}

	if (!feedbackValue || !["up", "down"].includes(feedbackValue)) {
		return c.json({ error: "feedback must be 'up' or 'down'" }, 400);
	}

	const db = getDb();

	// Verify message exists
	const [message] = await db
		.select()
		.from(chatMessages)
		.where(eq(chatMessages.id, messageId))
		.limit(1);

	if (!message) {
		return c.json({ error: "Message not found" }, 404);
	}

	// Only allow feedback on assistant messages
	if (message.role !== "assistant") {
		return c.json({ error: "Can only provide feedback on assistant messages" }, 400);
	}

	// Check if feedback already exists for this message+session
	if (sessionId) {
		const [existing] = await db
			.select()
			.from(messageFeedback)
			.where(eq(messageFeedback.messageId, messageId))
			.limit(1);

		if (existing && existing.sessionId === sessionId) {
			// Update existing feedback
			await db
				.update(messageFeedback)
				.set({ feedback: feedbackValue, updatedAt: new Date() })
				.where(eq(messageFeedback.id, existing.id));

			return c.json({ success: true, updated: true });
		}
	}

	// Insert new feedback
	await db.insert(messageFeedback).values({
		messageId,
		feedback: feedbackValue,
		sessionId: sessionId || null,
	});

	return c.json({ success: true, updated: false });
});

// GET /feedback/:messageId - get feedback for a message
feedback.get("/:messageId", async (c) => {
	const messageId = c.req.param("messageId");
	const db = getDb();

	const feedbacks = await db
		.select()
		.from(messageFeedback)
		.where(eq(messageFeedback.messageId, messageId));

	const upCount = feedbacks.filter((f) => f.feedback === "up").length;
	const downCount = feedbacks.filter((f) => f.feedback === "down").length;

	return c.json({
		messageId,
		upCount,
		downCount,
		total: feedbacks.length,
	});
});

export { feedback };
