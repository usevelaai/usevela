import Anthropic from "@anthropic-ai/sdk";

// LLM Provider abstraction
// Supports: Anthropic (default), OpenAI-compatible (Ollama, OpenAI, etc.)

interface ChatMessage {
	role: "user" | "assistant" | "system";
	content: string;
}

export interface Tool {
	name: string;
	description: string;
	input_schema: {
		type: "object";
		properties: Record<string, unknown>;
		required?: string[];
	};
}

export interface ToolUse {
	id: string;
	name: string;
	input: Record<string, unknown>;
}

interface StreamOptions {
	model: string;
	maxTokens?: number;
	temperature?: number;
	system?: string;
	messages: ChatMessage[];
	tools?: Tool[];
}

interface StreamEvent {
	type: "text_delta" | "tool_use" | "done" | "error";
	text?: string;
	toolUse?: ToolUse;
	usage?: {
		inputTokens: number;
		outputTokens: number;
	};
	error?: string;
}

type StreamCallback = (event: StreamEvent) => Promise<void>;

// Determine which provider to use
const useOpenAI = !!process.env.OPENAI_API_BASE;

// Anthropic client (only init if needed)
let anthropicClient: Anthropic | null = null;
function getAnthropic(): Anthropic {
	if (!anthropicClient) {
		anthropicClient = new Anthropic({
			apiKey: process.env.ANTHROPIC_API_KEY,
		});
	}
	return anthropicClient;
}

// Build a system prompt that includes tool descriptions for models that don't support native tool calling
function buildToolSystemPrompt(basePrompt: string | undefined, tools: Tool[]): string {
	if (!tools || tools.length === 0) {
		return basePrompt || "";
	}

	const toolDescriptions = tools
		.map((tool) => {
			const params = Object.entries(tool.input_schema.properties)
				.map(([name, schema]) => {
					const s = schema as { type: string; description?: string };
					return `  - ${name} (${s.type}): ${s.description || ""}`;
				})
				.join("\n");
			return `${tool.name}: ${tool.description}\nParameters:\n${params}`;
		})
		.join("\n\n");

	// Simplified prompt that works better with Qwen and other models
	const toolPrompt = `You have tools available. To use a tool, output ONLY a JSON code block like this:
\`\`\`json
{"tool": "tool_name", "parameters": {"param": "value"}}
\`\`\`

Do not explain or announce tool usage. Just output the JSON block, then after receiving the result, respond naturally.

Available tools:
${toolDescriptions}`;

	return basePrompt ? `${basePrompt}\n\n${toolPrompt}` : toolPrompt;
}

// Parse tool calls from model response (for models without native tool support)
function parseToolCallFromText(
	text: string,
): { tool: string; parameters: Record<string, unknown> } | null {
	// Try to match ```json or ```tool_call blocks
	const jsonBlockMatch = text.match(/```(?:json|tool_call)?\s*\n?([\s\S]*?)\n?```/);
	if (jsonBlockMatch) {
		try {
			const parsed = JSON.parse(jsonBlockMatch[1].trim());
			if (parsed.tool && parsed.parameters) {
				return parsed;
			}
		} catch {
			// Invalid JSON
		}
	}

	// Also try to find raw JSON with tool/parameters structure
	const rawJsonMatch = text.match(
		/\{\s*"tool"\s*:\s*"([^"]+)"\s*,\s*"parameters"\s*:\s*(\{[^}]+\})\s*\}/,
	);
	if (rawJsonMatch) {
		try {
			const parameters = JSON.parse(rawJsonMatch[2]);
			return { tool: rawJsonMatch[1], parameters };
		} catch {
			// Invalid JSON
		}
	}

	return null;
}

