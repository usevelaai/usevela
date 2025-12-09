import type { AgentTool } from "@vela/db";
import {
	agents,
	agentTools,
	and,
	chatMessages,
	conversations,
	eq,
	getDb,
	securitySettings,
	toolExecutions,
} from "@vela/db";
import type { ChatMessage, ChatRequest } from "@vela/types";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { trackLLMCost } from "../lib/cost-tracking";
import { streamChat, type Tool, type ToolUse } from "../lib/llm";
import { usageProvider } from "../lib/usage";
import { vectorClient } from "../lib/vector";

const chat = new Hono();

// Fetch tools from database for an agent
async function getAgentTools(agentId: string): Promise<Tool[]> {
	const db = getDb();
	const tools = await db.select().from(agentTools).where(eq(agentTools.agentId, agentId));

	return tools
		.filter((t) => t.isEnabled)
		.map((t) => ({
			name: t.name,
			description: t.description,
			input_schema: t.inputSchema,
		}));
}

// Tool execution handler - reads config from database
async function executeTool(toolUse: ToolUse, agentId: string): Promise<string> {
	const db = getDb();
	const [tool] = await db
		.select()
		.from(agentTools)
		.where(and(eq(agentTools.agentId, agentId), eq(agentTools.name, toolUse.name)))
		.limit(1);

	if (!tool) {
		// Track failed execution (tool not found)
		db.insert(toolExecutions)
			.values({
				agentId,
				toolId: null,
				toolName: toolUse.name,
				success: false,
				errorMessage: `Unknown tool: ${toolUse.name}`,
				executionTimeMs: 0,
			})
			.execute()
			.catch((err) => console.error("Failed to log tool execution:", err));
		return JSON.stringify({ error: `Unknown tool: ${toolUse.name}` });
	}

	// Execute with timing
	const startTime = Date.now();
	let result: string;
	let success = true;
	let errorMessage: string | null = null;

	try {
		result = await executeToolWithConfig(toolUse, tool);
		// Check if result contains an error
		try {
			const parsed = JSON.parse(result);
			if (parsed.error) {
				success = false;
				errorMessage = parsed.error;
			}
		} catch {
			// Result is not JSON, assume success
		}
	} catch (error) {
		success = false;
		errorMessage = error instanceof Error ? error.message : String(error);
		result = JSON.stringify({ error: errorMessage });
	}

	const executionTimeMs = Date.now() - startTime;

	// Log execution asynchronously (non-blocking)
	db.insert(toolExecutions)
		.values({
			agentId,
			toolId: tool.id,
			toolName: tool.name,
			success,
			errorMessage,
			executionTimeMs,
		})
		.execute()
		.catch((err) => console.error("Failed to log tool execution:", err));

	return result;
}

// Execute tool based on its configuration
async function executeToolWithConfig(toolUse: ToolUse, tool: AgentTool): Promise<string> {
	switch (tool.executionType) {
		case "mock": {
			// Return mock response, with variable substitution
			if (tool.mockResponse) {
				let response = tool.mockResponse;
				// Replace ${param} placeholders with actual values
				for (const [key, value] of Object.entries(toolUse.input)) {
					response = response.replace(new RegExp(`\\$\\{${key}\\}`, "g"), String(value));
				}
				return response;
			}
			return JSON.stringify({ result: "Mock response not configured" });
		}

		case "http": {
			if (!tool.httpUrl) {
				return JSON.stringify({ error: "HTTP URL not configured" });
			}

			// Build URL with parameter substitution
			let url = tool.httpUrl;
			for (const [key, value] of Object.entries(toolUse.input)) {
				url = url.replace(new RegExp(`\\$\\{${key}\\}`, "g"), encodeURIComponent(String(value)));
			}

			try {
				const response = await fetch(url, {
					method: tool.httpMethod || "GET",
					headers: {
						"Content-Type": "application/json",
						...tool.httpHeaders,
					},
					...(tool.httpMethod === "POST" && {
						body: JSON.stringify(toolUse.input),
					}),
				});

				if (!response.ok) {
					return JSON.stringify({ error: `HTTP ${response.status}: ${response.statusText}` });
				}

				const data = await response.json();
				return JSON.stringify(data);
			} catch (error) {
				return JSON.stringify({ error: `HTTP request failed: ${error}` });
			}
		}

		default:
			return JSON.stringify({ error: `Unknown execution type: ${tool.executionType}` });
	}
}

