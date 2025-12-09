import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { chat } from "./chat";

// Mock the anthropic client
vi.mock("../lib/anthropic", () => ({
	anthropic: {
		messages: {
			stream: vi.fn(),
		},
	},
}));

// Mock the vector client
vi.mock("../lib/vector", () => ({
	vectorClient: {
		search: vi.fn().mockResolvedValue([]),
	},
}));

import { anthropic } from "../lib/anthropic";
import { vectorClient } from "../lib/vector";

function createMockStream(chunks: string[]) {
	return {
		async *[Symbol.asyncIterator]() {
			for (const text of chunks) {
				yield {
					type: "content_block_delta" as const,
					delta: { type: "text_delta" as const, text },
				};
			}
		},
	};
}

async function collectSSEEvents(response: Response) {
	const text = await response.text();
	const events: Array<{ event: string; data: unknown }> = [];

	const lines = text.split("\n");
	let currentEvent = "";

	for (const line of lines) {
		if (line.startsWith("event:")) {
			currentEvent = line.slice(6).trim();
		} else if (line.startsWith("data:")) {
			const data = line.slice(5).trim();
			if (currentEvent && data) {
				events.push({ event: currentEvent, data: JSON.parse(data) });
				currentEvent = "";
			}
		}
	}

	return events;
}

