import { Hono } from "hono";
import { config } from "../lib/config";
import { getAllPlans, getPlanName } from "../lib/plans";
import { usageProvider } from "../lib/usage";

const usage = new Hono();

// Get current usage for authenticated user
usage.get("/", async (c) => {
	// Self-hosted mode: unlimited usage
	if (config.isSelfHosted) {
		return c.json({
			used: 0,
			limit: 999999,
			remaining: 999999,
			planId: "unlimited",
			planName: "Self-Hosted",
			percentUsed: 0,
			billingPeriodStart: new Date().toISOString(),
			billingPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
		});
	}

	// @ts-expect-error - user is set by auth middleware
	const user = c.get("user") as { id: string } | null;
	const userId = user?.id;
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const usageData = await usageProvider.getUsage(userId);
	const remaining = Math.max(0, usageData.limit - usageData.used);
	const percentUsed = Math.round((usageData.used / usageData.limit) * 100);

	return c.json({
		used: usageData.used,
		limit: usageData.limit,
		remaining,
		planId: usageData.planId,
		planName: getPlanName(usageData.planId),
		percentUsed,
		billingPeriodStart: usageData.billingPeriodStart,
		billingPeriodEnd: usageData.billingPeriodEnd,
	});
});

// Check if user can send a message
usage.get("/can-send", async (c) => {
	// Self-hosted mode: always allowed
	if (config.isSelfHosted) {
		return c.json({ allowed: true, remaining: 999999 });
	}

	// @ts-expect-error - user is set by auth middleware
	const user = c.get("user") as { id: string } | null;
	const userId = user?.id;
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const result = await usageProvider.canSendMessage(userId);
	return c.json(result);
});

// Get available plans
usage.get("/plans", async (c) => {
	const plans = getAllPlans();
	return c.json({ plans });
});

export { usage };
