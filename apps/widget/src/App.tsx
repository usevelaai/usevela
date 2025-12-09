import { useCallback, useEffect, useRef, useState } from "react";

interface Message {
	id: string;
	role: "user" | "assistant";
	content: string;
}

interface InterfaceSettings {
	theme: "light" | "dark";
	primaryColor: string;
	chatBubbleColor: string;
	displayName: string;
	profilePicture: string | null;
	initialMessage: string | null;
	suggestedMessages: string[];
	messagePlaceholder: string | null;
	footerMessage: string | null;
	dismissibleMessage: string | null;
}

interface WidgetConfig {
	settings: InterfaceSettings;
	apiUrl: string;
	agentId: string;
}

// Default settings used when no config is provided
const DEFAULT_SETTINGS: InterfaceSettings = {
	theme: "light",
	primaryColor: "#3b82f6",
	chatBubbleColor: "#3b82f6",
	displayName: "Assistant",
	profilePicture: null,
	initialMessage: null,
	suggestedMessages: [],
	messagePlaceholder: null,
	footerMessage: null,
	dismissibleMessage: null,
};

// Parse config from URL hash (passed by embed script via window.__vela_config)
function getConfigFromHash(): WidgetConfig {
	try {
		const hash = window.location.hash;
		if (!hash.startsWith("#config=")) {
			return { settings: DEFAULT_SETTINGS, apiUrl: "http://localhost:3001", agentId: "" };
		}
		const configStr = decodeURIComponent(hash.slice(8));
		const config = JSON.parse(configStr);
		return {
			settings: {
				theme: config.theme || DEFAULT_SETTINGS.theme,
				primaryColor: config.primaryColor || DEFAULT_SETTINGS.primaryColor,
				chatBubbleColor: config.chatBubbleColor || DEFAULT_SETTINGS.chatBubbleColor,
				displayName: config.displayName || DEFAULT_SETTINGS.displayName,
				profilePicture: config.profilePicture ?? DEFAULT_SETTINGS.profilePicture,
				initialMessage: config.initialMessage ?? DEFAULT_SETTINGS.initialMessage,
				suggestedMessages: config.suggestedMessages || DEFAULT_SETTINGS.suggestedMessages,
				messagePlaceholder: config.messagePlaceholder ?? DEFAULT_SETTINGS.messagePlaceholder,
				footerMessage: config.footerMessage ?? DEFAULT_SETTINGS.footerMessage,
				dismissibleMessage: config.dismissibleMessage ?? DEFAULT_SETTINGS.dismissibleMessage,
			},
			apiUrl: config.apiUrl || "http://localhost:3001",
			agentId: config.agentId || "",
		};
	} catch {
		return { settings: DEFAULT_SETTINGS, apiUrl: "http://localhost:3001", agentId: "" };
	}
}

const widgetConfig = getConfigFromHash();
const API_BASE = widgetConfig.apiUrl;
// Agent ID can be used for multi-agent support in the future
export const AGENT_ID = widgetConfig.agentId;

