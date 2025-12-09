const VOYAGE_MODEL = "voyage-3";
const OLLAMA_MODEL = "mxbai-embed-large"; // 1024 dimensions (matches Voyage)
const BATCH_SIZE = 128;

const isSelfHosted = process.env.SELF_HOSTED === "true";
const useOllama = isSelfHosted && process.env.OPENAI_API_BASE && !process.env.VOYAGE_API_KEY;

export async function createEmbedding(text: string): Promise<number[]> {
	const embeddings = await createEmbeddings([text]);
	return embeddings[0];
}

async function createOllamaEmbedding(text: string): Promise<number[]> {
	const baseUrl = process.env.OPENAI_API_BASE?.replace("/v1", "") || "http://localhost:11434";

	try {
		const response = await fetch(`${baseUrl}/api/embeddings`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				model: OLLAMA_MODEL,
				prompt: text,
			}),
		});

		if (!response.ok) {
			console.warn(`Ollama embeddings error: ${response.statusText}. Skipping vector search.`);
			return []; // Return empty - will skip vector search
		}

		const data = (await response.json()) as { embedding: number[] };
		return data.embedding;
	} catch (error) {
		console.warn(`Ollama embeddings unavailable: ${error}. Skipping vector search.`);
		return []; // Return empty - will skip vector search
	}
}

async function createVoyageEmbeddings(
	texts: string[],
	inputType: "document" | "query",
): Promise<number[][]> {
	const results: number[][] = [];

	for (let i = 0; i < texts.length; i += BATCH_SIZE) {
		const batch = texts.slice(i, i + BATCH_SIZE);

		const response = await fetch("https://api.voyageai.com/v1/embeddings", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
			},
			body: JSON.stringify({
				model: VOYAGE_MODEL,
				input: batch,
				input_type: inputType,
			}),
		});

		if (!response.ok) {
			throw new Error(`Voyage API error: ${response.statusText}`);
		}

		const data = (await response.json()) as {
			data: Array<{ embedding: number[] }>;
		};
		results.push(...data.data.map((d) => d.embedding));
	}

	return results;
}

export async function createEmbeddings(texts: string[]): Promise<number[][]> {
	if (useOllama) {
		// Ollama doesn't support batch embeddings, process one at a time
		const results: number[][] = [];
		for (const text of texts) {
			const embedding = await createOllamaEmbedding(text);
			results.push(embedding);
		}
		return results;
	}

	return createVoyageEmbeddings(texts, "document");
}

export async function createQueryEmbedding(query: string): Promise<number[]> {
	if (useOllama) {
		return createOllamaEmbedding(query);
	}

	const results = await createVoyageEmbeddings([query], "query");
	return results[0];
}
