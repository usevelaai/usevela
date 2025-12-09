import {
	agents,
	analyticsCountryDaily,
	analyticsDaily,
	analyticsToolDaily,
	and,
	chatMessages,
	conversations,
	count,
	eq,
	getDb,
	gte,
	lte,
	messageFeedback,
	sql,
	sum,
	toolExecutions,
} from "@vela/db";
import { Hono } from "hono";

const analytics = new Hono();

// Helper to get start of day in UTC
function startOfDayUTC(date: Date): Date {
	const d = new Date(date);
	d.setUTCHours(0, 0, 0, 0);
	return d;
}

// Helper to verify agent ownership
async function verifyAgentOwnership(
	db: ReturnType<typeof getDb>,
	agentId: string,
	userId: string,
): Promise<boolean> {
	const [agent] = await db
		.select()
		.from(agents)
		.where(and(eq(agents.id, agentId), eq(agents.userId, userId)))
		.limit(1);
	return !!agent;
}

// Compute daily stats from raw tables
async function computeDailyStats(
	db: ReturnType<typeof getDb>,
	agentId: string,
	date: Date,
): Promise<{
	conversationCount: number;
	messageCount: number;
	thumbsUpCount: number;
	thumbsDownCount: number;
}> {
	const dayStart = startOfDayUTC(date);
	const dayEnd = new Date(dayStart);
	dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

	// Count conversations created on this day for this agent
	const [convoResult] = await db
		.select({ count: count() })
		.from(conversations)
		.where(
			and(
				eq(conversations.agentId, agentId),
				gte(conversations.createdAt, dayStart),
				lte(conversations.createdAt, dayEnd),
			),
		);

	// Count messages for conversations belonging to this agent on this day
	const [msgResult] = await db
		.select({ count: count() })
		.from(chatMessages)
		.innerJoin(conversations, eq(chatMessages.conversationId, conversations.id))
		.where(
			and(
				eq(conversations.agentId, agentId),
				gte(chatMessages.createdAt, dayStart),
				lte(chatMessages.createdAt, dayEnd),
			),
		);

	// Count feedback for messages belonging to this agent on this day
	const feedbackResults = await db
		.select({
			feedback: messageFeedback.feedback,
			count: count(),
		})
		.from(messageFeedback)
		.innerJoin(chatMessages, eq(messageFeedback.messageId, chatMessages.id))
		.innerJoin(conversations, eq(chatMessages.conversationId, conversations.id))
		.where(
			and(
				eq(conversations.agentId, agentId),
				gte(messageFeedback.createdAt, dayStart),
				lte(messageFeedback.createdAt, dayEnd),
			),
		)
		.groupBy(messageFeedback.feedback);

	const thumbsUp = Number(feedbackResults.find((r) => r.feedback === "up")?.count) || 0;
	const thumbsDown = Number(feedbackResults.find((r) => r.feedback === "down")?.count) || 0;

	return {
		conversationCount: Number(convoResult?.count) || 0,
		messageCount: Number(msgResult?.count) || 0,
		thumbsUpCount: thumbsUp,
		thumbsDownCount: thumbsDown,
	};
}

// Compute country stats from raw tables
async function computeCountryStats(
	db: ReturnType<typeof getDb>,
	agentId: string,
	date: Date,
): Promise<Array<{ countryCode: string; conversationCount: number }>> {
	const dayStart = startOfDayUTC(date);
	const dayEnd = new Date(dayStart);
	dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

	const results = await db
		.select({
			countryCode: conversations.countryCode,
			count: count(),
		})
		.from(conversations)
		.where(
			and(
				eq(conversations.agentId, agentId),
				gte(conversations.createdAt, dayStart),
				lte(conversations.createdAt, dayEnd),
				sql`${conversations.countryCode} IS NOT NULL`,
			),
		)
		.groupBy(conversations.countryCode);

	return results.map((r) => ({
		countryCode: r.countryCode as string,
		conversationCount: r.count,
	}));
}

