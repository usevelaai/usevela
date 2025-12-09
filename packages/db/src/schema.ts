import {
	boolean,
	index,
	integer,
	json,
	pgTable,
	text,
	timestamp,
	uuid,
	vector,
} from "drizzle-orm/pg-core";

// BetterAuth tables
export const users = pgTable("users", {
	id: text("id").primaryKey(),
	email: text("email").notNull().unique(),
	name: text("name"),
	emailVerified: boolean("email_verified").notNull().default(false),
	image: text("image"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const sessions = pgTable("sessions", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	token: text("token").notNull().unique(),
	expiresAt: timestamp("expires_at").notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Session = typeof sessions.$inferSelect;

export const accounts = pgTable("accounts", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at"),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
	scope: text("scope"),
	password: text("password"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Account = typeof accounts.$inferSelect;

export const verifications = pgTable("verifications", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: timestamp("expires_at").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// AI Agents configuration - must be defined before tables that reference it
export const agents = pgTable("agents", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	slug: text("slug").notNull(), // URL-friendly identifier
	model: text("model").notNull().default("claude-sonnet-4-20250514"),
	temperature: integer("temperature").notNull().default(50), // 0-100 stored as int, divided by 100 for API
	systemPrompt: text("system_prompt").notNull().default("You are a helpful assistant."),
	isDefault: boolean("is_default").notNull().default(false),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;

// Agent Tools - function/tool definitions for each agent
export const agentTools = pgTable(
	"agent_tools",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		agentId: uuid("agent_id")
			.notNull()
			.references(() => agents.id, { onDelete: "cascade" }),

		// Tool definition
		name: text("name").notNull(), // e.g., "get_weather"
		description: text("description").notNull(), // What the tool does
		inputSchema: json("input_schema")
			.$type<{
				type: "object";
				properties: Record<
					string,
					{
						type: string;
						description?: string;
						enum?: string[];
					}
				>;
				required?: string[];
			}>()
			.notNull(),

		// Execution config
		executionType: text("execution_type").notNull().default("mock"), // "mock" | "http"
		httpUrl: text("http_url"), // URL to call for HTTP type
		httpMethod: text("http_method"), // "GET" | "POST"
		httpHeaders: json("http_headers").$type<Record<string, string>>(), // Headers as key-value
		mockResponse: text("mock_response"), // Static response for mock type

		isEnabled: boolean("is_enabled").notNull().default(true),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [index("agent_tools_agent_idx").on(table.agentId)],
);

export type AgentTool = typeof agentTools.$inferSelect;
export type NewAgentTool = typeof agentTools.$inferInsert;

// Marketplace Tool Templates - pre-configured tools users can install
export const toolTemplates = pgTable("tool_templates", {
	id: uuid("id").primaryKey().defaultRandom(),
	slug: text("slug").notNull().unique(), // URL-friendly identifier

	// Display info
	name: text("name").notNull(), // e.g., "Weather Lookup"
	description: text("description").notNull(), // User-facing description
	longDescription: text("long_description"), // Detailed description for marketplace
	category: text("category").notNull(), // "search" | "productivity" | "communication" | "data" | "ecommerce"
	icon: text("icon").notNull().default("wrench"), // Lucide icon name

	// Tool definition (same structure as agentTools)
	toolName: text("tool_name").notNull(), // e.g., "get_weather"
	toolDescription: text("tool_description").notNull(), // Description for the LLM
	inputSchema: json("input_schema")
		.$type<{
			type: "object";
			properties: Record<
				string,
				{
					type: string;
					description?: string;
					enum?: string[];
				}
			>;
			required?: string[];
		}>()
		.notNull(),

	// Execution config template
	executionType: text("execution_type").notNull().default("http"), // "mock" | "http"
	httpUrl: text("http_url"), // URL template with ${var} placeholders
	httpMethod: text("http_method").default("GET"),
	httpHeaders: json("http_headers").$type<Record<string, string>>(),
	mockResponse: text("mock_response"),

	// Configuration requirements - fields the user needs to provide
	requiredConfig:
		json("required_config").$type<
			Array<{
				key: string; // e.g., "api_key"
				label: string; // e.g., "API Key"
				type: "text" | "password" | "url"; // Input type
				placeholder?: string;
				helpText?: string;
				helpUrl?: string; // Link to get API key
			}>
		>(),

	// Metadata
	isActive: boolean("is_active").notNull().default(true),
	isFree: boolean("is_free").notNull().default(true), // Free vs requires paid API
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ToolTemplate = typeof toolTemplates.$inferSelect;
export type NewToolTemplate = typeof toolTemplates.$inferInsert;

export const documents = pgTable("documents", {
	id: uuid("id").primaryKey().defaultRandom(),
	agentId: uuid("agent_id")
		.notNull()
		.references(() => agents.id, { onDelete: "cascade" }),
	filename: text("filename").notNull(),
	mimeType: text("mime_type").notNull(),
	size: integer("size").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;

export const documentChunks = pgTable(
	"document_chunks",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		documentId: uuid("document_id")
			.notNull()
			.references(() => documents.id, { onDelete: "cascade" }),
		content: text("content").notNull(),
		chunkIndex: integer("chunk_index").notNull(),
		embedding: vector("embedding", { dimensions: 1024 }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [index("embedding_idx").using("hnsw", table.embedding.op("vector_cosine_ops"))],
);

export type DocumentChunk = typeof documentChunks.$inferSelect;
export type NewDocumentChunk = typeof documentChunks.$inferInsert;

// Text Sources for knowledge base
export const textSources = pgTable("text_sources", {
	id: uuid("id").primaryKey().defaultRandom(),
	agentId: uuid("agent_id")
		.notNull()
		.references(() => agents.id, { onDelete: "cascade" }),
	title: text("title").notNull(),
	content: text("content").notNull(), // HTML content
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type TextSource = typeof textSources.$inferSelect;
export type NewTextSource = typeof textSources.$inferInsert;

export const textSourceChunks = pgTable(
	"text_source_chunks",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		textSourceId: uuid("text_source_id")
			.notNull()
			.references(() => textSources.id, { onDelete: "cascade" }),
		content: text("content").notNull(),
		chunkIndex: integer("chunk_index").notNull(),
		embedding: vector("embedding", { dimensions: 1024 }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("text_source_embedding_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
	],
);

export type TextSourceChunk = typeof textSourceChunks.$inferSelect;
export type NewTextSourceChunk = typeof textSourceChunks.$inferInsert;

// Chat logs
export const conversations = pgTable("conversations", {
	id: uuid("id").primaryKey().defaultRandom(),
	agentId: uuid("agent_id")
		.notNull()
		.references(() => agents.id, { onDelete: "cascade" }),
	userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
	title: text("title"),
	countryCode: text("country_code"), // ISO 3166-1 alpha-2 from CF-IPCountry header
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;

export const chatMessages = pgTable("chat_messages", {
	id: uuid("id").primaryKey().defaultRandom(),
	conversationId: uuid("conversation_id")
		.notNull()
		.references(() => conversations.id, { onDelete: "cascade" }),
	role: text("role").notNull(), // "user" | "assistant"
	content: text("content").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;

// Interface settings (chat widget appearance) - one per agent
export const interfaceSettings = pgTable("interface_settings", {
	id: uuid("id").primaryKey().defaultRandom(),
	agentId: uuid("agent_id")
		.notNull()
		.unique()
		.references(() => agents.id, { onDelete: "cascade" }),
	// Theme
	theme: text("theme").notNull().default("light"), // "light" | "dark"
	primaryColor: text("primary_color").notNull().default("#3b82f6"),
	chatBubbleColor: text("chat_bubble_color").notNull().default("#3b82f6"),
	chatBubbleAlign: text("chat_bubble_align").notNull().default("right"), // "left" | "right"
	// Branding
	displayName: text("display_name").notNull().default("AI Assistant"),
	profilePicture: text("profile_picture"), // URL to uploaded image
	// Messages
	initialMessage: text("initial_message").default("Hello! How can I help you today?"),
	suggestedMessages: json("suggested_messages").$type<string[]>().default([]),
	messagePlaceholder: text("message_placeholder").default("Type a message..."),
	footerMessage: text("footer_message"),
	dismissibleMessage: text("dismissible_message"),
	welcomeBubbles: json("welcome_bubbles").$type<string[]>().default([]),
	// Features
	collectUserFeedback: boolean("collect_user_feedback").notNull().default(false),
	// Timestamps
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type InterfaceSettings = typeof interfaceSettings.$inferSelect;
export type NewInterfaceSettings = typeof interfaceSettings.$inferInsert;

// Usage tracking for billing
export const usageEvents = pgTable(
	"usage_events",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		eventType: text("event_type").notNull(), // "message"
		metadata: json("metadata").$type<Record<string, unknown>>(),
		billingPeriodStart: timestamp("billing_period_start").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("usage_user_period_idx").on(table.userId, table.billingPeriodStart, table.eventType),
	],
);

export type UsageEvent = typeof usageEvents.$inferSelect;
export type NewUsageEvent = typeof usageEvents.$inferInsert;

// User subscription info cache (synced from Polar)
export const userSubscriptions = pgTable("user_subscriptions", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: text("user_id")
		.notNull()
		.unique()
		.references(() => users.id, { onDelete: "cascade" }),
	planId: text("plan_id").notNull(), // "starter" | "growth" | "pro" | "free"
	polarSubscriptionId: text("polar_subscription_id"),
	billingPeriodStart: timestamp("billing_period_start").notNull(),
	billingPeriodEnd: timestamp("billing_period_end").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type NewUserSubscription = typeof userSubscriptions.$inferInsert;

// Q&A Knowledge Sources
export const qaSources = pgTable("qa_sources", {
	id: uuid("id").primaryKey().defaultRandom(),
	agentId: uuid("agent_id")
		.notNull()
		.references(() => agents.id, { onDelete: "cascade" }),
	questions: json("questions").$type<string[]>().notNull(), // Multiple trigger questions
	answer: text("answer").notNull(), // Can be HTML
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type QaSource = typeof qaSources.$inferSelect;
export type NewQaSource = typeof qaSources.$inferInsert;

// Q&A embeddings - one chunk per question for better matching
export const qaSourceChunks = pgTable(
	"qa_source_chunks",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		qaSourceId: uuid("qa_source_id")
			.notNull()
			.references(() => qaSources.id, { onDelete: "cascade" }),
		question: text("question").notNull(), // The specific question this embedding is for
		content: text("content").notNull(), // Combined "Q: question\nA: answer" for context
		chunkIndex: integer("chunk_index").notNull(),
		embedding: vector("embedding", { dimensions: 1024 }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("qa_source_embedding_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
	],
);

export type QaSourceChunk = typeof qaSourceChunks.$inferSelect;
export type NewQaSourceChunk = typeof qaSourceChunks.$inferInsert;

// Team Invitations
export const teamInvitations = pgTable(
	"team_invitations",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		inviterId: text("inviter_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		email: text("email").notNull(),
		token: text("token").notNull().unique(),
		role: text("role").notNull().default("member"), // "member" | "admin"
		status: text("status").notNull().default("pending"), // "pending" | "accepted" | "expired"
		expiresAt: timestamp("expires_at").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		acceptedAt: timestamp("accepted_at"),
	},
	(table) => [
		index("team_invitation_email_idx").on(table.email),
		index("team_invitation_token_idx").on(table.token),
	],
);

export type TeamInvitation = typeof teamInvitations.$inferSelect;
export type NewTeamInvitation = typeof teamInvitations.$inferInsert;

// Team Members - tracks which users belong to which team (owner's account)
export const teamMembers = pgTable(
	"team_members",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		ownerId: text("owner_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		memberId: text("member_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		role: text("role").notNull().default("member"), // "member" | "admin"
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("team_member_owner_idx").on(table.ownerId),
		index("team_member_member_idx").on(table.memberId),
	],
);

export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;

// Security Settings - rate limiting and allowed domains
export const securitySettings = pgTable("security_settings", {
	id: uuid("id").primaryKey().defaultRandom(),
	agentId: uuid("agent_id")
		.notNull()
		.unique()
		.references(() => agents.id, { onDelete: "cascade" }),
	// Rate limiting
	messageLimit: integer("message_limit").notNull().default(100), // max messages per window
	messageLimitWindow: integer("message_limit_window").notNull().default(60), // window in seconds
	// Domain restrictions
	allowedDomains: json("allowed_domains").$type<string[]>().default([]), // empty = allow all
	// Timestamps
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type SecuritySettings = typeof securitySettings.$inferSelect;
export type NewSecuritySettings = typeof securitySettings.$inferInsert;

// Message Feedback (thumbs up/down)
export const messageFeedback = pgTable(
	"message_feedback",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		messageId: uuid("message_id")
			.notNull()
			.references(() => chatMessages.id, { onDelete: "cascade" }),
		feedback: text("feedback").notNull(), // "up" | "down"
		sessionId: text("session_id"), // track anonymous widget users
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [index("message_feedback_message_idx").on(table.messageId)],
);

export type MessageFeedback = typeof messageFeedback.$inferSelect;
export type NewMessageFeedback = typeof messageFeedback.$inferInsert;

// Analytics daily rollups
export const analyticsDaily = pgTable(
	"analytics_daily",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		agentId: uuid("agent_id")
			.notNull()
			.references(() => agents.id, { onDelete: "cascade" }),
		date: timestamp("date").notNull(), // midnight UTC
		conversationCount: integer("conversation_count").notNull().default(0),
		messageCount: integer("message_count").notNull().default(0),
		thumbsUpCount: integer("thumbs_up_count").notNull().default(0),
		thumbsDownCount: integer("thumbs_down_count").notNull().default(0),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [index("analytics_daily_agent_date_idx").on(table.agentId, table.date)],
);

export type AnalyticsDaily = typeof analyticsDaily.$inferSelect;
export type NewAnalyticsDaily = typeof analyticsDaily.$inferInsert;

// Analytics country daily rollups
export const analyticsCountryDaily = pgTable(
	"analytics_country_daily",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		agentId: uuid("agent_id")
			.notNull()
			.references(() => agents.id, { onDelete: "cascade" }),
		date: timestamp("date").notNull(),
		countryCode: text("country_code").notNull(), // ISO 3166-1 alpha-2
		conversationCount: integer("conversation_count").notNull().default(0),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [index("analytics_country_idx").on(table.agentId, table.date, table.countryCode)],
);

export type AnalyticsCountryDaily = typeof analyticsCountryDaily.$inferSelect;
export type NewAnalyticsCountryDaily = typeof analyticsCountryDaily.$inferInsert;

// Tool Executions - raw events for tracking tool usage
export const toolExecutions = pgTable(
	"tool_executions",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		agentId: uuid("agent_id")
			.notNull()
			.references(() => agents.id, { onDelete: "cascade" }),
		toolId: uuid("tool_id").references(() => agentTools.id, { onDelete: "set null" }), // null if tool deleted
		toolName: text("tool_name").notNull(), // denormalized for analytics after deletion
		success: boolean("success").notNull(),
		errorMessage: text("error_message"),
		executionTimeMs: integer("execution_time_ms").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("tool_executions_agent_idx").on(table.agentId),
		index("tool_executions_created_idx").on(table.createdAt),
	],
);

export type ToolExecution = typeof toolExecutions.$inferSelect;
export type NewToolExecution = typeof toolExecutions.$inferInsert;

// Analytics tool daily rollups
export const analyticsToolDaily = pgTable(
	"analytics_tool_daily",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		agentId: uuid("agent_id")
			.notNull()
			.references(() => agents.id, { onDelete: "cascade" }),
		date: timestamp("date").notNull(), // midnight UTC
		toolName: text("tool_name").notNull(),
		executionCount: integer("execution_count").notNull().default(0),
		successCount: integer("success_count").notNull().default(0),
		failureCount: integer("failure_count").notNull().default(0),
		totalExecutionTimeMs: integer("total_execution_time_ms").notNull().default(0), // for computing avg
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [index("analytics_tool_daily_idx").on(table.agentId, table.date, table.toolName)],
);

export type AnalyticsToolDaily = typeof analyticsToolDaily.$inferSelect;
export type NewAnalyticsToolDaily = typeof analyticsToolDaily.$inferInsert;

// Web Sources - websites added for knowledge base
export const webSources = pgTable("web_sources", {
	id: uuid("id").primaryKey().defaultRandom(),
	agentId: uuid("agent_id")
		.notNull()
		.references(() => agents.id, { onDelete: "cascade" }),
	url: text("url").notNull(), // The source URL (individual page, sitemap, or crawl root)
	sourceType: text("source_type").notNull(), // "page" | "sitemap" | "crawl"
	name: text("name"), // Optional display name
	maxPages: integer("max_pages").default(100), // Max pages to crawl for sitemap/crawl types
	status: text("status").notNull().default("pending"), // "pending" | "crawling" | "completed" | "failed"
	lastCrawledAt: timestamp("last_crawled_at"),
	errorMessage: text("error_message"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type WebSource = typeof webSources.$inferSelect;
export type NewWebSource = typeof webSources.$inferInsert;

// Web Source Pages - individual pages crawled from a web source
export const webSourcePages = pgTable(
	"web_source_pages",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		webSourceId: uuid("web_source_id")
			.notNull()
			.references(() => webSources.id, { onDelete: "cascade" }),
		url: text("url").notNull(),
		title: text("title"),
		content: text("content"), // Extracted text content
		contentSize: integer("content_size").default(0), // Size in bytes
		status: text("status").notNull().default("pending"), // "pending" | "crawled" | "failed" | "excluded"
		errorMessage: text("error_message"),
		lastCrawledAt: timestamp("last_crawled_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [index("web_source_pages_source_idx").on(table.webSourceId)],
);

export type WebSourcePage = typeof webSourcePages.$inferSelect;
export type NewWebSourcePage = typeof webSourcePages.$inferInsert;

// Web Source Page Chunks - embeddings for RAG
export const webSourcePageChunks = pgTable(
	"web_source_page_chunks",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		webSourcePageId: uuid("web_source_page_id")
			.notNull()
			.references(() => webSourcePages.id, { onDelete: "cascade" }),
		content: text("content").notNull(),
		chunkIndex: integer("chunk_index").notNull(),
		embedding: vector("embedding", { dimensions: 1024 }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("web_source_page_chunks_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
	],
);

export type WebSourcePageChunk = typeof webSourcePageChunks.$inferSelect;
export type NewWebSourcePageChunk = typeof webSourcePageChunks.$inferInsert;