function App() {
	const [messages, setMessages] = useState<Message[]>([]);
	const [input, setInput] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	// Settings come from URL hash - no API call needed
	const [settings] = useState<InterfaceSettings>(widgetConfig.settings);
	const [showInitialMessage, setShowInitialMessage] = useState(true);
	const [showDismissibleBanner, setShowDismissibleBanner] = useState(true);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const streamContentRef = useRef("");

	// Notify parent of primary color on mount
	useEffect(() => {
		window.parent.postMessage(
			{ type: "vela:style", data: { primaryColor: settings.primaryColor } },
			"*",
		);
	}, [settings.primaryColor]);

	// Scroll to bottom on new messages
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, []);

	const sendMessage = useCallback(
		async (messageContent?: string) => {
			const content = messageContent || input.trim();
			if (!content || isLoading) return;

			setShowInitialMessage(false);

			const userMessage: Message = {
				id: crypto.randomUUID(),
				role: "user",
				content,
			};

			setMessages((prev) => [...prev, userMessage]);
			setInput("");
			setIsLoading(true);

			const assistantMessageId = crypto.randomUUID();
			const assistantMessage: Message = {
				id: assistantMessageId,
				role: "assistant",
				content: "",
			};

			setMessages((prev) => [...prev, assistantMessage]);
			streamContentRef.current = "";

			try {
				const response = await fetch(`${API_BASE}/chat`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						messages: [...messages, userMessage].map((m) => ({
							role: m.role,
							content: m.content,
						})),
						agentId: AGENT_ID,
					}),
				});

				if (!response.ok) {
					throw new Error("Failed to send message");
				}

				const reader = response.body?.getReader();
				const decoder = new TextDecoder();

				if (!reader) throw new Error("No response body");

				let buffer = "";

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
								if (data.type === "content_block_delta" && data.delta?.text) {
									streamContentRef.current += data.delta.text;
									const newContent = streamContentRef.current;
									setMessages((prev) => {
										const lastIndex = prev.findIndex((m) => m.id === assistantMessageId);
										if (lastIndex === -1) return prev;
										const updated = [...prev];
										updated[lastIndex] = {
											...updated[lastIndex],
											content: newContent,
										};
										return updated;
									});
								}
							} catch {
								// Skip invalid JSON
							}
						}
					}
				}
			} catch (err) {
				console.error(err);
				setMessages((prev) => {
					const updated = [...prev];
					const last = updated[updated.length - 1];
					if (last.role === "assistant") {
						last.content = "Sorry, something went wrong. Please try again.";
					}
					return updated;
				});
			} finally {
				setIsLoading(false);
			}
		},
		[input, isLoading, messages],
	);

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			sendMessage();
		}
	};

	const isDark = settings?.theme === "dark";
	const bgClass = isDark ? "bg-gray-900" : "bg-white";
	const textClass = isDark ? "text-gray-100" : "text-gray-800";
	const borderClass = isDark ? "border-gray-700" : "border-gray-200";
	const inputBgClass = isDark ? "bg-gray-800" : "bg-gray-50";
	const assistantBubbleClass = isDark ? "bg-gray-800 text-gray-100" : "bg-gray-100 text-gray-800";

	const userBubbleStyle = {
		backgroundColor: settings?.chatBubbleColor || "#3b82f6",
		color: "white",
	};

	return (
		<div className={`flex flex-col h-screen ${bgClass} ${textClass}`}>
			{/* Header */}
			<div
				className={`flex items-center gap-3 p-4 border-b ${borderClass}`}
				style={{ backgroundColor: settings?.primaryColor || "#3b82f6" }}
			>
				{settings?.profilePicture ? (
					<img
						src={settings.profilePicture}
						alt={settings.displayName || "Assistant"}
						className="object-cover w-10 h-10 rounded-full"
					/>
				) : (
					<div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20">
						<svg
							className="w-5 h-5 text-white"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
							/>
						</svg>
					</div>
				)}
				<div className="text-white">
					<p className="font-medium">{settings?.displayName || "AI Assistant"}</p>
					<p className="text-sm opacity-80">Online</p>
				</div>
			</div>

			{/* Messages */}
			<div className="flex-1 p-4 space-y-4 overflow-y-auto">
				{messages.length === 0 && showInitialMessage ? (
					<div className="space-y-4">
						{/* Initial message */}
						{settings?.initialMessage && (
							<div className="flex items-start gap-2">
								{settings?.profilePicture ? (
									<img
										src={settings.profilePicture}
										alt=""
										className="flex-shrink-0 object-cover w-8 h-8 rounded-full"
									/>
								) : (
									<div
										className="flex items-center justify-center flex-shrink-0 w-8 h-8 text-white rounded-full"
										style={{
											backgroundColor: settings?.primaryColor || "#3b82f6",
										}}
									>
										<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
											/>
										</svg>
									</div>
								)}
								<div className={`px-4 py-3 rounded-lg ${assistantBubbleClass}`}>
									{settings.initialMessage}
								</div>
							</div>
						)}

						{/* Suggested messages */}
						{settings?.suggestedMessages && settings.suggestedMessages.length > 0 && (
							<div className="flex flex-wrap gap-2 mt-4">
								{settings.suggestedMessages.map((msg, i) => (
									<button
										key={i}
										onClick={() => sendMessage(msg)}
										className={`px-3 py-2 rounded-lg border text-sm transition-colors ${borderClass} ${isDark ? "hover:bg-gray-800" : "hover:bg-gray-50"}`}
										disabled={isLoading}
									>
										{msg}
									</button>
								))}
							</div>
						)}
					</div>
				) : (
					messages.map((msg) => (
						<div
							key={msg.id}
							className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
						>
							{msg.role === "assistant" && (
								<div className="flex items-start gap-2">
									{settings?.profilePicture ? (
										<img
											src={settings.profilePicture}
											alt=""
											className="flex-shrink-0 object-cover w-8 h-8 rounded-full"
										/>
									) : (
										<div
											className="flex items-center justify-center flex-shrink-0 w-8 h-8 text-white rounded-full"
											style={{
												backgroundColor: settings?.primaryColor || "#3b82f6",
											}}
										>
											<svg
												className="w-4 h-4"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
												/>
											</svg>
										</div>
									)}
									<div
										className={`px-4 py-3 rounded-lg max-w-[80%] whitespace-pre-wrap ${assistantBubbleClass}`}
									>
										{msg.content || (isLoading ? "..." : "")}
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
					))
				)}
				<div ref={messagesEndRef} />
			</div>

			{/* Input */}
			<div className={`p-4 border-t ${borderClass}`}>
				{/* Dismissible Banner */}
				{showDismissibleBanner && settings?.dismissibleMessage && (
					<div className={`mb-3 p-3 rounded-lg ${isDark ? 'bg-blue-900/30 text-blue-200' : 'bg-blue-50 text-blue-800'} flex items-start gap-2`}>
						<span className="flex-1 text-sm">{settings.dismissibleMessage}</span>
						<button
							type="button"
							onClick={() => setShowDismissibleBanner(false)}
							className={`shrink-0 p-1 rounded hover:${isDark ? 'bg-blue-800/50' : 'bg-blue-100'} transition-colors`}
							aria-label="Dismiss"
						>
							<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					</div>
				)}
				<div className="flex gap-2">
					<input
						type="text"
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder={settings?.messagePlaceholder || "Type a message..."}
						className={`flex-1 px-4 py-2 rounded-lg border ${borderClass} ${inputBgClass} focus:outline-none focus:ring-2 focus:ring-blue-500`}
						disabled={isLoading}
					/>
					<button
						onClick={() => sendMessage()}
						disabled={isLoading}
						className="px-4 py-2 text-white transition-colors rounded-lg disabled:opacity-50"
						style={{ backgroundColor: settings?.primaryColor || "#3b82f6" }}
					>
						<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
							/>
						</svg>
					</button>
				</div>
				{settings?.footerMessage && (
					<p className={`text-xs text-center mt-2 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
						{settings.footerMessage}
					</p>
				)}
			</div>
		</div>
	);
}

export default App;
