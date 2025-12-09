// Load .env BEFORE any other imports that depend on env vars
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Try to find .env in multiple locations
const possiblePaths = [
	resolve(process.cwd(), ".env"), // Root when running from root
	resolve(process.cwd(), "../../.env"), // Root when running from apps/api
	resolve(__dirname, "../../../..", ".env"), // Relative to this file
	resolve(__dirname, "..", ".env"), // apps/api/.env
];

const envPath = possiblePaths.find((p) => existsSync(p));
if (envPath) {
	console.log(`[api] Loading .env from: ${envPath}`);
	config({ path: envPath });
} else {
	console.warn("[api] No .env file found");
	config();
}

// Now import everything else
const { serve } = await import("@hono/node-server");
const { Hono } = await import("hono");
const { cors } = await import("hono/cors");
const { auth } = await import("./lib/auth");
const { authMiddleware } = await import("./middleware/auth");
const { agentsRoute } = await import("./routes/agents");
const { chat } = await import("./routes/chat");
const { conversationsRoute } = await import("./routes/conversations");
const { interfaceSettingsRoute } = await import("./routes/interface-settings");
const { qaSourcesRoute } = await import("./routes/qa-sources");
const { team } = await import("./routes/team");
const { textSourcesRoute } = await import("./routes/text-sources");
const { upload } = await import("./routes/upload");
const { usage } = await import("./routes/usage");
const { configRoute } = await import("./routes/config");
const { securitySettingsRoute } = await import("./routes/security-settings");
const { feedback } = await import("./routes/feedback");
const { analytics } = await import("./routes/analytics");
const { toolsRoute } = await import("./routes/tools");
const { marketplace } = await import("./routes/marketplace");
const { webSourcesRoute } = await import("./routes/web-sources");

const app = new Hono();

// CORS must be before auth routes
app.use(
	"/*",
	cors({
		origin: (origin) => {
			const allowedOrigins = [
				process.env.DASHBOARD_URL || "http://localhost:3000",
				process.env.WIDGET_URL || "http://localhost:3002",
			];
			// Allow requests with no origin (like mobile apps or curl)
			if (!origin) return allowedOrigins[0];
			// Check if origin is in allowed list
			if (allowedOrigins.includes(origin)) return origin;
			// Also allow any origin for widget embed (interface-settings and chat endpoints)
			return origin;
		},
		credentials: true,
		allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization"],
	}),
);

// Auth middleware to populate user context for all routes
app.use("/*", authMiddleware);

// BetterAuth handler
app.on(["POST", "GET"], "/api/auth/*", (c) => {
	return auth.handler(c.req.raw);
});

app.get("/", (c) => {
	return c.json({ message: "Hello from Hono!" });
});

app.get("/health", (c) => {
	return c.json({ status: "ok" });
});

app.route("/chat", chat);
app.route("/documents", upload);
app.route("/text-sources", textSourcesRoute);
app.route("/qa-sources", qaSourcesRoute);
app.route("/conversations", conversationsRoute);
app.route("/agents", agentsRoute);
app.route("/interface-settings", interfaceSettingsRoute);
app.route("/usage", usage);
app.route("/team", team);
app.route("/config", configRoute);
app.route("/security-settings", securitySettingsRoute);
app.route("/feedback", feedback);
app.route("/analytics", analytics);
app.route("/tools", toolsRoute);
app.route("/marketplace", marketplace);
app.route("/web-sources", webSourcesRoute);

const port = Number(process.env.PORT) || 3001;

console.log(`Server running on http://localhost:${port}`);

serve({
	fetch: app.fetch,
	port,
});

export default app;
