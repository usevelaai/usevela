export const PLAN_LIMITS = {
	free: { messages: 100, agents: 1, name: "Free", price: 0 },
	starter: { messages: 2000, agents: 1, name: "Starter", price: 9 },
	growth: { messages: 15000, agents: 1, name: "Growth", price: 29 },
	pro: { messages: 50000, agents: 3, name: "Pro", price: 99 },
} as const;

export type PlanId = keyof typeof PLAN_LIMITS;

// Build product map from environment variables
function buildProductMap(): Record<string, PlanId> {
	const map: Record<string, PlanId> = {};

	if (process.env.POLAR_PRODUCT_STARTER) {
		map[process.env.POLAR_PRODUCT_STARTER] = "starter";
	}
	if (process.env.POLAR_PRODUCT_GROWTH) {
		map[process.env.POLAR_PRODUCT_GROWTH] = "growth";
	}
	if (process.env.POLAR_PRODUCT_PRO) {
		map[process.env.POLAR_PRODUCT_PRO] = "pro";
	}

	return map;
}

export function getPlanLimit(planId: string): number {
	return PLAN_LIMITS[planId as PlanId]?.messages ?? PLAN_LIMITS.free.messages;
}

export function getAgentLimit(planId: string): number {
	return PLAN_LIMITS[planId as PlanId]?.agents ?? PLAN_LIMITS.free.agents;
}

export function getPlanName(planId: string): string {
	return PLAN_LIMITS[planId as PlanId]?.name ?? "Free";
}

export function getPlanPrice(planId: string): number {
	return PLAN_LIMITS[planId as PlanId]?.price ?? 0;
}

export function mapProductToPlan(productId: string): PlanId {
	const productMap = buildProductMap();
	return productMap[productId] ?? "free";
}

export function getAllPlans() {
	return Object.entries(PLAN_LIMITS).map(([id, plan]) => ({
		id,
		...plan,
	}));
}
