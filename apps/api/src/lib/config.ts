// Application configuration
// Self-hosted mode disables billing/usage limits

export const config = {
	isSelfHosted: process.env.SELF_HOSTED === "true",

	// LLM provider
	llmProvider: process.env.OPENAI_API_BASE ? "openai" : "anthropic",

	// Feature flags based on hosting mode
	features: {
		billing: process.env.SELF_HOSTED !== "true",
		usageLimits: process.env.SELF_HOSTED !== "true",
		analytics: process.env.SELF_HOSTED !== "true",
	},
};
