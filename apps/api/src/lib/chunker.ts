export interface ChunkOptions {
	maxChunkSize?: number;
	overlap?: number;
}

const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_OVERLAP = 200;

export function chunkText(text: string, options: ChunkOptions = {}): string[] {
	const maxChunkSize = options.maxChunkSize ?? DEFAULT_CHUNK_SIZE;
	const overlap = options.overlap ?? DEFAULT_OVERLAP;

	const cleanedText = text.replace(/\s+/g, " ").trim();

	if (cleanedText.length <= maxChunkSize) {
		return [cleanedText];
	}

	const chunks: string[] = [];
	let start = 0;

	while (start < cleanedText.length) {
		let end = start + maxChunkSize;

		if (end < cleanedText.length) {
			// Find sentence boundary
			const slice = cleanedText.slice(start, end);
			const lastPeriod = slice.lastIndexOf(". ");
			const lastNewline = slice.lastIndexOf("\n");
			const lastQuestion = slice.lastIndexOf("? ");
			const lastExclaim = slice.lastIndexOf("! ");

			const boundary = Math.max(lastPeriod, lastNewline, lastQuestion, lastExclaim);

			if (boundary > maxChunkSize * 0.5) {
				end = start + boundary + 1;
			}
		}

		const chunk = cleanedText.slice(start, end).trim();
		if (chunk) {
			chunks.push(chunk);
		}

		start = end - overlap;
		if (start >= cleanedText.length - overlap) {
			break;
		}
	}

	return chunks;
}
