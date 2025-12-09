import { agents, and, eq, getDb, webSourcePageChunks, webSourcePages, webSources } from "@vela/db";
import { Hono } from "hono";
import { chunkText } from "../lib/chunker";
import { createEmbedding } from "../lib/embeddings";

const webSourcesRoute = new Hono();

// Helper to verify agent ownership
async function verifyAgentOwnership(
	db: ReturnType<typeof getDb>,
	agentId: string,
	userId: string,
): Promise<boolean> {
	const [agent] = await db
		.select()
		.from(agents)
		.where(and(eq(agents.id, agentId), eq(agents.userId, userId)))
		.limit(1);
	return !!agent;
}

// Fetch content from a URL using Jina Reader
async function fetchPageContent(url: string): Promise<{ title: string; content: string }> {
	const response = await fetch(`https://r.jina.ai/${encodeURIComponent(url)}`, {
		headers: {
			Accept: "text/plain",
			"User-Agent": "OpenChat/1.0",
		},
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch ${url}: ${response.status}`);
	}

	const text = await response.text();

	// Extract title from first line if it looks like a title
	const lines = text.split("\n");
	let title = url;
	let content = text;

	if (lines[0] && lines[0].length < 200 && !lines[0].includes(" ")) {
		title = lines[0];
		content = lines.slice(1).join("\n").trim();
	}

	return { title, content };
}

// Parse sitemap XML to extract URLs
async function parseSitemap(url: string): Promise<string[]> {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to fetch sitemap: ${response.status}`);
	}

	const xml = await response.text();
	const urls: string[] = [];

	// Extract URLs from sitemap using matchAll
	const locRegex = /<loc>([^<]+)<\/loc>/g;
	for (const match of xml.matchAll(locRegex)) {
		urls.push(match[1]);
	}

	// Check if this is a sitemap index (contains other sitemaps)
	if (xml.includes("<sitemapindex")) {
		const nestedUrls: string[] = [];
		for (const sitemapUrl of urls.slice(0, 5)) {
			// Limit nested sitemaps
			try {
				const nested = await parseSitemap(sitemapUrl);
				nestedUrls.push(...nested);
			} catch {
				// Ignore nested sitemap errors
			}
		}
		return nestedUrls;
	}

	return urls;
}

// Extract links from a page for crawling
async function extractLinks(url: string, content: string): Promise<string[]> {
	const baseUrl = new URL(url);
	const links: string[] = [];

	// Extract href attributes using matchAll
	const hrefRegex = /href=["']([^"']+)["']/g;
	for (const match of content.matchAll(hrefRegex)) {
		try {
			const linkUrl = new URL(match[1], baseUrl.origin);
			// Only include links from same domain
			if (linkUrl.hostname === baseUrl.hostname && !linkUrl.href.includes("#")) {
				links.push(linkUrl.href);
			}
		} catch {
			// Ignore invalid URLs
		}
	}

	return [...new Set(links)]; // Deduplicate
}

// Helper function to start crawling a web source (non-blocking)
async function startCrawl(sourceId: string): Promise<void> {
	const db = getDb();

	const [source] = await db.select().from(webSources).where(eq(webSources.id, sourceId)).limit(1);
	if (!source) return;

	// Update status to crawling
	await db
		.update(webSources)
		.set({ status: "crawling", errorMessage: null })
		.where(eq(webSources.id, sourceId));

	// Start crawl in background (non-blocking)
	(async () => {
		try {
			let pageUrls: string[] = [];

			if (source.sourceType === "individual" || source.sourceType === "page") {
				pageUrls = [source.url];
			} else if (source.sourceType === "sitemap") {
				pageUrls = await parseSitemap(source.url);
			} else if (source.sourceType === "crawl") {
				// Fetch the root page and extract links
				const response = await fetch(source.url);
				const html = await response.text();
				pageUrls = [source.url, ...(await extractLinks(source.url, html))];
			}

			// Limit pages
			pageUrls = pageUrls.slice(0, source.maxPages || 100);

			// Clear existing pages for re-crawl
			await db.delete(webSourcePages).where(eq(webSourcePages.webSourceId, sourceId));

			// Create page entries
			for (const url of pageUrls) {
				await db.insert(webSourcePages).values({
					webSourceId: sourceId,
					url,
					status: "pending",
				});
			}

			// Crawl each page
			const pages = await db
				.select()
				.from(webSourcePages)
				.where(and(eq(webSourcePages.webSourceId, sourceId), eq(webSourcePages.status, "pending")));

			for (const page of pages) {
				try {
					const { title, content } = await fetchPageContent(page.url);
					const contentSize = Buffer.byteLength(content, "utf-8");

					// Update page
					await db
						.update(webSourcePages)
						.set({
							title,
							content,
							contentSize,
							status: "crawled",
							lastCrawledAt: new Date(),
						})
						.where(eq(webSourcePages.id, page.id));

					// Delete old chunks
					await db
						.delete(webSourcePageChunks)
						.where(eq(webSourcePageChunks.webSourcePageId, page.id));

					// Create embeddings
					const chunks = chunkText(content);
					for (let i = 0; i < chunks.length; i++) {
						const embedding = await createEmbedding(chunks[i]);
						await db.insert(webSourcePageChunks).values({
							webSourcePageId: page.id,
							content: chunks[i],
							chunkIndex: i,
							embedding,
						});
					}
				} catch (error) {
					await db
						.update(webSourcePages)
						.set({
							status: "failed",
							errorMessage: error instanceof Error ? error.message : "Unknown error",
						})
						.where(eq(webSourcePages.id, page.id));
				}
			}

			// Update source status
			await db
				.update(webSources)
				.set({
					status: "completed",
					lastCrawledAt: new Date(),
				})
				.where(eq(webSources.id, sourceId));
		} catch (error) {
			await db
				.update(webSources)
				.set({
					status: "failed",
					errorMessage: error instanceof Error ? error.message : "Unknown error",
				})
				.where(eq(webSources.id, sourceId));
		}
	})();
}

