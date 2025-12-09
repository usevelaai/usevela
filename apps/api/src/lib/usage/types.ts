export interface UsageData {
	used: number;
	limit: number;
	planId: string;
	billingPeriodStart: Date;
	billingPeriodEnd: Date;
}

export interface CanSendResult {
	allowed: boolean;
	reason?: string;
	used?: number;
	limit?: number;
}

export interface UsageProvider {
	/**
	 * Track a message event for a user
	 */
	trackMessage(userId: string, metadata?: Record<string, unknown>): Promise<void>;

	/**
	 * Get current usage for a user
	 */
	getUsage(userId: string): Promise<UsageData>;

	/**
	 * Check if a user can send a message (hasn't exceeded limit)
	 */
	canSendMessage(userId: string): Promise<CanSendResult>;
}