// In-memory rate limiter (key: agentId:clientIP, value: timestamps)
const rateLimitStore = new Map<string, number[]>();

// Clean up old entries every 5 minutes
setInterval(
	() => {
		const now = Date.now();
		for (const [key, timestamps] of rateLimitStore.entries()) {
			const filtered = timestamps.filter((t) => now - t < 86400000); // keep last 24h
			if (filtered.length === 0) {
				rateLimitStore.delete(key);
			} else {
				rateLimitStore.set(key, filtered);
			}
		}
	},
	5 * 60 * 1000,
);

function checkRateLimit(
	agentId: string,
	clientIP: string,
	limit: number,
	windowSeconds: number,
): { allowed: boolean; remaining: number } {
	const key = `${agentId}:${clientIP}`;
	const now = Date.now();
	const windowMs = windowSeconds * 1000;

	const timestamps = rateLimitStore.get(key) || [];
	const validTimestamps = timestamps.filter((t) => now - t < windowMs);

	if (validTimestamps.length >= limit) {
		return { allowed: false, remaining: 0 };
	}

	validTimestamps.push(now);
	rateLimitStore.set(key, validTimestamps);

	return { allowed: true, remaining: limit - validTimestamps.length };
}

function checkDomainAllowed(origin: string | null, allowedDomains: string[]): boolean {
	// Empty array means allow all
	if (!allowedDomains || allowedDomains.length === 0) {
		return true;
	}
	if (!origin) {
		return false; // No origin = block if domains are configured
	}
	try {
		const originHost = new URL(origin).host;
		return allowedDomains.some((domain) => {
			try {
				const allowedHost = new URL(domain).host;
				return originHost === allowedHost || originHost.endsWith(`.${allowedHost}`);
			} catch {
				// If domain is just a hostname without protocol
				return originHost === domain || originHost.endsWith(`.${domain}`);
			}
		});
	} catch {
		return false;
	}
}

function buildSystemPrompt(basePrompt: string, context: string[]): string {
	if (context.length === 0) {
		return basePrompt;
	}
	return `${basePrompt}

Use the following context to answer questions:

<context>
${context.join("\n\n")}
</context>

Answer based on the context when relevant. If the context doesn't contain relevant information, answer from your general knowledge.`;
}

interface ChatBody extends ChatRequest {
	conversationId?: string;
	agentId: string; // Required - chat must be scoped to an agent
	// Custom overrides (when not using saved agent)
	customModel?: string;
	customTemp?: number;
	customPrompt?: string;
}

