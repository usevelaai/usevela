"use client";

import { Lightbulb, MessageSquare, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useAgent } from "@/lib/agent-context";
import {
	type Conversation,
	type ConversationMessage,
	createQaSource,
	deleteConversation,
	getConversation,
	listConversations,
} from "@/lib/api";

import { cn } from "@/lib/utils";

export default function HistoryPage() {
	const { currentAgent, isLoading: agentLoading } = useAgent();
	const [conversations, setConversations] = useState<Conversation[]>([]);
	const [loading, setLoading] = useState(true);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(null);
	const [loadingConvo, setLoadingConvo] = useState(false);

	// Suggest response state
	const [suggestingFor, setSuggestingFor] = useState<{
		messageId: string;
		userQuestion: string;
	} | null>(null);
	const [suggestedAnswer, setSuggestedAnswer] = useState("");
	const [savingSuggestion, setSavingSuggestion] = useState(false);

	const fetchConversations = useCallback(async () => {
		if (!currentAgent) {
			setLoading(false);
			return;
		}
		setLoading(true);
		try {
			const data = await listConversations(currentAgent.id);
			setConversations(data);
		} catch (err) {
			console.error("Failed to fetch conversations:", err);
		} finally {
			setLoading(false);
		}
	}, [currentAgent]);

	useEffect(() => {
		if (!agentLoading && currentAgent) {
			fetchConversations();
		} else if (!agentLoading && !currentAgent) {
			setLoading(false);
		}
	}, [agentLoading, currentAgent, fetchConversations]);

	const handleSelect = async (id: string) => {
		setSelectedId(id);
		setLoadingConvo(true);
		try {
			const convo = await getConversation(id);
			setSelectedConvo(convo);
		} catch (err) {
			console.error("Failed to load conversation:", err);
		} finally {
			setLoadingConvo(false);
		}
	};

	const handleDelete = async (id: string) => {
		if (!confirm("Delete this conversation?")) return;

		try {
			await deleteConversation(id);
			if (selectedId === id) {
				setSelectedId(null);
				setSelectedConvo(null);
			}
			await fetchConversations();
		} catch (err) {
			console.error("Failed to delete:", err);
		}
	};

	// Find the user message before an assistant message
	const findUserQuestion = (messageId: string): string | null => {
		if (!selectedConvo?.messages) return null;
		const msgIndex = selectedConvo.messages.findIndex((m) => m.id === messageId);
		if (msgIndex <= 0) return null;
		const prevMsg = selectedConvo.messages[msgIndex - 1];
		return prevMsg.role === "user" ? prevMsg.content : null;
	};

	const handleSuggestResponse = (msg: ConversationMessage) => {
		const userQuestion = findUserQuestion(msg.id);
		if (!userQuestion) return;
		setSuggestingFor({ messageId: msg.id, userQuestion });
		setSuggestedAnswer("");
	};

	const handleCancelSuggestion = () => {
		setSuggestingFor(null);
		setSuggestedAnswer("");
	};

	const handleSaveSuggestion = async () => {
		if (!currentAgent || !suggestingFor || !suggestedAnswer.trim()) return;

		setSavingSuggestion(true);
		try {
			await createQaSource(currentAgent.id, [suggestingFor.userQuestion], suggestedAnswer.trim());
			toast.success("Q&A saved successfully!");
			setSuggestingFor(null);
			setSuggestedAnswer("");
		} catch (err) {
			console.error("Failed to save Q&A:", err);
			toast.error("Failed to save Q&A");
		} finally {
			setSavingSuggestion(false);
		}
	};

	const renderConversationList = () => {
		if (loading) {
			return <p className="p-4 text-gray-500">Loading...</p>;
		}

		if (conversations.length === 0) {
			return (
				<Empty className="my-8">
					<EmptyContent>
						<EmptyMedia variant="icon">
							<MessageSquare />
						</EmptyMedia>
						<EmptyTitle>No conversations yet</EmptyTitle>
						<EmptyDescription>
							Start a new chat to see your conversation history here.
						</EmptyDescription>
					</EmptyContent>
				</Empty>
			);
		}

		return conversations.map((convo) => (
			<button
				type="button"
				key={convo.id}
				className={cn(
					"w-full text-left p-3 px-4 border-b cursor-pointer hover:bg-gray-50 transition-colors",
					selectedId === convo.id && "bg-gray-100",
				)}
				onClick={() => handleSelect(convo.id)}
			>
				<p className="m-0 text-sm font-medium">{convo.title || "Untitled"}</p>
				<p className="mt-1 text-xs text-gray-500">
					{new Date(convo.updatedAt).toLocaleString()}
				</p>
			</button>
		));
	};

	const renderConversationDetail = () => {
		if (!selectedConvo) {
			return (
				<Empty className="h-full">
					<EmptyContent>
						<EmptyMedia variant="icon">
							<MessageSquare />
						</EmptyMedia>
						<EmptyTitle>Select a conversation</EmptyTitle>
						<EmptyDescription>
							Choose a conversation from the list to view its messages.
						</EmptyDescription>
					</EmptyContent>
				</Empty>
			);
		}

		return (
			<>
				<div className="flex items-center justify-between p-4 border-b">
					<h2 className="m-0 text-base font-semibold">{selectedConvo.title || "Untitled"}</h2>
					<Button
						variant="destructive"
						size="sm"
						onClick={() => handleDelete(selectedConvo.id)}
					>
						Delete
					</Button>
				</div>
				<ScrollArea className="flex-1 p-4">
					{loadingConvo ? (
						<p className="text-gray-500">Loading...</p>
					) : (
						selectedConvo.messages?.map((msg, idx) => (
							<div
								key={msg.id}
								className={cn(
									"mb-4 group relative",
									msg.role === "user" ? "flex justify-end" : "",
								)}
							>
								<div
									className={cn(
										"p-3 px-4 rounded-lg max-w-[80%] whitespace-pre-wrap",
										msg.role === "user"
											? "bg-blue-600 text-white"
											: "bg-gray-100 text-gray-900",
									)}
								>
									{msg.content}
								</div>

								{/* Suggest Response button for assistant messages */}
								{msg.role === "assistant" && idx > 0 && (
									<Button
										variant="ghost"
										size="sm"
										className="absolute transition-opacity -translate-y-1/2 opacity-0 -right-2 top-1/2 group-hover:opacity-100"
										onClick={() => handleSuggestResponse(msg)}
										title="Suggest a better response"
									>
										<Lightbulb className="w-4 h-4 text-yellow-500" />
									</Button>
								)}

								{/* Suggest Response Form */}
								{suggestingFor?.messageId === msg.id && (
									<div className="absolute left-0 right-0 z-10 p-4 mt-2 bg-white border rounded-lg shadow-lg top-full">
										<div className="flex items-center justify-between mb-3">
											<h4 className="text-sm font-medium">Suggest a better response</h4>
											<Button
												variant="ghost"
												size="icon"
												className="w-6 h-6"
												onClick={handleCancelSuggestion}
											>
												<X className="w-4 h-4" />
											</Button>
										</div>
										<p className="mb-2 text-xs text-muted-foreground">
											Question: {suggestingFor.userQuestion}
										</p>
										<Textarea
											placeholder="Enter a better answer..."
											value={suggestedAnswer}
											onChange={(e) => setSuggestedAnswer(e.target.value)}
											className="min-h-[100px] mb-3"
										/>
										<div className="flex justify-end gap-2">
											<Button variant="outline" size="sm" onClick={handleCancelSuggestion}>
												Cancel
											</Button>
											<Button
												size="sm"
												onClick={handleSaveSuggestion}
												disabled={savingSuggestion || !suggestedAnswer.trim()}
											>
												{savingSuggestion ? "Saving..." : "Save as Q&A"}
											</Button>
										</div>
									</div>
								)}
							</div>
						))
					)}
				</ScrollArea>
			</>
		);
	};

	return (
		<AuthenticatedLayout>
			<div className="flex h-screen max-w-screen-xl">
				<div className="flex flex-col border-r w-80">
					<ScrollArea className="flex-1">
						{renderConversationList()}
					</ScrollArea>
				</div>

				<div className="flex flex-col flex-1 overflow-hidden">
					{renderConversationDetail()}
				</div>
			</div>
		</AuthenticatedLayout>
	);
}