// GET /web-sources - List all web sources for an agent
webSourcesRoute.get("/", async (c) => {
	// @ts-expect-error - user is set by auth middleware
	const user = c.get("user") as { id: string } | null;
	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const agentId = c.req.query("agentId");
	if (!agentId) {
		return c.json({ error: "agentId required" }, 400);
	}

	const db = getDb();

	if (!(await verifyAgentOwnership(db, agentId, user.id))) {
		return c.json({ error: "Agent not found" }, 404);
	}

	const sources = await db
		.select()
		.from(webSources)
		.where(eq(webSources.agentId, agentId))
		.orderBy(webSources.createdAt);

	// Get page counts and total sizes for each source
	const sourcesWithStats = await Promise.all(
		sources.map(async (source) => {
			const pages = await db
				.select()
				.from(webSourcePages)
				.where(eq(webSourcePages.webSourceId, source.id));

			const pageCount = pages.length;
			const totalSize = pages.reduce((sum, p) => sum + (p.contentSize || 0), 0);
			const crawledCount = pages.filter((p) => p.status === "crawled").length;

			return {
				...source,
				pageCount,
				crawledCount,
				totalSize,
			};
		}),
	);

	return c.json(sourcesWithStats);
});

// GET /web-sources/:id - Get a web source with its pages
webSourcesRoute.get("/:id", async (c) => {
	// @ts-expect-error - user is set by auth middleware
	const user = c.get("user") as { id: string } | null;
	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const id = c.req.param("id");
	const db = getDb();

	const [source] = await db.select().from(webSources).where(eq(webSources.id, id)).limit(1);

	if (!source) {
		return c.json({ error: "Web source not found" }, 404);
	}

	if (!(await verifyAgentOwnership(db, source.agentId, user.id))) {
		return c.json({ error: "Agent not found" }, 404);
	}

	const pages = await db
		.select()
		.from(webSourcePages)
		.where(eq(webSourcePages.webSourceId, id))
		.orderBy(webSourcePages.createdAt);

	return c.json({ ...source, pages });
});

// POST /web-sources - Create a new web source
webSourcesRoute.post("/", async (c) => {
	// @ts-expect-error - user is set by auth middleware
	const user = c.get("user") as { id: string } | null;
	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const body = await c.req.json<{
		agentId: string;
		url: string;
		sourceType: "individual" | "page" | "sitemap" | "crawl";
		name?: string;
		maxPages?: number;
	}>();

	if (!body.agentId || !body.url || !body.sourceType) {
		return c.json({ error: "agentId, url, and sourceType are required" }, 400);
	}

	const db = getDb();

	if (!(await verifyAgentOwnership(db, body.agentId, user.id))) {
		return c.json({ error: "Agent not found" }, 404);
	}

	// Normalize sourceType (frontend sends "individual", backend originally used "page")
	const normalizedSourceType = body.sourceType === "individual" ? "individual" : body.sourceType;

	// Create the web source
	const [source] = await db
		.insert(webSources)
		.values({
			agentId: body.agentId,
			url: body.url,
			sourceType: normalizedSourceType,
			name: body.name || new URL(body.url).hostname,
			maxPages: body.maxPages || 100,
			status: "pending",
		})
		.returning();

	// Start crawling automatically (non-blocking)
	startCrawl(source.id);

	return c.json(source, 201);
});