chat.post("/", async (c) => {
	const body = await c.req.json<ChatBody>();
	const { messages, conversationId, agentId, customModel, customTemp, customPrompt } = body;

	if (!messages || !Array.isArray(messages) || messages.length === 0) {
		return c.json({ error: "messages array required" }, 400);
	}

	if (!agentId) {
		return c.json({ error: "agentId required" }, 400);
	}

	const db = getDb();

	// Check security settings (rate limit and domain)
	const [security] = await db
		.select()
		.from(securitySettings)
		.where(eq(securitySettings.agentId, agentId));

	if (security) {
		// Check domain restriction
		const origin = c.req.header("origin") || c.req.header("referer");
		if (!checkDomainAllowed(origin || null, security.allowedDomains || [])) {
			return c.json({ error: "Domain not allowed", code: "DOMAIN_BLOCKED" }, 403);
		}

		// Check rate limit
		const clientIP =
			c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
			c.req.header("x-real-ip") ||
			"unknown";
		const rateCheck = checkRateLimit(
			agentId,
			clientIP,
			security.messageLimit,
			security.messageLimitWindow,
		);
		if (!rateCheck.allowed) {
			return c.json(
				{
					error: `Rate limit exceeded. Try again in ${security.messageLimitWindow} seconds.`,
					code: "RATE_LIMITED",
				},
				429,
			);
		}
	}

	// Get latest user message for vector search
	const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
	if (!lastUserMessage) {
		return c.json({ error: "at least one user message required" }, 400);
	}

	// Get userId from context (set by auth middleware)
	// @ts-expect-error - user is set by auth middleware
	const user = c.get("user") as { id: string } | null;
	const userId = user?.id;

	// Check usage limits if user is authenticated
	if (userId) {
		const canSend = await usageProvider.canSendMessage(userId);
		if (!canSend.allowed) {
			return c.json({ error: canSend.reason, code: "LIMIT_REACHED" }, 403);
		}
	}

	// Determine model/temp/prompt: custom overrides > agent config > defaults
	let agentModel: string;
	let agentTemp: number;
	let basePrompt: string;

	if (customModel || customTemp !== undefined || customPrompt) {
		// Use custom params
		agentModel = customModel || "claude-sonnet-4-20250514";
		agentTemp = customTemp !== undefined ? customTemp / 100 : 0.5;
		basePrompt = customPrompt || "You are a helpful assistant.";
	} else {
		// Fetch agent config (specific or default)
		type AgentRow = typeof agents.$inferSelect;
		let agent: AgentRow | undefined;
		if (agentId) {
			[agent] = await db.select().from(agents).where(eq(agents.id, agentId)).limit(1);
		}
		if (!agent) {
			[agent] = await db.select().from(agents).where(eq(agents.isDefault, true)).limit(1);
		}
		// Fallback defaults if no agent configured
		agentModel = agent?.model || "claude-sonnet-4-20250514";
		agentTemp = agent ? agent.temperature / 100 : 0.5;
		basePrompt = agent?.systemPrompt || "You are a helpful assistant.";
	}

	// Search vector DB for relevant context (scoped to agent)
	const searchResults = await vectorClient.search(lastUserMessage.content, agentId);
	const contextDocs = searchResults.map((r) => r.content);
	const systemPrompt = buildSystemPrompt(basePrompt, contextDocs);

	// Convert messages to Anthropic format
	const anthropicMessages = messages.map((m: ChatMessage) => ({
		role: m.role as "user" | "assistant",
		content: m.content,
	}));

	// Create or get conversation for logging
	let convoId = conversationId;

	if (!convoId) {
		// Create new conversation with first user message as title
		const title = lastUserMessage.content.slice(0, 100);
		// Get country code from Cloudflare header
		const countryCode = c.req.header("cf-ipcountry") || null;
		const [newConvo] = await db
			.insert(conversations)
			.values({ agentId, title, countryCode })
			.returning();
		convoId = newConvo.id;
	}

	// Save user message
	await db.insert(chatMessages).values({
		conversationId: convoId,
		role: "user",
		content: lastUserMessage.content,
	});

	return streamSSE(c, async (stream) => {
		const messageId = crypto.randomUUID();
		let fullResponse = "";

		// ChatKit protocol: message_start
		await stream.writeSSE({
			event: "message_start",
			data: JSON.stringify({
				type: "message_start",
				message: { id: messageId, role: "assistant" },
			}),
		});

		// ChatKit protocol: content_block_start
		await stream.writeSSE({
			event: "content_block_start",
			data: JSON.stringify({
				type: "content_block_start",
				index: 0,
				content_block: { type: "text", text: "" },
			}),
		});

		let finalUsage = { inputTokens: 0, outputTokens: 0 };

		// Get tools for this agent
		const tools = await getAgentTools(agentId);

		// Track tool use for follow-up call
		let usedToolName: string | null = null;
		let toolResult: string | null = null;

		try {
			await streamChat(
				{
					model: agentModel,
					maxTokens: 4096,
					temperature: agentTemp,
					system: systemPrompt,
					messages: anthropicMessages,
					tools: tools.length > 0 ? tools : undefined,
				},
				async (event) => {
					if (event.type === "text_delta" && event.text) {
						fullResponse += event.text;
						// ChatKit protocol: content_block_delta
						await stream.writeSSE({
							event: "content_block_delta",
							data: JSON.stringify({
								type: "content_block_delta",
								index: 0,
								delta: { type: "text_delta", text: event.text },
							}),
						});
					} else if (event.type === "tool_use" && event.toolUse) {
						// Execute the tool
						const result = await executeTool(event.toolUse, agentId);

						// Store for follow-up call
						usedToolName = event.toolUse.name;
						toolResult = result;

						// Stream tool use info to client (for debugging/UI indicators)
						await stream.writeSSE({
							event: "tool_use",
							data: JSON.stringify({
								type: "tool_use",
								tool: event.toolUse.name,
								input: event.toolUse.input,
								result: JSON.parse(result),
							}),
						});
					} else if (event.type === "done" && event.usage) {
						finalUsage = event.usage;
					} else if (event.type === "error") {
						throw new Error(event.error);
					}
				},
			);

			// If a tool was used, make a follow-up call with the result
			if (usedToolName && toolResult) {
				const followUpMessages = [
					...anthropicMessages,
					{
						role: "assistant" as const,
						content: fullResponse || `Using ${usedToolName}...`,
					},
					{
						role: "user" as const,
						content: `Tool result: ${toolResult}\n\nNow respond naturally to the user based on this result. Do not mention that you used a tool.`,
					},
				];

				// Clear fullResponse so we only get the natural response
				fullResponse = "";

				await streamChat(
					{
						model: agentModel,
						maxTokens: 4096,
						temperature: agentTemp,
						system: systemPrompt,
						messages: followUpMessages,
					},
					async (event) => {
						if (event.type === "text_delta" && event.text) {
							fullResponse += event.text;
							await stream.writeSSE({
								event: "content_block_delta",
								data: JSON.stringify({
									type: "content_block_delta",
									index: 0,
									delta: { type: "text_delta", text: event.text },
								}),
							});
						} else if (event.type === "done" && event.usage) {
							finalUsage.inputTokens += event.usage.inputTokens;
							finalUsage.outputTokens += event.usage.outputTokens;
						}
					},
				);
			}

			// Save assistant response to DB with the same ID we sent to the client
			await db.insert(chatMessages).values({
				id: messageId,
				conversationId: convoId,
				role: "assistant",
				content: fullResponse,
			});

			// Track usage for billing
			console.log("[chat] userId for usage tracking:", userId);
			if (userId) {
				console.log("[chat] Tracking message for user:", userId);
				await usageProvider.trackMessage(userId, {
					conversationId: convoId,
					model: agentModel,
				});
				console.log("[chat] Message tracked successfully");

				// Track LLM cost with Polar Cost Insights
				if (finalUsage.inputTokens > 0 || finalUsage.outputTokens > 0) {
					await trackLLMCost(userId, {
						model: agentModel,
						inputTokens: finalUsage.inputTokens,
						outputTokens: finalUsage.outputTokens,
						conversationId: convoId,
						agentId,
					});
				}
			}

			// Update conversation timestamp
			await db
				.update(conversations)
				.set({ updatedAt: new Date() })
				.where(eq(conversations.id, convoId));

			// ChatKit protocol: content_block_stop
			await stream.writeSSE({
				event: "content_block_stop",
				data: JSON.stringify({ type: "content_block_stop", index: 0 }),
			});

			// ChatKit protocol: message_stop with conversationId
			await stream.writeSSE({
				event: "message_stop",
				data: JSON.stringify({ type: "message_stop", conversationId: convoId }),
			});
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Unknown error";
			await stream.writeSSE({
				event: "error",
				data: JSON.stringify({
					type: "error",
					error: { message: errorMessage },
				}),
			});
		}
	});
});

export { chat };