// Remove tool call blocks from text for display
function stripToolCallsFromText(text: string): string {
	// Remove any code blocks containing tool JSON
	let cleaned = text.replace(
		/```(?:json|tool_call|tool)?\s*\n?\s*\{[\s\S]*?"tool"[\s\S]*?\}\s*\n?```/g,
		"",
	);
	// Remove unclosed code blocks
	cleaned = cleaned.replace(/```(?:json|tool_call|tool)?[\s\S]*$/g, "");
	// Remove JSON tool calls that might appear outside code blocks
	cleaned = cleaned.replace(
		/\{\s*"tool"\s*:\s*"[^"]+"\s*,\s*"parameters"\s*:\s*\{[^}]+\}\s*\}/g,
		"",
	);
	// Remove waiting/processing phrases
	cleaned = cleaned.replace(/wait (for )?a moment[^.]*[.!]?/gi, "");
	cleaned = cleaned.replace(/I'll wait[^.)]*[.)]/gi, "");
	cleaned = cleaned.replace(/\(I'll wait[^)]*\)/gi, "");
	cleaned = cleaned.replace(/one moment[^.]*[.!]?/gi, "");
	cleaned = cleaned.replace(/please wait[^.]*[.!]?/gi, "");
	cleaned = cleaned.replace(/let me check[^.]*[.!]?/gi, "");
	cleaned = cleaned.replace(/checking[^.]*[.!]?/gi, "");
	// Remove common phrases about using tools
	cleaned = cleaned.replace(
		/I('ll| will| am going to) (use|run|execute|call)[^.]*tool[^.]*\./gi,
		"",
	);
	cleaned = cleaned.replace(/Let me (use|check|get|run|call)[^.]*\./gi, "");
	cleaned = cleaned.replace(/Using the \w+ tool[^.]*[:.]/gi, "");
	cleaned = cleaned.replace(/Running[^.]*tool[^.]*\.\.\./gi, "");
	cleaned = cleaned.replace(/Result:\s*/gi, "");
	// Remove tool-related headers and labels
	cleaned = cleaned.replace(/^\s*Tool call:?\s*$/gim, "");
	cleaned = cleaned.replace(/^\s*Running.*:?\s*$/gim, "");
	// Remove orphaned parenthetical notes about waiting
	cleaned = cleaned.replace(/\([^)]*wait[^)]*result[^)]*\)/gi, "");
	cleaned = cleaned.replace(/\([^)]*before responding[^)]*\)/gi, "");
	// Clean up extra whitespace and newlines
	cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
	cleaned = cleaned.replace(/^[\s\n]+|[\s\n]+$/g, "");
	return cleaned;
}

// OpenAI-compatible streaming (works with Ollama, OpenAI, etc.)
async function streamOpenAI(options: StreamOptions, callback: StreamCallback): Promise<void> {
	const baseUrl = process.env.OPENAI_API_BASE || "https://api.openai.com/v1";
	const apiKey = process.env.OPENAI_API_KEY || "";
	const model = process.env.OPENAI_MODEL || options.model;

	// For OpenAI-compatible APIs, inject tools into system prompt
	// (Native tool calling is inconsistent across Ollama models)
	const systemWithTools = buildToolSystemPrompt(options.system, options.tools || []);

	// Convert messages format - include system as first message for OpenAI
	const messages: { role: string; content: string }[] = [];
	if (systemWithTools) {
		messages.push({ role: "system", content: systemWithTools });
	}
	messages.push(
		...options.messages.map((m) => ({
			role: m.role,
			content: m.content,
		})),
	);

	const response = await fetch(`${baseUrl}/chat/completions`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify({
			model,
			messages,
			max_tokens: options.maxTokens || 4096,
			temperature: options.temperature || 0.5,
			stream: true,
		}),
	});

	if (!response.ok) {
		const error = await response.text();
		await callback({ type: "error", error });
		return;
	}

	const reader = response.body?.getReader();
	if (!reader) {
		await callback({ type: "error", error: "No response body" });
		return;
	}

	const decoder = new TextDecoder();
	let buffer = "";
	let totalInputTokens = 0;
	let totalOutputTokens = 0;
	let accumulatedText = ""; // Track full response to detect tool calls
	let lastEmittedLength = 0; // Track what we've already sent to client

	// Helper to emit cleaned text incrementally
	const emitCleanedText = async () => {
		const cleaned = stripToolCallsFromText(accumulatedText);
		if (cleaned.length > lastEmittedLength) {
			const newText = cleaned.slice(lastEmittedLength);
			await callback({ type: "text_delta", text: newText });
			lastEmittedLength = cleaned.length;
		}
	};

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split("\n");
			buffer = lines.pop() || "";

			for (const line of lines) {
				if (line.startsWith("data: ")) {
					const data = line.slice(6);
					if (data === "[DONE]") {
						// Check for tool call in accumulated text before finishing
						const toolCall = parseToolCallFromText(accumulatedText);
						if (toolCall) {
							await callback({
								type: "tool_use",
								toolUse: {
									id: `tool_${Date.now()}`,
									name: toolCall.tool,
									input: toolCall.parameters,
								},
							});
						}

						// Emit any remaining cleaned text
						await emitCleanedText();

						await callback({
							type: "done",
							usage: {
								inputTokens: totalInputTokens,
								outputTokens: totalOutputTokens,
							},
						});
						return;
					}

					try {
						const parsed = JSON.parse(data);
						const delta = parsed.choices?.[0]?.delta;
						if (delta?.content) {
							accumulatedText += delta.content;
							totalOutputTokens += 1; // Rough estimate

							// Only emit if we're not in the middle of a tool call block
							// Check if we have an unclosed ```tool_call block
							const toolCallStarts = (accumulatedText.match(/```tool_call/g) || []).length;
							const codeBlockEnds = (accumulatedText.match(/```(?!tool_call)/g) || []).length;
							const inToolBlock = toolCallStarts > codeBlockEnds;

							if (!inToolBlock) {
								await emitCleanedText();
							}
						}
						// Some providers include usage
						if (parsed.usage) {
							totalInputTokens = parsed.usage.prompt_tokens || 0;
							totalOutputTokens = parsed.usage.completion_tokens || 0;
						}
					} catch {
						// Skip invalid JSON
					}
				}
			}
		}

		// Check for tool call in accumulated text (for providers that don't send [DONE])
		const toolCall = parseToolCallFromText(accumulatedText);
		if (toolCall) {
			await callback({
				type: "tool_use",
				toolUse: {
					id: `tool_${Date.now()}`,
					name: toolCall.tool,
					input: toolCall.parameters,
				},
			});
		}

		// Emit any remaining cleaned text
		await emitCleanedText();

		await callback({
			type: "done",
			usage: {
				inputTokens: totalInputTokens,
				outputTokens: totalOutputTokens,
			},
		});
	} finally {
		reader.releaseLock();
	}
}