// POST /web-sources/:id/crawl - Start crawling a web source
webSourcesRoute.post("/:id/crawl", async (c) => {
	// @ts-expect-error - user is set by auth middleware
	const user = c.get("user") as { id: string } | null;
	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const id = c.req.param("id");
	const db = getDb();

	const [source] = await db.select().from(webSources).where(eq(webSources.id, id)).limit(1);

	if (!source) {
		return c.json({ error: "Web source not found" }, 404);
	}

	if (!(await verifyAgentOwnership(db, source.agentId, user.id))) {
		return c.json({ error: "Agent not found" }, 404);
	}

	// Start crawl using the helper function
	startCrawl(id);

	return c.json({ success: true, message: "Crawl started" });
});

// POST /web-sources/:id/recrawl - Alias for crawl endpoint
webSourcesRoute.post("/:id/recrawl", async (c) => {
	// @ts-expect-error - user is set by auth middleware
	const user = c.get("user") as { id: string } | null;
	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const id = c.req.param("id");
	const db = getDb();

	const [source] = await db.select().from(webSources).where(eq(webSources.id, id)).limit(1);

	if (!source) {
		return c.json({ error: "Web source not found" }, 404);
	}

	if (!(await verifyAgentOwnership(db, source.agentId, user.id))) {
		return c.json({ error: "Agent not found" }, 404);
	}

	// Start crawl using the helper function
	startCrawl(id);

	return c.json({ success: true, message: "Crawl started" });
});

// DELETE /web-sources/:id - Delete a web source
webSourcesRoute.delete("/:id", async (c) => {
	// @ts-expect-error - user is set by auth middleware
	const user = c.get("user") as { id: string } | null;
	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const id = c.req.param("id");
	const db = getDb();

	const [source] = await db.select().from(webSources).where(eq(webSources.id, id)).limit(1);

	if (!source) {
		return c.json({ error: "Web source not found" }, 404);
	}

	if (!(await verifyAgentOwnership(db, source.agentId, user.id))) {
		return c.json({ error: "Agent not found" }, 404);
	}

	await db.delete(webSources).where(eq(webSources.id, id));

	return c.json({ success: true });
});

// PATCH /web-sources/:sourceId/pages/:pageId - Update a page (e.g., exclude)
webSourcesRoute.patch("/:sourceId/pages/:pageId", async (c) => {
	// @ts-expect-error - user is set by auth middleware
	const user = c.get("user") as { id: string } | null;
	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const sourceId = c.req.param("sourceId");
	const pageId = c.req.param("pageId");
	const body = await c.req.json<{ isExcluded?: boolean; status?: string }>();
	const db = getDb();

	const [source] = await db.select().from(webSources).where(eq(webSources.id, sourceId)).limit(1);

	if (!source || !(await verifyAgentOwnership(db, source.agentId, user.id))) {
		return c.json({ error: "Not authorized" }, 403);
	}

	const [page] = await db
		.select()
		.from(webSourcePages)
		.where(and(eq(webSourcePages.id, pageId), eq(webSourcePages.webSourceId, sourceId)))
		.limit(1);

	if (!page) {
		return c.json({ error: "Page not found" }, 404);
	}

	// Determine new status
	const newStatus =
		body.isExcluded !== undefined ? (body.isExcluded ? "excluded" : "crawled") : body.status;

	// If excluding, delete chunks
	if (newStatus === "excluded") {
		await db.delete(webSourcePageChunks).where(eq(webSourcePageChunks.webSourcePageId, pageId));
	}

	await db
		.update(webSourcePages)
		.set({ status: newStatus, updatedAt: new Date() })
		.where(eq(webSourcePages.id, pageId));

	return c.json({ success: true });
});

// DELETE /web-sources/:sourceId/pages/:pageId - Delete a page
webSourcesRoute.delete("/:sourceId/pages/:pageId", async (c) => {
	// @ts-expect-error - user is set by auth middleware
	const user = c.get("user") as { id: string } | null;
	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const sourceId = c.req.param("sourceId");
	const pageId = c.req.param("pageId");
	const db = getDb();

	const [source] = await db.select().from(webSources).where(eq(webSources.id, sourceId)).limit(1);

	if (!source || !(await verifyAgentOwnership(db, source.agentId, user.id))) {
		return c.json({ error: "Not authorized" }, 403);
	}

	const [page] = await db
		.select()
		.from(webSourcePages)
		.where(and(eq(webSourcePages.id, pageId), eq(webSourcePages.webSourceId, sourceId)))
		.limit(1);

	if (!page) {
		return c.json({ error: "Page not found" }, 404);
	}

	// Delete chunks first
	await db.delete(webSourcePageChunks).where(eq(webSourcePageChunks.webSourcePageId, pageId));
	// Delete the page
	await db.delete(webSourcePages).where(eq(webSourcePages.id, pageId));

	return c.json({ success: true });
});

export { webSourcesRoute };
