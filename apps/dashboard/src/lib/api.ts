const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// ============ Config API ============

export interface AppConfig {
	selfHosted: boolean;
}

let cachedConfig: AppConfig | null = null;

export async function getConfig(): Promise<AppConfig> {
	if (cachedConfig) {
		return cachedConfig;
	}

	const response = await fetch(`${API_BASE}/config`, {
		credentials: "include",
	});

	if (!response.ok) {
		// Default to self-hosted if config fetch fails
		return { selfHosted: true };
	}

	cachedConfig = await response.json();
	return cachedConfig!;
}

// ============ Documents API ============

export async function uploadDocument(agentId: string, file: File) {
	const formData = new FormData();
	formData.append("file", file);
	formData.append("agentId", agentId);

	const response = await fetch(`${API_BASE}/documents`, {
		method: "POST",
		body: formData,
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Upload failed");
	}

	return response.json();
}

export async function listDocuments(agentId: string) {
	const response = await fetch(`${API_BASE}/documents?agentId=${agentId}`, {
		credentials: "include",
	});

	if (!response.ok) {
		throw new Error("Failed to fetch documents");
	}

	return response.json();
}

export async function deleteDocument(id: string) {
	const response = await fetch(`${API_BASE}/documents/${id}`, {
		method: "DELETE",
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Delete failed");
	}

	return response.json();
}

// ============ Text Sources API ============

export interface TextSource {
	id: string;
	agentId: string;
	title: string;
	content?: string;
	createdAt: string;
	updatedAt: string;
}

export async function createTextSource(agentId: string, title: string, content: string) {
	const response = await fetch(`${API_BASE}/text-sources`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ agentId, title, content }),
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Create failed");
	}

	return response.json();
}

export async function listTextSources(agentId: string): Promise<TextSource[]> {
	const response = await fetch(`${API_BASE}/text-sources?agentId=${agentId}`, {
		credentials: "include",
	});

	if (!response.ok) {
		throw new Error("Failed to fetch text sources");
	}

	return response.json();
}

export async function getTextSource(id: string): Promise<TextSource> {
	const response = await fetch(`${API_BASE}/text-sources/${id}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Not found");
	}

	return response.json();
}

export async function updateTextSource(id: string, title: string, content: string) {
	const response = await fetch(`${API_BASE}/text-sources/${id}`, {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ title, content }),
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Update failed");
	}

	return response.json();
}

export async function deleteTextSource(id: string) {
	const response = await fetch(`${API_BASE}/text-sources/${id}`, {
		method: "DELETE",
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Delete failed");
	}

	return response.json();
}

// ============ Q&A Sources API ============

export interface QaSource {
	id: string;
	agentId: string;
	questions: string[];
	answer: string;
	createdAt: string;
	updatedAt: string;
}

export async function createQaSource(agentId: string, questions: string[], answer: string) {
	const response = await fetch(`${API_BASE}/qa-sources`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ agentId, questions, answer }),
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Create failed");
	}

	return response.json();
}

export async function listQaSources(agentId: string): Promise<QaSource[]> {
	const response = await fetch(`${API_BASE}/qa-sources?agentId=${agentId}`, {
		credentials: "include",
	});

	if (!response.ok) {
		throw new Error("Failed to fetch Q&A sources");
	}

	return response.json();
}

export async function getQaSource(id: string): Promise<QaSource> {
	const response = await fetch(`${API_BASE}/qa-sources/${id}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Not found");
	}

	return response.json();
}

export async function updateQaSource(id: string, questions: string[], answer: string) {
	const response = await fetch(`${API_BASE}/qa-sources/${id}`, {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ questions, answer }),
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Update failed");
	}

	return response.json();
}