// Anthropic streaming
async function streamAnthropic(options: StreamOptions, callback: StreamCallback): Promise<void> {
	const anthropic = getAnthropic();

	const streamOptions: Parameters<typeof anthropic.messages.stream>[0] = {
		model: options.model,
		max_tokens: options.maxTokens || 4096,
		temperature: options.temperature || 0.5,
		system: options.system,
		messages: options.messages.map((m) => ({
			role: m.role as "user" | "assistant",
			content: m.content,
		})),
	};

	// Add tools if provided
	if (options.tools && options.tools.length > 0) {
		streamOptions.tools = options.tools;
	}

	const response = await anthropic.messages.stream(streamOptions);

	// Track current tool use block being built
	let currentToolUse: { id: string; name: string; inputJson: string } | null = null;

	for await (const event of response) {
		if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
			await callback({ type: "text_delta", text: event.delta.text });
		} else if (event.type === "content_block_start" && event.content_block.type === "tool_use") {
			// Start of a tool use block
			currentToolUse = {
				id: event.content_block.id,
				name: event.content_block.name,
				inputJson: "",
			};
		} else if (
			event.type === "content_block_delta" &&
			event.delta.type === "input_json_delta" &&
			currentToolUse
		) {
			// Accumulate JSON input for tool
			currentToolUse.inputJson += event.delta.partial_json;
		} else if (event.type === "content_block_stop" && currentToolUse) {
			// Tool use block complete - emit event
			try {
				const input = JSON.parse(currentToolUse.inputJson || "{}");
				await callback({
					type: "tool_use",
					toolUse: {
						id: currentToolUse.id,
						name: currentToolUse.name,
						input,
					},
				});
			} catch {
				// Invalid JSON, skip
			}
			currentToolUse = null;
		}
	}

	const finalMessage = await response.finalMessage();
	await callback({
		type: "done",
		usage: {
			inputTokens: finalMessage.usage?.input_tokens || 0,
			outputTokens: finalMessage.usage?.output_tokens || 0,
		},
	});
}

// Main export - streams LLM response
export async function streamChat(options: StreamOptions, callback: StreamCallback): Promise<void> {
	if (useOpenAI) {
		return streamOpenAI(options, callback);
	}
	return streamAnthropic(options, callback);
}

// Export config for reference
export const llmConfig = {
	provider: useOpenAI ? "openai" : "anthropic",
	baseUrl: useOpenAI ? process.env.OPENAI_API_BASE : undefined,
};
