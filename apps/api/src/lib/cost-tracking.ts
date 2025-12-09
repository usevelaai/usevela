import { Polar } from "@polar-sh/sdk";

const isSelfHosted = process.env.SELF_HOSTED === "true";

let polarClient: Polar | null = null;

if (!isSelfHosted && process.env.POLAR_ACCESS_TOKEN) {
	polarClient = new Polar({
		accessToken: process.env.POLAR_ACCESS_TOKEN,
		server: process.env.POLAR_ENVIRONMENT === "sandbox" ? "sandbox" : "production",
	});
}

// Anthropic pricing per million tokens (in dollars)
// Source: https://platform.claude.com/docs/en/about-claude/models
const ANTHROPIC_PRICING: Record<string, { input: number; output: number }> = {
	// Claude 4.5 models
	"claude-opus-4-5-20251101": { input: 5, output: 25 },
	"claude-opus-4-5": { input: 5, output: 25 },
	"claude-sonnet-4-5-20250929": { input: 3, output: 15 },
	"claude-sonnet-4-5": { input: 3, output: 15 },
	"claude-haiku-4-5-20251001": { input: 1, output: 5 },
	"claude-haiku-4-5": { input: 1, output: 5 },
	// Claude 4 models
	"claude-sonnet-4-20250514": { input: 3, output: 15 },
	"claude-sonnet-4": { input: 3, output: 15 },
	"claude-opus-4-20250514": { input: 15, output: 75 },
	"claude-opus-4": { input: 15, output: 75 },
	// Claude 3.5 models (legacy)
	"claude-3-5-sonnet-20241022": { input: 3, output: 15 },
	"claude-3-5-sonnet-latest": { input: 3, output: 15 },
	"claude-3-5-haiku-20241022": { input: 1, output: 5 },
	"claude-3-5-haiku-latest": { input: 1, output: 5 },
	// Claude 3 models (legacy)
	"claude-3-opus-20240229": { input: 15, output: 75 },
	"claude-3-sonnet-20240229": { input: 3, output: 15 },
	"claude-3-haiku-20240307": { input: 0.25, output: 1.25 },
};

// OpenAI pricing per million tokens (in dollars)
// Source: https://openai.com/pricing
const OPENAI_PRICING: Record<string, { input: number; output: number }> = {
	"gpt-4o": { input: 2.5, output: 10 },
	"gpt-4o-2024-11-20": { input: 2.5, output: 10 },
	"gpt-4o-mini": { input: 0.15, output: 0.6 },
	"gpt-4o-mini-2024-07-18": { input: 0.15, output: 0.6 },
	"gpt-4-turbo": { input: 10, output: 30 },
	"gpt-4-turbo-2024-04-09": { input: 10, output: 30 },
	"gpt-4": { input: 30, output: 60 },
	"gpt-4-0613": { input: 30, output: 60 },
	"gpt-3.5-turbo": { input: 0.5, output: 1.5 },
	"gpt-3.5-turbo-0125": { input: 0.5, output: 1.5 },
	o1: { input: 15, output: 60 },
	"o1-2024-12-17": { input: 15, output: 60 },
	"o1-mini": { input: 1.1, output: 4.4 },
	"o1-mini-2024-09-12": { input: 1.1, output: 4.4 },
	"o3-mini": { input: 1.1, output: 4.4 },
	"o3-mini-2025-01-31": { input: 1.1, output: 4.4 },
};

/**
 * Get pricing for a model (supports both Anthropic and OpenAI)
 */
function getModelPricing(model: string): { input: number; output: number } | null {
	return ANTHROPIC_PRICING[model] || OPENAI_PRICING[model] || null;
}

/**
 * Calculate LLM cost in cents
 */
export function calculateLLMCostCents(
	model: string,
	inputTokens: number,
	outputTokens: number,
): number {
	const pricing = getModelPricing(model);
	if (!pricing) {
		console.warn(`[cost-tracking] Unknown model pricing for: ${model}`);
		return 0;
	}

	// Pricing is per million tokens, convert to per token then to cents
	const inputCostDollars = (inputTokens / 1_000_000) * pricing.input;
	const outputCostDollars = (outputTokens / 1_000_000) * pricing.output;
	const totalCostDollars = inputCostDollars + outputCostDollars;

	// Convert to cents and round to avoid floating point issues
	return Math.round(totalCostDollars * 100 * 1000) / 1000; // Keep 3 decimal places for precision
}

export interface LLMUsage {
	model: string;
	inputTokens: number;
	outputTokens: number;
	conversationId?: string;
	agentId?: string;
}

/**
 * Track LLM cost with Polar Cost Insights
 * Skipped when SELF_HOSTED=true
 */
export async function trackLLMCost(userId: string, usage: LLMUsage): Promise<void> {
	// Skip cost tracking in self-hosted mode
	if (!polarClient) {
		return;
	}

	try {
		const costCents = calculateLLMCostCents(usage.model, usage.inputTokens, usage.outputTokens);

		if (costCents <= 0) {
			console.warn(`[cost-tracking] Skipping tracking for zero/unknown cost: ${usage.model}`);
			return;
		}

		// Polar expects _cost with amount in cents and currency
		await polarClient.events.ingest({
			events: [
				{
					name: "llm_call",
					externalCustomerId: userId,
					metadata: {
						model: usage.model,
						inputTokens: usage.inputTokens,
						outputTokens: usage.outputTokens,
						conversationId: usage.conversationId || "",
						agentId: usage.agentId || "",
						_cost: {
							amount: costCents,
							currency: "usd",
						},
					},
				},
			],
		});

		console.log(
			`[cost-tracking] Tracked LLM cost: ${costCents}¢ for user ${userId} (${usage.model}: ${usage.inputTokens} in, ${usage.outputTokens} out)`,
		);
	} catch (error) {
		// Log but don't throw - cost tracking shouldn't break the main flow
		console.error("[cost-tracking] Failed to track LLM cost:", error);
	}
}