export async function deleteQaSource(id: string) {
	const response = await fetch(`${API_BASE}/qa-sources/${id}`, {
		method: "DELETE",
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Delete failed");
	}

	return response.json();
}

// ============ Conversations API ============

export interface ConversationMessage {
	id: string;
	conversationId: string;
	role: "user" | "assistant";
	content: string;
	createdAt: string;
}

export interface Conversation {
	id: string;
	agentId: string;
	userId?: string;
	title?: string;
	createdAt: string;
	updatedAt: string;
	messages?: ConversationMessage[];
}

export async function listConversations(agentId: string): Promise<Conversation[]> {
	const response = await fetch(`${API_BASE}/conversations?agentId=${agentId}`, {
		credentials: "include",
	});

	if (!response.ok) {
		throw new Error("Failed to fetch conversations");
	}

	return response.json();
}

export async function getConversation(id: string): Promise<Conversation> {
	const response = await fetch(`${API_BASE}/conversations/${id}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Not found");
	}

	return response.json();
}

export async function deleteConversation(id: string) {
	const response = await fetch(`${API_BASE}/conversations/${id}`, {
		method: "DELETE",
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Delete failed");
	}

	return response.json();
}

// ============ Agents API ============

export interface Agent {
	id: string;
	userId: string;
	name: string;
	slug: string;
	model: string;
	temperature: number;
	systemPrompt: string;
	isDefault: boolean;
	createdAt: string;
	updatedAt: string;
}

export async function listAgents(): Promise<Agent[]> {
	const response = await fetch(`${API_BASE}/agents`, {
		credentials: "include",
	});

	if (!response.ok) {
		throw new Error("Failed to fetch agents");
	}

	return response.json();
}

export async function getAgent(id: string): Promise<Agent> {
	const response = await fetch(`${API_BASE}/agents/${id}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Not found");
	}

	return response.json();
}

export async function getDefaultAgent(): Promise<Agent> {
	const response = await fetch(`${API_BASE}/agents/default/config`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Not found");
	}

	return response.json();
}

export async function getSupportedModels(): Promise<string[]> {
	const response = await fetch(`${API_BASE}/agents/models`, {
		credentials: "include",
	});

	if (!response.ok) {
		throw new Error("Failed to fetch models");
	}

	return response.json();
}

export async function createAgent(data: {
	name: string;
	model: string;
	temperature: number;
	systemPrompt: string;
	isDefault?: boolean;
}): Promise<Agent> {
	const response = await fetch(`${API_BASE}/agents`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Create failed");
	}

	return response.json();
}

export async function updateAgent(
	id: string,
	data: Partial<{
		name: string;
		model: string;
		temperature: number;
		systemPrompt: string;
		isDefault: boolean;
	}>,
): Promise<Agent> {
	const response = await fetch(`${API_BASE}/agents/${id}`, {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Update failed");
	}

	return response.json();
}

export async function deleteAgent(id: string) {
	const response = await fetch(`${API_BASE}/agents/${id}`, {
		method: "DELETE",
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Delete failed");
	}

	return response.json();
}

export interface AgentLimits {
	current: number;
	limit: number | null;
	planId: string;
	canCreate: boolean;
}

export async function getAgentLimits(): Promise<AgentLimits> {
	const response = await fetch(`${API_BASE}/agents/limits`, {
		credentials: "include",
	});

	if (!response.ok) {
		throw new Error("Failed to fetch agent limits");
	}

	return response.json();
}

// ============ Interface Settings API ============

export interface InterfaceSettings {
	id: string;
	agentId: string;
	theme: "light" | "dark";
	primaryColor: string;
	chatBubbleColor: string;
	chatBubbleAlign: "left" | "right";
	displayName: string;
	profilePicture: string | null;
	initialMessage: string | null;
	suggestedMessages: string[];
	messagePlaceholder: string | null;
	footerMessage: string | null;
	dismissibleMessage: string | null;
	welcomeBubbles: string[];
	collectUserFeedback: boolean;
	createdAt: string;
	updatedAt: string;
}

export async function getInterfaceSettings(agentId: string): Promise<InterfaceSettings> {
	const response = await fetch(`${API_BASE}/interface-settings/${agentId}`, {
		credentials: "include",
	});

	if (!response.ok) {
		throw new Error("Failed to fetch interface settings");
	}

	return response.json();
}

export async function updateInterfaceSettings(
	agentId: string,
	data: Partial<Omit<InterfaceSettings, "id" | "agentId" | "createdAt" | "updatedAt">>,
): Promise<InterfaceSettings> {
	const response = await fetch(`${API_BASE}/interface-settings/${agentId}`, {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Update failed");
	}

	return response.json();
}

export async function uploadProfilePicture(agentId: string, file: File): Promise<{ url: string }> {
	const formData = new FormData();
	formData.append("file", file);

	const response = await fetch(`${API_BASE}/interface-settings/${agentId}/profile-picture`, {
		method: "POST",
		body: formData,
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Upload failed");
	}

	return response.json();
}

export async function deleteProfilePicture(agentId: string): Promise<void> {
	const response = await fetch(`${API_BASE}/interface-settings/${agentId}/profile-picture`, {
		method: "DELETE",
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Delete failed");
	}
}

// ============ Security Settings API ============

export interface SecuritySettings {
	id: string;
	agentId: string;
	messageLimit: number;
	messageLimitWindow: number;
	allowedDomains: string[];
	createdAt: string;
	updatedAt: string;
}

export async function getSecuritySettings(agentId: string): Promise<SecuritySettings> {
	const response = await fetch(`${API_BASE}/security-settings/${agentId}`, {
		credentials: "include",
	});

	if (!response.ok) {
		throw new Error("Failed to fetch security settings");
	}

	return response.json();
}

export async function updateSecuritySettings(
	agentId: string,
	data: Partial<Omit<SecuritySettings, "id" | "agentId" | "createdAt" | "updatedAt">>,
): Promise<SecuritySettings> {
	const response = await fetch(`${API_BASE}/security-settings/${agentId}`, {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Update failed");
	}

	return response.json();
}

// ============ Usage API ============

export interface UsageData {
	used: number;
	limit: number;
	remaining: number;
	planId: string;
	planName: string;
	percentUsed: number;
	billingPeriodStart: string;
	billingPeriodEnd: string;
}

export interface CanSendResult {
	allowed: boolean;
	reason?: string;
	remaining?: number;
}

export async function getUsage(): Promise<UsageData> {
	const response = await fetch(`${API_BASE}/usage`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch usage");
	}

	return response.json();
}

export async function canSendMessage(): Promise<CanSendResult> {
	const response = await fetch(`${API_BASE}/usage/can-send`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to check send permission");
	}

	return response.json();
}

// ============ Team API ============

export interface TeamMember {
	id: string;
	memberId: string;
	role: string;
	createdAt: string;
	email: string;
	name: string | null;
}

export interface TeamInvitation {
	id: string;
	email: string;
	role: string;
	status: string;
	expiresAt: string;
	createdAt: string;
}

export interface InvitationInfo {
	id: string;
	email: string;
	role: string;
	status: string;
	expiresAt: string;
	inviterName: string | null;
	inviterEmail: string;
}

export async function getTeamMembers(): Promise<TeamMember[]> {
	const response = await fetch(`${API_BASE}/team/members`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch team members");
	}

	return response.json();
}

export async function getTeamInvitations(): Promise<TeamInvitation[]> {
	const response = await fetch(`${API_BASE}/team/invitations`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch invitations");
	}

	return response.json();
}

export async function sendTeamInvitation(
	email: string,
	role: string = "member",
): Promise<{ invitation: TeamInvitation; inviteUrl: string; message: string }> {
	const response = await fetch(`${API_BASE}/team/invite`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email, role }),
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to send invitation");
	}

	return response.json();
}

export async function cancelTeamInvitation(id: string): Promise<void> {
	const response = await fetch(`${API_BASE}/team/invitations/${id}`, {
		method: "DELETE",
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to cancel invitation");
	}
}

export async function removeTeamMember(id: string): Promise<void> {
	const response = await fetch(`${API_BASE}/team/members/${id}`, {
		method: "DELETE",
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to remove team member");
	}
}

export async function getInvitationInfo(token: string): Promise<InvitationInfo> {
	const response = await fetch(`${API_BASE}/team/invitation/${token}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Invalid invitation");
	}

	return response.json();
}

export async function acceptTeamInvitation(token: string): Promise<void> {
	const response = await fetch(`${API_BASE}/team/accept/${token}`, {
		method: "POST",
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to accept invitation");
	}
}

// ============ Analytics API ============

export interface AnalyticsSummary {
	totalConversations: number;
	totalMessages: number;
	avgMessagesPerConversation: number;
	thumbsUp: number;
	thumbsDown: number;
	feedbackRatio: number;
}

export interface AnalyticsDailyData {
	date: string;
	conversations: number;
	messages: number;
	thumbsUp: number;
	thumbsDown: number;
}

export interface AnalyticsCountryData {
	countryCode: string;
	conversationCount: number;
}

export async function getAnalyticsSummary(
	agentId: string,
	startDate?: string,
	endDate?: string,
): Promise<AnalyticsSummary> {
	const params = new URLSearchParams({ agentId });
	if (startDate) params.append("startDate", startDate);
	if (endDate) params.append("endDate", endDate);

	const response = await fetch(`${API_BASE}/analytics/summary?${params}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch analytics summary");
	}

	return response.json();
}

export async function getAnalyticsDaily(
	agentId: string,
	startDate?: string,
	endDate?: string,
): Promise<AnalyticsDailyData[]> {
	const params = new URLSearchParams({ agentId });
	if (startDate) params.append("startDate", startDate);
	if (endDate) params.append("endDate", endDate);

	const response = await fetch(`${API_BASE}/analytics/daily?${params}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch daily analytics");
	}

	return response.json();
}

export async function getAnalyticsCountries(
	agentId: string,
	startDate?: string,
	endDate?: string,
): Promise<AnalyticsCountryData[]> {
	const params = new URLSearchParams({ agentId });
	if (startDate) params.append("startDate", startDate);
	if (endDate) params.append("endDate", endDate);

	const response = await fetch(`${API_BASE}/analytics/countries?${params}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch country analytics");
	}

	return response.json();
}

export interface AnalyticsToolData {
	toolName: string;
	executionCount: number;
	successCount: number;
	failureCount: number;
	successRate: number;
	avgExecutionTimeMs: number;
}

export async function getAnalyticsTools(
	agentId: string,
	startDate?: string,
	endDate?: string,
): Promise<AnalyticsToolData[]> {
	const params = new URLSearchParams({ agentId });
	if (startDate) params.append("startDate", startDate);
	if (endDate) params.append("endDate", endDate);

	const response = await fetch(`${API_BASE}/analytics/tools?${params}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch tool analytics");
	}

	return response.json();
}

// ============ Feedback API ============

export async function submitFeedback(
	messageId: string,
	feedback: "up" | "down",
	sessionId?: string,
): Promise<{ success: boolean; updated: boolean }> {
	const response = await fetch(`${API_BASE}/feedback`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ messageId, feedback, sessionId }),
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to submit feedback");
	}

	return response.json();
}

// ============ Agent Tools API ============

export interface ToolInputSchema {
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
}

export interface AgentTool {
	id: string;
	agentId: string;
	name: string;
	description: string;
	inputSchema: ToolInputSchema;
	executionType: "mock" | "http";
	httpUrl?: string | null;
	httpMethod?: string | null;
	httpHeaders?: Record<string, string> | null;
	mockResponse?: string | null;
	isEnabled: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface CreateToolData {
	agentId: string;
	name: string;
	description: string;
	inputSchema: ToolInputSchema;
	executionType: "mock" | "http";
	httpUrl?: string | null;
	httpMethod?: string | null;
	httpHeaders?: Record<string, string> | null;
	mockResponse?: string | null;
	isEnabled?: boolean;
}

export interface UpdateToolData {
	name?: string;
	description?: string;
	inputSchema?: ToolInputSchema;
	executionType?: "mock" | "http";
	httpUrl?: string | null;
	httpMethod?: string | null;
	httpHeaders?: Record<string, string> | null;
	mockResponse?: string | null;
	isEnabled?: boolean;
}

export async function listTools(agentId: string): Promise<AgentTool[]> {
	const response = await fetch(`${API_BASE}/tools?agentId=${agentId}`, {
		credentials: "include",
	});

	if (!response.ok) {
		throw new Error("Failed to fetch tools");
	}

	return response.json();
}

export async function getTool(id: string): Promise<AgentTool> {
	const response = await fetch(`${API_BASE}/tools/${id}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Not found");
	}

	return response.json();
}

export async function createTool(data: CreateToolData): Promise<AgentTool> {
	const response = await fetch(`${API_BASE}/tools`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Create failed");
	}

	return response.json();
}

export async function updateTool(id: string, data: UpdateToolData): Promise<AgentTool> {
	const response = await fetch(`${API_BASE}/tools/${id}`, {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Update failed");
	}

	return response.json();
}

export async function deleteTool(id: string): Promise<{ success: boolean }> {
	const response = await fetch(`${API_BASE}/tools/${id}`, {
		method: "DELETE",
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Delete failed");
	}

	return response.json();
}

// ============ Marketplace API ============

export interface ToolTemplate {
	id: string;
	slug: string;
	name: string;
	description: string;
	longDescription: string | null;
	category: string;
	icon: string;
	isFree: boolean;
	requiredConfig: Array<{
		key: string;
		label: string;
		type: "text" | "password" | "url";
		placeholder?: string;
		helpText?: string;
		helpUrl?: string;
	}> | null;
}

export interface ToolTemplateDetail extends ToolTemplate {
	toolName: string;
	toolDescription: string;
	inputSchema: ToolInputSchema;
	executionType: string;
	httpUrl: string | null;
	httpMethod: string | null;
	httpHeaders: Record<string, string> | null;
	mockResponse: string | null;
}

export async function listMarketplaceTools(): Promise<ToolTemplate[]> {
	const response = await fetch(`${API_BASE}/marketplace/tools`);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch marketplace tools");
	}

	return response.json();
}

export async function getMarketplaceTool(slug: string): Promise<ToolTemplateDetail> {
	const response = await fetch(`${API_BASE}/marketplace/tools/${slug}`);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch tool");
	}

	return response.json();
}

export async function installMarketplaceTool(
	slug: string,
	agentId: string,
	config?: Record<string, string>,
): Promise<{ success: boolean; tool: AgentTool }> {
	const response = await fetch(`${API_BASE}/marketplace/tools/${slug}/install`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ agentId, config }),
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to install tool");
	}

	return response.json();
}

// ============ Web Sources API ============

export interface WebSource {
	id: string;
	agentId: string;
	name: string;
	url: string;
	sourceType: "individual" | "sitemap" | "crawl";
	status: "pending" | "crawling" | "completed" | "failed";
	errorMessage: string | null;
	createdAt: string;
	updatedAt: string;
	pageCount?: number;
	totalSize?: number;
}

export interface WebSourcePage {
	id: string;
	webSourceId: string;
	url: string;
	title: string | null;
	content: string | null;
	contentSize: number;
	status: "pending" | "crawling" | "completed" | "failed";
	isExcluded: boolean;
	errorMessage: string | null;
	lastCrawledAt: string | null;
	createdAt: string;
	updatedAt: string;
}

export async function listWebSources(agentId: string): Promise<WebSource[]> {
	const response = await fetch(`${API_BASE}/web-sources?agentId=${agentId}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch web sources");
	}

	return response.json();
}

export async function getWebSource(id: string): Promise<WebSource & { pages: WebSourcePage[] }> {
	const response = await fetch(`${API_BASE}/web-sources/${id}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch web source");
	}

	return response.json();
}

export async function createWebSource(
	agentId: string,
	name: string,
	url: string,
	sourceType: "individual" | "sitemap" | "crawl",
): Promise<WebSource> {
	const response = await fetch(`${API_BASE}/web-sources`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ agentId, name, url, sourceType }),
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to create web source");
	}

	return response.json();
}

export async function deleteWebSource(id: string): Promise<void> {
	const response = await fetch(`${API_BASE}/web-sources/${id}`, {
		method: "DELETE",
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to delete web source");
	}
}

export async function recrawlWebSource(id: string): Promise<void> {
	const response = await fetch(`${API_BASE}/web-sources/${id}/recrawl`, {
		method: "POST",
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to recrawl web source");
	}
}

export async function toggleWebSourcePageExclusion(
	sourceId: string,
	pageId: string,
	isExcluded: boolean,
): Promise<void> {
	const response = await fetch(`${API_BASE}/web-sources/${sourceId}/pages/${pageId}`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ isExcluded }),
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to update page");
	}
}

export async function deleteWebSourcePage(sourceId: string, pageId: string): Promise<void> {
	const response = await fetch(`${API_BASE}/web-sources/${sourceId}/pages/${pageId}`, {
		method: "DELETE",
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to delete page");
	}
}