describe("POST /chat", () => {
	let app: Hono;

	beforeEach(() => {
		vi.clearAllMocks();
		// Reset default mock implementations
		vi.mocked(vectorClient.search).mockResolvedValue([]);
		app = new Hono();
		app.route("/chat", chat);
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe("validation", () => {
		it("returns 400 when messages array is missing", async () => {
			const res = await app.request("/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({}),
			});

			expect(res.status).toBe(400);
			const json = (await res.json()) as { error: string };
			expect(json.error).toBe("messages array required");
		});

		it("returns 400 when messages is not an array", async () => {
			const res = await app.request("/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ messages: "not an array" }),
			});

			expect(res.status).toBe(400);
			const json = (await res.json()) as { error: string };
			expect(json.error).toBe("messages array required");
		});

		it("returns 400 when messages array is empty", async () => {
			const res = await app.request("/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ messages: [] }),
			});

			expect(res.status).toBe(400);
			const json = (await res.json()) as { error: string };
			expect(json.error).toBe("messages array required");
		});

		it("returns 400 when no user message exists", async () => {
			const res = await app.request("/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					messages: [{ role: "assistant", content: "Hello" }],
				}),
			});

			expect(res.status).toBe(400);
			const json = (await res.json()) as { error: string };
			expect(json.error).toBe("at least one user message required");
		});
	});

	describe("streaming response", () => {
		it("streams SSE events in ChatKit protocol format", async () => {
			const mockStream = createMockStream(["Hello", " World"]);
			vi.mocked(anthropic.messages.stream).mockReturnValue(mockStream as any);

			const res = await app.request("/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					messages: [{ role: "user", content: "Hi" }],
				}),
			});

			expect(res.status).toBe(200);
			expect(res.headers.get("content-type")).toContain("text/event-stream");

			const events = await collectSSEEvents(res);

			// Verify message_start
			const messageStart = events.find((e) => e.event === "message_start");
			expect(messageStart).toBeDefined();
			expect((messageStart?.data as any).type).toBe("message_start");
			expect((messageStart?.data as any).message.role).toBe("assistant");
			expect((messageStart?.data as any).message.id).toBeDefined();

			// Verify content_block_start
			const blockStart = events.find((e) => e.event === "content_block_start");
			expect(blockStart).toBeDefined();
			expect((blockStart?.data as any).type).toBe("content_block_start");
			expect((blockStart?.data as any).index).toBe(0);

			// Verify content_block_delta events
			const deltas = events.filter((e) => e.event === "content_block_delta");
			expect(deltas.length).toBe(2);
			expect((deltas[0]?.data as any).delta.text).toBe("Hello");
			expect((deltas[1]?.data as any).delta.text).toBe(" World");

			// Verify content_block_stop
			const blockStop = events.find((e) => e.event === "content_block_stop");
			expect(blockStop).toBeDefined();

			// Verify message_stop
			const messageStop = events.find((e) => e.event === "message_stop");
			expect(messageStop).toBeDefined();
		});

		it("includes vector search context in system prompt", async () => {
			const mockDocs = [
				{ id: "1", content: "Doc 1 content", score: 0.9 },
				{ id: "2", content: "Doc 2 content", score: 0.8 },
			];
			vi.mocked(vectorClient.search).mockResolvedValue(mockDocs);

			const mockStream = createMockStream(["Response"]);
			vi.mocked(anthropic.messages.stream).mockReturnValue(mockStream as any);

			const res = await app.request("/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					messages: [{ role: "user", content: "What is in the docs?" }],
				}),
			});

			// Consume stream to trigger completion
			await res.text();

			expect(vectorClient.search).toHaveBeenCalledWith("What is in the docs?");
			expect(anthropic.messages.stream).toHaveBeenCalledWith(
				expect.objectContaining({
					system: expect.stringContaining("Doc 1 content"),
				}),
			);
			expect(anthropic.messages.stream).toHaveBeenCalledWith(
				expect.objectContaining({
					system: expect.stringContaining("Doc 2 content"),
				}),
			);
		});

		it("uses default system prompt when no context available", async () => {
			vi.mocked(vectorClient.search).mockResolvedValue([]);

			const mockStream = createMockStream(["Hi"]);
			vi.mocked(anthropic.messages.stream).mockReturnValue(mockStream as any);

			const res = await app.request("/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					messages: [{ role: "user", content: "Hello" }],
				}),
			});

			// Consume stream to trigger completion
			await res.text();

			expect(anthropic.messages.stream).toHaveBeenCalledWith(
				expect.objectContaining({
					system: "You are a helpful assistant.",
				}),
			);
		});

		it("uses last user message for vector search", async () => {
			const mockStream = createMockStream(["Response"]);
			vi.mocked(anthropic.messages.stream).mockReturnValue(mockStream as any);

			await app.request("/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					messages: [
						{ role: "user", content: "First question" },
						{ role: "assistant", content: "First answer" },
						{ role: "user", content: "Second question" },
					],
				}),
			});

			expect(vectorClient.search).toHaveBeenCalledWith("Second question");
		});
	});

	describe("error handling", () => {
		it("streams error event when Anthropic API fails", async () => {
			const mockStream = {
				[Symbol.asyncIterator]: () => ({
					next: () => Promise.reject(new Error("API rate limited")),
				}),
			};
			vi.mocked(anthropic.messages.stream).mockReturnValue(mockStream as any);

			const res = await app.request("/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					messages: [{ role: "user", content: "Hi" }],
				}),
			});

			const events = await collectSSEEvents(res);
			const errorEvent = events.find((e) => e.event === "error");

			expect(errorEvent).toBeDefined();
			expect((errorEvent?.data as any).type).toBe("error");
			expect((errorEvent?.data as any).error.message).toBe("API rate limited");
		});

		it("handles non-Error exceptions", async () => {
			const mockStream = {
				[Symbol.asyncIterator]: () => ({
					next: () => Promise.reject("string error"),
				}),
			};
			vi.mocked(anthropic.messages.stream).mockReturnValue(mockStream as any);

			const res = await app.request("/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					messages: [{ role: "user", content: "Hi" }],
				}),
			});

			const events = await collectSSEEvents(res);
			const errorEvent = events.find((e) => e.event === "error");

			expect(errorEvent).toBeDefined();
			expect((errorEvent?.data as any).error.message).toBe("Unknown error");
		});
	});

	describe("message formatting", () => {
		it("passes messages to Anthropic in correct format", async () => {
			const mockStream = createMockStream(["Response"]);
			vi.mocked(anthropic.messages.stream).mockReturnValue(mockStream as any);

			const messages = [
				{ role: "user", content: "Hello" },
				{ role: "assistant", content: "Hi there" },
				{ role: "user", content: "How are you?" },
			];

			const res = await app.request("/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ messages }),
			});

			// Consume stream to trigger completion
			await res.text();

			expect(anthropic.messages.stream).toHaveBeenCalledWith(
				expect.objectContaining({
					messages: [
						{ role: "user", content: "Hello" },
						{ role: "assistant", content: "Hi there" },
						{ role: "user", content: "How are you?" },
					],
					model: "claude-sonnet-4-20250514",
					max_tokens: 4096,
				}),
			);
		});
	});
});
