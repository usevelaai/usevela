export interface ApiResponse<T = unknown> {
	success: boolean;
	data?: T;
	error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
	total: number;
	page: number;
	limit: number;
}

export interface UserDto {
	id: string;
	email: string;
	name: string | null;
	createdAt: Date;
}

// ChatKit protocol types
export type MessageRole = "user" | "assistant";

export interface ChatMessage {
	role: MessageRole;
	content: string;
}

export interface ChatRequest {
	messages: ChatMessage[];
	threadId?: string;
}

// SSE event types for ChatKit
export type StreamEventType =
	| "message_start"
	| "content_block_start"
	| "content_block_delta"
	| "content_block_stop"
	| "message_stop"
	| "error";

export interface StreamEvent {
	type: StreamEventType;
	data: unknown;
}

export interface MessageStartEvent {
	type: "message_start";
	message: {
		id: string;
		role: "assistant";
	};
}

export interface ContentBlockDeltaEvent {
	type: "content_block_delta";
	index: number;
	delta: {
		type: "text_delta";
		text: string;
	};
}

export interface MessageStopEvent {
	type: "message_stop";
}

export interface ErrorEvent {
	type: "error";
	error: {
		message: string;
	};
}

export interface VectorSearchResult {
	id: string;
	content: string;
	score: number;
	metadata?: Record<string, unknown>;
}

// Document types
export interface DocumentDto {
	id: string;
	filename: string;
	mimeType: string;
	size: number;
	createdAt: Date;
}

export interface DocumentUploadResponse {
	id: string;
	filename: string;
	chunks: number;
	createdAt: Date;
}

export type SupportedMimeType =
	| "application/pdf"
	| "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
	| "text/plain";