// GET /analytics/summary - aggregated metrics for date range
analytics.get("/summary", async (c) => {
	// @ts-expect-error - user is set by auth middleware
	const user = c.get("user") as { id: string } | null;
	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const agentId = c.req.query("agentId");
	const startDate = c.req.query("startDate");
	const endDate = c.req.query("endDate");

	if (!agentId) {
		return c.json({ error: "agentId required" }, 400);
	}

	const db = getDb();

	// Verify ownership
	if (!(await verifyAgentOwnership(db, agentId, user.id))) {
		return c.json({ error: "Agent not found" }, 404);
	}

	const start = startDate ? startOfDayUTC(new Date(startDate)) : new Date(0);
	const end = endDate ? startOfDayUTC(new Date(endDate)) : new Date();
	end.setUTCDate(end.getUTCDate() + 1); // Include end date

	// Get from rollup table
	const dailyStats = await db
		.select()
		.from(analyticsDaily)
		.where(
			and(
				eq(analyticsDaily.agentId, agentId),
				gte(analyticsDaily.date, start),
				lte(analyticsDaily.date, end),
			),
		);

	// If no rollup data, compute from raw tables for the entire date range
	if (dailyStats.length === 0) {
		// Count conversations in date range
		const [convoResult] = await db
			.select({ count: count() })
			.from(conversations)
			.where(
				and(
					eq(conversations.agentId, agentId),
					gte(conversations.createdAt, start),
					lte(conversations.createdAt, end),
				),
			);

		// Count messages in date range
		const [msgResult] = await db
			.select({ count: count() })
			.from(chatMessages)
			.innerJoin(conversations, eq(chatMessages.conversationId, conversations.id))
			.where(
				and(
					eq(conversations.agentId, agentId),
					gte(chatMessages.createdAt, start),
					lte(chatMessages.createdAt, end),
				),
			);

		// Count feedback in date range
		const feedbackResults = await db
			.select({
				feedback: messageFeedback.feedback,
				count: count(),
			})
			.from(messageFeedback)
			.innerJoin(chatMessages, eq(messageFeedback.messageId, chatMessages.id))
			.innerJoin(conversations, eq(chatMessages.conversationId, conversations.id))
			.where(
				and(
					eq(conversations.agentId, agentId),
					gte(messageFeedback.createdAt, start),
					lte(messageFeedback.createdAt, end),
				),
			)
			.groupBy(messageFeedback.feedback);

		const totalConversations = Number(convoResult?.count) || 0;
		const totalMessages = Number(msgResult?.count) || 0;
		const thumbsUp = Number(feedbackResults.find((r) => r.feedback === "up")?.count) || 0;
		const thumbsDown = Number(feedbackResults.find((r) => r.feedback === "down")?.count) || 0;

		return c.json({
			totalConversations,
			totalMessages,
			avgMessagesPerConversation:
				totalConversations > 0 ? Math.round((totalMessages / totalConversations) * 10) / 10 : 0,
			thumbsUp,
			thumbsDown,
			feedbackRatio: thumbsUp + thumbsDown > 0 ? thumbsUp / (thumbsUp + thumbsDown) : 0,
		});
	}

	// Aggregate rollup data
	let totalConversations = dailyStats.reduce((sum, d) => sum + d.conversationCount, 0);
	let totalMessages = dailyStats.reduce((sum, d) => sum + d.messageCount, 0);
	let thumbsUp = dailyStats.reduce((sum, d) => sum + d.thumbsUpCount, 0);
	let thumbsDown = dailyStats.reduce((sum, d) => sum + d.thumbsDownCount, 0);

	// Also compute today's stats (not in rollup yet) and add them
	const today = new Date();
	const todayKey = today.toISOString().split("T")[0];
	const hasToday = dailyStats.some((d) => d.date.toISOString().split("T")[0] === todayKey);

	if (!hasToday && end >= today) {
		const todayStats = await computeDailyStats(db, agentId, today);
		totalConversations += todayStats.conversationCount;
		totalMessages += todayStats.messageCount;
		thumbsUp += todayStats.thumbsUpCount;
		thumbsDown += todayStats.thumbsDownCount;
	}

	return c.json({
		totalConversations,
		totalMessages,
		avgMessagesPerConversation:
			totalConversations > 0 ? Math.round((totalMessages / totalConversations) * 10) / 10 : 0,
		thumbsUp,
		thumbsDown,
		feedbackRatio: thumbsUp + thumbsDown > 0 ? thumbsUp / (thumbsUp + thumbsDown) : 0,
	});
});

