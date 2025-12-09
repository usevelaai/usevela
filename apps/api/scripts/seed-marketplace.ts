import "dotenv/config";
import type { NewToolTemplate } from "@vela/db";
import { getDb, toolTemplates } from "@vela/db";

const marketplaceTools: Omit<NewToolTemplate, "id" | "createdAt" | "updatedAt">[] = [
	{
		slug: "web-search",
		name: "Web Search",
		description: "Search the web for current information and answers",
		longDescription:
			"Enable your agent to search the web in real-time to find current information, news, and answers to questions. Powered by Tavily AI search API which is optimized for LLM applications.",
		category: "search",
		icon: "search",
		toolName: "web_search",
		toolDescription:
			"Search the web for current information. Use this when you need to find recent news, current events, or information that may not be in your training data.",
		inputSchema: {
			type: "object" as const,
			properties: {
				query: {
					type: "string",
					description: "The search query to look up on the web",
				},
			},
			required: ["query"],
		},
		executionType: "http",
		httpUrl: "https://api.tavily.com/search",
		httpMethod: "POST",
		httpHeaders: { "Content-Type": "application/json" },
		requiredConfig: [
			{
				key: "api_key",
				label: "Tavily API Key",
				type: "password" as const,
				placeholder: "tvly-...",
				helpText: "Get a free API key from Tavily",
				helpUrl: "https://tavily.com/",
			},
		],
		isFree: false,
	},
	{
		slug: "weather",
		name: "Weather Lookup",
		description: "Get current weather and forecasts for any location",
		longDescription:
			"Allow your agent to fetch real-time weather data including temperature, conditions, humidity, and forecasts. Uses the free OpenWeatherMap API.",
		category: "data",
		icon: "cloud-sun",
		toolName: "get_weather",
		toolDescription:
			"Get the current weather for a location. Returns temperature, conditions, humidity, and other weather data.",
		inputSchema: {
			type: "object" as const,
			properties: {
				location: {
					type: "string",
					description: "The city name, e.g., 'London' or 'New York, NY'",
				},
			},
			required: ["location"],
		},
		executionType: "http",
		httpUrl:
			"https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${api_key}&units=metric",
		httpMethod: "GET",
		httpHeaders: {},
		requiredConfig: [
			{
				key: "api_key",
				label: "OpenWeatherMap API Key",
				type: "password" as const,
				placeholder: "Your API key",
				helpText: "Get a free API key from OpenWeatherMap",
				helpUrl: "https://openweathermap.org/api",
			},
		],
		isFree: true,
	},
	{
		slug: "calculator",
		name: "Calculator",
		description: "Perform mathematical calculations",
		longDescription:
			"Enable your agent to perform accurate mathematical calculations. This tool runs locally and doesn't require any API key.",
		category: "productivity",
		icon: "calculator",
		toolName: "calculate",
		toolDescription:
			"Perform a mathematical calculation. Supports basic arithmetic (+, -, *, /), exponents (^), and common functions (sqrt, sin, cos, tan, log).",
		inputSchema: {
			type: "object" as const,
			properties: {
				expression: {
					type: "string",
					description: "The mathematical expression to evaluate, e.g., '2 + 2' or 'sqrt(16)'",
				},
			},
			required: ["expression"],
		},
		executionType: "mock",
		mockResponse:
			'{"result": "${expression} = [calculated result]", "note": "Replace with actual calculation logic"}',
		requiredConfig: [],
		isFree: true,
	},
	{
		slug: "wikipedia",
		name: "Wikipedia",
		description: "Look up factual information from Wikipedia",
		longDescription:
			"Allow your agent to search and retrieve information from Wikipedia. Great for factual queries about people, places, events, and concepts. No API key required.",
		category: "search",
		icon: "book-open",
		toolName: "wikipedia_search",
		toolDescription:
			"Search Wikipedia for information about a topic. Returns a summary of the most relevant article.",
		inputSchema: {
			type: "object" as const,
			properties: {
				query: {
					type: "string",
					description: "The topic to search for on Wikipedia",
				},
			},
			required: ["query"],
		},
		executionType: "http",
		httpUrl: "https://en.wikipedia.org/api/rest_v1/page/summary/${query}",
		httpMethod: "GET",
		httpHeaders: { "User-Agent": "OpenChat/1.0" },
		requiredConfig: [],
		isFree: true,
	},
	{
		slug: "url-fetcher",
		name: "URL Fetcher",
		description: "Fetch and read content from web pages",
		longDescription:
			"Enable your agent to fetch content from URLs. Useful for reading articles, documentation, or any public web page. No API key required.",
		category: "search",
		icon: "link",
		toolName: "fetch_url",
		toolDescription: "Fetch the content of a web page. Returns the main text content of the page.",
		inputSchema: {
			type: "object" as const,
			properties: {
				url: {
					type: "string",
					description: "The URL of the web page to fetch",
				},
			},
			required: ["url"],
		},
		executionType: "http",
		httpUrl: "https://r.jina.ai/${url}",
		httpMethod: "GET",
		httpHeaders: { Accept: "text/plain" },
		requiredConfig: [],
		isFree: true,
	},
	{
		slug: "currency-converter",
		name: "Currency Converter",
		description: "Convert between different currencies",
		longDescription:
			"Allow your agent to convert amounts between different currencies using real-time exchange rates. Uses the free ExchangeRate API.",
		category: "data",
		icon: "coins",
		toolName: "convert_currency",
		toolDescription: "Convert an amount from one currency to another using current exchange rates.",
		inputSchema: {
			type: "object" as const,
			properties: {
				amount: {
					type: "number",
					description: "The amount to convert",
				},
				from: {
					type: "string",
					description: "The source currency code (e.g., USD, EUR, GBP)",
				},
				to: {
					type: "string",
					description: "The target currency code (e.g., USD, EUR, GBP)",
				},
			},
			required: ["amount", "from", "to"],
		},
		executionType: "http",
		httpUrl: "https://api.exchangerate-api.com/v4/latest/${from}",
		httpMethod: "GET",
		httpHeaders: {},
		requiredConfig: [],
		isFree: true,
	},
	{
		slug: "order-lookup",
		name: "Order Lookup",
		description: "Look up order status (template for your API)",
		longDescription:
			"A template tool for looking up order information. Configure this with your own order management API to allow customers to check their order status.",
		category: "ecommerce",
		icon: "package",
		toolName: "lookup_order",
		toolDescription: "Look up the status of an order by order ID or email address.",
		inputSchema: {
			type: "object" as const,
			properties: {
				order_id: {
					type: "string",
					description: "The order ID or order number",
				},
				email: {
					type: "string",
					description: "The customer email address (optional, for verification)",
				},
			},
			required: ["order_id"],
		},
		executionType: "http",
		httpUrl: "${api_url}/orders/${order_id}",
		httpMethod: "GET",
		httpHeaders: { Authorization: "Bearer ${api_key}" },
		requiredConfig: [
			{
				key: "api_url",
				label: "Your API Base URL",
				type: "url" as const,
				placeholder: "https://api.yourstore.com",
				helpText: "The base URL of your order management API",
			},
			{
				key: "api_key",
				label: "API Key",
				type: "password" as const,
				placeholder: "Your API key",
				helpText: "Authentication key for your API",
			},
		],
		isFree: true,
	},
	{
		slug: "send-email",
		name: "Send Email",
		description: "Send email notifications",
		longDescription:
			"Enable your agent to send emails. Great for notifications, follow-ups, or automated responses. Powered by Resend, a modern email API.",
		category: "communication",
		icon: "mail",
		toolName: "send_email",
		toolDescription:
			"Send an email to a recipient. Use this when a user requests to be contacted by email or needs a follow-up.",
		inputSchema: {
			type: "object" as const,
			properties: {
				to: {
					type: "string",
					description: "The recipient email address",
				},
				subject: {
					type: "string",
					description: "The email subject line",
				},
				body: {
					type: "string",
					description: "The email body content",
				},
			},
			required: ["to", "subject", "body"],
		},
		executionType: "http",
		httpUrl: "https://api.resend.com/emails",
		httpMethod: "POST",
		httpHeaders: {
			"Content-Type": "application/json",
			Authorization: "Bearer ${api_key}",
		},
		requiredConfig: [
			{
				key: "api_key",
				label: "Resend API Key",
				type: "password" as const,
				placeholder: "re_...",
				helpText: "Get an API key from Resend",
				helpUrl: "https://resend.com/",
			},
			{
				key: "from_email",
				label: "From Email",
				type: "text" as const,
				placeholder: "noreply@yourdomain.com",
				helpText: "The sender email address (must be verified in Resend)",
			},
		],
		isFree: false,
	},
];

async function seed() {
	console.log("Seeding marketplace tools...");
	const db = getDb();

	for (const tool of marketplaceTools) {
		try {
			await db
				.insert(toolTemplates)
				.values({
					...tool,
					isActive: true,
				})
				.onConflictDoNothing();
			console.log(`✓ Added: ${tool.name}`);
		} catch (error) {
			console.error(`✗ Failed to add ${tool.name}:`, error);
		}
	}

	console.log("\nDone! Seeded", marketplaceTools.length, "tools.");
	process.exit(0);
}

seed();
