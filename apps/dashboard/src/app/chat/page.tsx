"use client";

import { AlertTriangle, Check, Copy, MessageSquare, ThumbsDown, ThumbsUp, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AuthenticatedLayout } from "@/components/authenticated-layout";
import { Button } from "@/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { useAgent } from "@/lib/agent-context";
import { getInterfaceSettings, type InterfaceSettings, submitFeedback } from "@/lib/api";

interface Message {
	id: string;
	role: "user" | "assistant";
	content: string;
	timestamp: Date;
	feedback?: "up" | "down" | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Format timestamp as relative time
function formatTimeAgo(date: Date): string {
	const now = new Date();
	const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

	if (seconds < 60) return "just now";
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	return `${days}d ago`;
}

export default function ChatPage() {
	const [messages, setMessages] = useState<Message[]>([]);
	const [input, setInput] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [limitReached, setLimitReached] = useState(false);
	const abortControllerRef = useRef<AbortController | null>(null);
	const streamContentRef = useRef("");
	const { currentAgent } = useAgent();
	const [settings, setSettings] = useState<InterfaceSettings | null>(null);
	const [dismissedBanner, setDismissedBanner] = useState(false);
	const [showInitialMessage, setShowInitialMessage] = useState(true);
	const [copiedId, setCopiedId] = useState<string | null>(null);

	// Copy message content to clipboard
	const handleCopy = async (msgId: string, content: string) => {
		try {
			await navigator.clipboard.writeText(content);
			setCopiedId(msgId);
			setTimeout(() => setCopiedId(null), 2000);
		} catch (err) {
			console.error("Failed to copy:", err);
			toast.error("Failed to copy to clipboard");
		}
	};

	// Handle feedback (thumbs up/down)
	const handleFeedback = async (msgId: string, feedback: "up" | "down") => {
		const msg = messages.find((m) => m.id === msgId);
		const newFeedback = msg?.feedback === feedback ? null : feedback;

		// Update UI optimistically
		setMessages((prev) =>
			prev.map((m) =>
				m.id === msgId ? { ...m, feedback: newFeedback } : m
			)
		);

		// Send to backend (only if setting feedback, not clearing)
		if (newFeedback) {
			try {
				await submitFeedback(msgId, newFeedback);
			} catch (err) {
				console.error("Failed to submit feedback:", err);
				// Revert on error
				setMessages((prev) =>
					prev.map((m) =>
						m.id === msgId ? { ...m, feedback: msg?.feedback } : m
					)
				);
			}
		}
	};

	// Fetch interface settings when agent changes
	useEffect(() => {
		if (!currentAgent) return;
		const fetchData = async () => {
			try {
				const settingsData = await getInterfaceSettings(currentAgent.id);
				setSettings(settingsData);
			} catch (err) {
				console.error("Failed to fetch data:", err);
				toast.error("Failed to load settings");
			}
		};
		fetchData();
	}, [currentAgent]);

	const sendMessage = useCallback(
		async (messageContent?: string) => {
			const content = messageContent || input.trim();
			if (!content || isLoading) return;

			setShowInitialMessage(false);

			const userMessage: Message = {
				id: crypto.randomUUID(),
				role: "user",
				content,
				timestamp: new Date(),
			};

			setMessages((prev) => [...prev, userMessage]);
			setInput("");
			setIsLoading(true);

			const assistantMessageId = crypto.randomUUID();
			const assistantMessage: Message = {
				id: assistantMessageId,
				role: "assistant",
				content: "",
				timestamp: new Date(),
				feedback: null,
			};

			setMessages((prev) => [...prev, assistantMessage]);
			streamContentRef.current = "";

			try {
				abortControllerRef.current = new AbortController();

				const response = await fetch(`${API_BASE}/chat`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					credentials: "include",
					body: JSON.stringify({
						messages: [...messages, userMessage].map((m) => ({
							role: m.role,
							content: m.content,
						})),
						...(currentAgent ? { agentId: currentAgent.id } : {}),
					}),
					signal: abortControllerRef.current.signal,
				});

				if (!response.ok) {
					const errorData = await response.json().catch(() => ({}));
					console.error("Chat API error:", response.status, errorData);

					// Check for limit reached error
					if (errorData.code === "LIMIT_REACHED") {
						setLimitReached(true);
						throw new Error("Message limit reached. Please upgrade your plan to continue.");
					}

					throw new Error(errorData.error || "Failed to send message");
				}

				const reader = response.body?.getReader();
				const decoder = new TextDecoder();

				if (!reader) throw new Error("No response body");

				let buffer = "";
				let realMessageId = assistantMessageId; // Will be updated from stream

				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					buffer += decoder.decode(value, { stream: true });
					const lines = buffer.split("\n");
					buffer = lines.pop() || "";

					for (const line of lines) {
						if (line.startsWith("data:")) {
							try {
								const data = JSON.parse(line.slice(5));

								// Check for error in the stream
								if (data.type === "error" || data.error) {
									const errorMsg = data.error?.message || data.message || "An error occurred";
									console.error("Stream error:", errorMsg);
									throw new Error(errorMsg);
								}

								// Capture the real message ID from message_start event
								if (data.type === "message_start" && data.message?.id) {
									realMessageId = data.message.id;
									// Update the message with the real ID from backend
									setMessages((prev) => {
										const idx = prev.findIndex((m) => m.id === assistantMessageId);
										if (idx === -1) return prev;
										const updated = [...prev];
										updated[idx] = { ...updated[idx], id: realMessageId };
										return updated;
									});
								}

								if (data.type === "content_block_delta" && data.delta?.text) {
									streamContentRef.current += data.delta.text;
									const newContent = streamContentRef.current;
									setMessages((prev) => {
										const lastIndex = prev.findIndex((m) => m.id === realMessageId);
										if (lastIndex === -1) return prev;
										const updated = [...prev];
										updated[lastIndex] = {
											...updated[lastIndex],
											content: newContent,
										};
										return updated;
									});
								}
							} catch (parseError) {
								console.error("Stream parsing error:", parseError);
								if (
									(parseError as Error).message !== "Unexpected token" &&
									!(parseError as Error).message.includes("JSON")
								) {
									throw parseError;
								}
								// Skip invalid JSON
							}
						}
					}
				}
			} catch (err) {
				if ((err as Error).name !== "AbortError") {
					const errorMessage = (err as Error).message || "Failed to get response";
					console.error("Displaying error toast:", errorMessage);
					toast.error(errorMessage);
					setMessages((prev) => {
						const updated = [...prev];
						const last = updated[updated.length - 1];
						if (last.role === "assistant") {
							last.content = `Error: ${errorMessage}`;
						}
						return updated;
					});
				}
			} finally {
				setIsLoading(false);
				abortControllerRef.current = null;
			}
		},
		[input, isLoading, messages, currentAgent],
	);

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			sendMessage();
		}
	};

	const handleSuggestedMessage = (msg: string) => {
		sendMessage(msg);
	};

	// Theme classes
	const isDark = settings?.theme === "dark";
	const containerClass = isDark ? "bg-gray-900" : "bg-white";
	const textClass = isDark ? "text-gray-100" : "text-gray-800";
	const borderClass = isDark ? "border-gray-700" : "border-gray-200";
	const assistantBubbleClass = isDark ? "bg-gray-800 text-gray-100" : "bg-gray-100 text-gray-800";

	// Dynamic bubble color
	const userBubbleStyle = {
		backgroundColor: settings?.chatBubbleColor || "#3b82f6",
		color: "white",
	};

	const renderMessages = () => {
		if (messages.length === 0 && showInitialMessage) {
			return (
				<div className="h-full flex flex-col">
					{/* Initial Message / Welcome */}
					{settings?.initialMessage && (
						<div className="flex items-start gap-3 mb-6">
							{settings?.profilePicture ? (
								<Image
									src={settings.profilePicture}
									alt={settings.displayName || "Assistant"}
									width={40}
									height={40}
									className="w-10 h-10 rounded-full object-cover flex-shrink-0"
								/>
							) : (
								<div
									className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white"
									style={{
										backgroundColor: settings?.primaryColor || "#3b82f6",
									}}
								>
									<MessageSquare className="h-5 w-5" />
								</div>
							)}
							<div>
								<p className={`font-medium text-sm mb-1 ${textClass}`}>
									{settings?.displayName || "AI Assistant"}
								</p>
								<div className={`px-4 py-3 rounded-lg ${assistantBubbleClass}`}>
									{settings.initialMessage}
								</div>
							</div>
						</div>
					)}

					{/* Suggested Messages */}
					{settings?.suggestedMessages && settings.suggestedMessages.length > 0 && (
						<div className="flex flex-wrap gap-2 mt-auto mb-4">
							{settings.suggestedMessages.map((msg, index) => (
								<button
									type="button"
									key={index}
									onClick={() => handleSuggestedMessage(msg)}
									className={`px-3 py-2 rounded-lg border text-sm hover:bg-gray-50 transition-colors ${borderClass} ${textClass} ${isDark ? "hover:bg-gray-800" : "hover:bg-gray-50"}`}
									disabled={isLoading}
								>
									{msg}
								</button>
							))}
						</div>
					)}

					{/* Empty state if no initial message */}
					{!settings?.initialMessage && (
						<Empty className="h-full">
							<EmptyContent>
								<EmptyMedia variant="icon">
									{settings?.profilePicture ? (
										<Image
											src={settings.profilePicture}
											alt={settings.displayName || "Assistant"}
											width={48}
											height={48}
											className="w-12 h-12 rounded-full object-cover"
										/>
									) : (
										<MessageSquare />
									)}
								</EmptyMedia>
								<EmptyTitle>{settings?.displayName || "Start a conversation"}</EmptyTitle>
								<EmptyDescription>
									Type your message below to begin chatting with the AI assistant.
								</EmptyDescription>
							</EmptyContent>
						</Empty>
					)}
				</div>
			);
		}

		return (
			<div className="space-y-4">
				{messages.map((msg) => (
					<div
						key={msg.id}
						className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
					>
						{msg.role === "assistant" && (
							<div className="flex items-start gap-2">
								{settings?.profilePicture ? (
									<Image
										src={settings.profilePicture}
										alt={settings.displayName || "Assistant"}
										width={32}
										height={32}
										className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-1"
									/>
								) : (
									<div
										className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 text-white"
										style={{
											backgroundColor: settings?.primaryColor || "#3b82f6",
										}}
									>
										<MessageSquare className="h-4 w-4" />
									</div>
								)}
								<div className="flex flex-col">
									<div
										className={`px-4 py-3 rounded-lg max-w-[80%] whitespace-pre-wrap ${assistantBubbleClass}`}
									>
										{msg.content || (isLoading ? "..." : "")}
									</div>
									{/* Action icons */}
									{msg.content && (
										<div className={`flex items-center gap-2 mt-1 ml-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
											<button
												type="button"
												onClick={() => handleCopy(msg.id, msg.content)}
												className={`p-1 rounded hover:${isDark ? "bg-gray-700" : "bg-gray-100"} transition-colors`}
												title="Copy to clipboard"
											>
												{copiedId === msg.id ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
											</button>
											<button
												type="button"
												onClick={() => handleFeedback(msg.id, "up")}
												className={`p-1 rounded hover:${isDark ? "bg-gray-700" : "bg-gray-100"} transition-colors ${msg.feedback === "up" ? "text-green-500" : ""}`}
												title="Good response"
											>
												<ThumbsUp className="h-3.5 w-3.5" />
											</button>
											<button
												type="button"
												onClick={() => handleFeedback(msg.id, "down")}
												className={`p-1 rounded hover:${isDark ? "bg-gray-700" : "bg-gray-100"} transition-colors ${msg.feedback === "down" ? "text-red-500" : ""}`}
												title="Bad response"
											>
												<ThumbsDown className="h-3.5 w-3.5" />
											</button>
											<span className="text-xs">{formatTimeAgo(msg.timestamp)}</span>
										</div>
									)}
								</div>
							</div>
						)}
						{msg.role === "user" && (
							<div
								className="px-4 py-3 rounded-lg max-w-[80%] whitespace-pre-wrap"
								style={userBubbleStyle}
							>
								{msg.content}
							</div>
						)}
					</div>
				))}
			</div>
		);
	};

	return (
		<AuthenticatedLayout>
			<div className={`flex flex-col h-full max-w-3xl mx-auto ${containerClass}`}>
				{/* Limit Reached Banner */}
				{limitReached && (
					<div className="flex items-center justify-between px-4 py-3 bg-destructive/10 border-b border-destructive/20">
						<div className="flex items-center gap-2">
							<AlertTriangle className="h-5 w-5 text-destructive" />
							<p className="text-sm font-medium text-destructive">
								You've reached your message limit for this billing period.
							</p>
						</div>
						<Link href="/billing">
							<Button size="sm" variant="destructive">
								Upgrade Plan
							</Button>
						</Link>
					</div>
				)}

				{/* Messages Area */}
				<div className="flex-1 overflow-y-auto p-4">
					{renderMessages()}
				</div>

				{/* Input Area */}
				<div className={`p-4 border-t ${borderClass}`}>
					{/* Dismissible Banner */}
					{settings?.dismissibleMessage && !dismissedBanner && (
						<div
							className={`flex items-center justify-between px-3 py-2 mb-3 rounded-lg ${isDark ? "bg-blue-900/30 text-blue-200" : "bg-blue-50 text-blue-800"}`}
						>
							<p className="text-sm flex-1">{settings.dismissibleMessage}</p>
							<button
								type="button"
								onClick={() => setDismissedBanner(true)}
								className={`p-1 rounded shrink-0 ${isDark ? "hover:bg-blue-800/50" : "hover:bg-blue-100"}`}
							>
								<X className="h-4 w-4" />
							</button>
						</div>
					)}
					<div className="flex gap-2">
						<Input
							type="text"
							value={input}
							onChange={(e) => setInput(e.target.value)}
							onKeyDown={handleKeyDown}
							placeholder={settings?.messagePlaceholder || "Type a message..."}
							className={`flex-1 ${isDark ? "bg-gray-800 border-gray-700 text-white placeholder:text-gray-400" : ""}`}
							disabled={isLoading}
						/>
						<Button
							type="button"
							onClick={() => sendMessage()}
							disabled={isLoading}
							style={{ backgroundColor: settings?.primaryColor || "#3b82f6" }}
						>
							{isLoading ? "..." : "Send"}
						</Button>
					</div>

					{/* Footer Message */}
					{settings?.footerMessage && (
						<p className={`text-xs text-center mt-2 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
							{settings.footerMessage}
						</p>
					)}
				</div>
			</div>
		</AuthenticatedLayout>
	);
}