// GET /analytics/daily - time series data for charts
analytics.get("/daily", async (c) => {
	// @ts-expect-error - user is set by auth middleware
	const user = c.get("user") as { id: string } | null;
	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const agentId = c.req.query("agentId");
	const startDate = c.req.query("startDate");
	const endDate = c.req.query("endDate");

	if (!agentId) {
		return c.json({ error: "agentId required" }, 400);
	}

	const db = getDb();

	if (!(await verifyAgentOwnership(db, agentId, user.id))) {
		return c.json({ error: "Agent not found" }, 404);
	}

	const start = startDate
		? startOfDayUTC(new Date(startDate))
		: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
	const end = endDate ? startOfDayUTC(new Date(endDate)) : new Date();

	// Generate list of days in range
	const days: Date[] = [];
	const current = new Date(start);
	while (current <= end) {
		days.push(new Date(current));
		current.setUTCDate(current.getUTCDate() + 1);
	}

	// Get existing rollup data
	const existingStats = await db
		.select()
		.from(analyticsDaily)
		.where(
			and(
				eq(analyticsDaily.agentId, agentId),
				gte(analyticsDaily.date, start),
				lte(analyticsDaily.date, end),
			),
		);

	const existingByDate = new Map(existingStats.map((s) => [s.date.toISOString().split("T")[0], s]));

	// For each day, use rollup or compute
	const result = await Promise.all(
		days.map(async (day) => {
			const dateKey = day.toISOString().split("T")[0];
			const existing = existingByDate.get(dateKey);

			if (existing) {
				return {
					date: dateKey,
					conversations: existing.conversationCount,
					messages: existing.messageCount,
					thumbsUp: existing.thumbsUpCount,
					thumbsDown: existing.thumbsDownCount,
				};
			}

			// Compute and cache for past days (not today)
			const isToday = dateKey === new Date().toISOString().split("T")[0];
			const stats = await computeDailyStats(db, agentId, day);

			if (!isToday && (stats.conversationCount > 0 || stats.messageCount > 0)) {
				// Cache the result
				await db
					.insert(analyticsDaily)
					.values({
						agentId,
						date: startOfDayUTC(day),
						...stats,
					})
					.onConflictDoNothing();
			}

			return {
				date: dateKey,
				conversations: stats.conversationCount,
				messages: stats.messageCount,
				thumbsUp: stats.thumbsUpCount,
				thumbsDown: stats.thumbsDownCount,
			};
		}),
	);

	return c.json(result);
});

// GET /analytics/countries - country breakdown
analytics.get("/countries", async (c) => {
	// @ts-expect-error - user is set by auth middleware
	const user = c.get("user") as { id: string } | null;
	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const agentId = c.req.query("agentId");
	const startDate = c.req.query("startDate");
	const endDate = c.req.query("endDate");

	if (!agentId) {
		return c.json({ error: "agentId required" }, 400);
	}

	const db = getDb();

	if (!(await verifyAgentOwnership(db, agentId, user.id))) {
		return c.json({ error: "Agent not found" }, 404);
	}

	const start = startDate
		? startOfDayUTC(new Date(startDate))
		: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
	const end = endDate ? startOfDayUTC(new Date(endDate)) : new Date();
	const endPlusOne = new Date(end);
	endPlusOne.setUTCDate(endPlusOne.getUTCDate() + 1);

	// Get from rollup table
	const countryStats = await db
		.select({
			countryCode: analyticsCountryDaily.countryCode,
			total: sql<number>`SUM(${analyticsCountryDaily.conversationCount})`,
		})
		.from(analyticsCountryDaily)
		.where(
			and(
				eq(analyticsCountryDaily.agentId, agentId),
				gte(analyticsCountryDaily.date, start),
				lte(analyticsCountryDaily.date, end),
			),
		)
		.groupBy(analyticsCountryDaily.countryCode)
		.orderBy(sql`SUM(${analyticsCountryDaily.conversationCount}) DESC`);

	// If no rollup data, compute from raw
	if (countryStats.length === 0) {
		const rawStats = await db
			.select({
				countryCode: conversations.countryCode,
				count: count(),
			})
			.from(conversations)
			.where(
				and(
					eq(conversations.agentId, agentId),
					gte(conversations.createdAt, start),
					lte(conversations.createdAt, endPlusOne),
					sql`${conversations.countryCode} IS NOT NULL`,
				),
			)
			.groupBy(conversations.countryCode)
			.orderBy(sql`COUNT(*) DESC`);

		return c.json(
			rawStats.map((r) => ({
				countryCode: r.countryCode,
				conversationCount: r.count,
			})),
		);
	}

	return c.json(
		countryStats.map((r) => ({
			countryCode: r.countryCode,
			conversationCount: Number(r.total),
		})),
	);
});

