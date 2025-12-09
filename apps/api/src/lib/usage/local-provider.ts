import { and, count, eq, getDb, gte, usageEvents, userSubscriptions } from "@vela/db";
import { getPlanLimit } from "../plans";
import type { CanSendResult, UsageData, UsageProvider } from "./types";

export class LocalUsageProvider implements UsageProvider {
	async trackMessage(userId: string, metadata?: Record<string, unknown>): Promise<void> {
		const db = getDb();
		const subscription = await this.getSubscription(userId);

		await db.insert(usageEvents).values({
			userId,
			eventType: "message",
			metadata,
			billingPeriodStart: subscription.billingPeriodStart,
		});
	}

	async getUsage(userId: string): Promise<UsageData> {
		const db = getDb();
		const subscription = await this.getSubscription(userId);

		const [result] = await db
			.select({ count: count() })
			.from(usageEvents)
			.where(
				and(
					eq(usageEvents.userId, userId),
					eq(usageEvents.eventType, "message"),
					gte(usageEvents.billingPeriodStart, subscription.billingPeriodStart),
				),
			);

		return {
			used: result?.count ?? 0,
			limit: getPlanLimit(subscription.planId),
			planId: subscription.planId,
			billingPeriodStart: subscription.billingPeriodStart,
			billingPeriodEnd: subscription.billingPeriodEnd,
		};
	}

	async canSendMessage(userId: string): Promise<CanSendResult> {
		const { used, limit } = await this.getUsage(userId);

		if (used >= limit) {
			return {
				allowed: false,
				reason: `You've reached your monthly limit of ${limit.toLocaleString()} messages. Please upgrade your plan to continue.`,
				used,
				limit,
			};
		}

		return { allowed: true, used, limit };
	}

	private async getSubscription(userId: string) {
		const db = getDb();
		const [subscription] = await db
			.select()
			.from(userSubscriptions)
			.where(eq(userSubscriptions.userId, userId))
			.limit(1);

		if (subscription) {
			return subscription;
		}

		// Default to free plan with current month billing period
		const now = new Date();
		const billingPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
		const billingPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

		return {
			userId,
			planId: "free",
			billingPeriodStart,
			billingPeriodEnd,
		};
	}
}

export const usageProvider = new LocalUsageProvider();