// GET /analytics/tools - tool usage analytics
analytics.get("/tools", async (c) => {
	// @ts-expect-error - user is set by auth middleware
	const user = c.get("user") as { id: string } | null;
	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const agentId = c.req.query("agentId");
	const startDate = c.req.query("startDate");
	const endDate = c.req.query("endDate");

	if (!agentId) {
		return c.json({ error: "agentId required" }, 400);
	}

	const db = getDb();

	if (!(await verifyAgentOwnership(db, agentId, user.id))) {
		return c.json({ error: "Agent not found" }, 404);
	}

	const start = startDate
		? startOfDayUTC(new Date(startDate))
		: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
	const end = endDate ? startOfDayUTC(new Date(endDate)) : new Date();
	const endPlusOne = new Date(end);
	endPlusOne.setUTCDate(endPlusOne.getUTCDate() + 1);

	// Try rollup table first
	const rollupStats = await db
		.select({
			toolName: analyticsToolDaily.toolName,
			executionCount: sql<number>`SUM(${analyticsToolDaily.executionCount})`,
			successCount: sql<number>`SUM(${analyticsToolDaily.successCount})`,
			failureCount: sql<number>`SUM(${analyticsToolDaily.failureCount})`,
			totalExecutionTimeMs: sql<number>`SUM(${analyticsToolDaily.totalExecutionTimeMs})`,
		})
		.from(analyticsToolDaily)
		.where(
			and(
				eq(analyticsToolDaily.agentId, agentId),
				gte(analyticsToolDaily.date, start),
				lte(analyticsToolDaily.date, end),
			),
		)
		.groupBy(analyticsToolDaily.toolName);

	// Compute from raw events if no rollup data
	if (rollupStats.length === 0) {
		const rawStats = await db
			.select({
				toolName: toolExecutions.toolName,
				executionCount: count(),
				successCount: sql<number>`SUM(CASE WHEN ${toolExecutions.success} THEN 1 ELSE 0 END)`,
				failureCount: sql<number>`SUM(CASE WHEN NOT ${toolExecutions.success} THEN 1 ELSE 0 END)`,
				totalExecutionTimeMs: sum(toolExecutions.executionTimeMs),
			})
			.from(toolExecutions)
			.where(
				and(
					eq(toolExecutions.agentId, agentId),
					gte(toolExecutions.createdAt, start),
					lte(toolExecutions.createdAt, endPlusOne),
				),
			)
			.groupBy(toolExecutions.toolName);

		return c.json(
			rawStats.map((r) => ({
				toolName: r.toolName,
				executionCount: Number(r.executionCount),
				successCount: Number(r.successCount),
				failureCount: Number(r.failureCount),
				successRate: r.executionCount > 0 ? Number(r.successCount) / Number(r.executionCount) : 0,
				avgExecutionTimeMs:
					r.executionCount > 0
						? Math.round(Number(r.totalExecutionTimeMs) / Number(r.executionCount))
						: 0,
			})),
		);
	}

	return c.json(
		rollupStats.map((r) => ({
			toolName: r.toolName,
			executionCount: Number(r.executionCount),
			successCount: Number(r.successCount),
			failureCount: Number(r.failureCount),
			successRate: r.executionCount > 0 ? Number(r.successCount) / Number(r.executionCount) : 0,
			avgExecutionTimeMs:
				r.executionCount > 0
					? Math.round(Number(r.totalExecutionTimeMs) / Number(r.executionCount))
					: 0,
		})),
	);
});

export { analytics };
