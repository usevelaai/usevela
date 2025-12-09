import mammoth from "mammoth";

export type SupportedMimeType =
	| "application/pdf"
	| "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
	| "text/plain";

const SUPPORTED_TYPES: SupportedMimeType[] = [
	"application/pdf",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"text/plain",
];

export function isSupportedType(mimeType: string): mimeType is SupportedMimeType {
	return SUPPORTED_TYPES.includes(mimeType as SupportedMimeType);
}

export async function extractText(buffer: Buffer, mimeType: SupportedMimeType): Promise<string> {
	switch (mimeType) {
		case "application/pdf":
			return extractPdf(buffer);
		case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
			return extractDocx(buffer);
		case "text/plain":
			return buffer.toString("utf-8");
		default:
			throw new Error(`Unsupported file type: ${mimeType}`);
	}
}

async function extractPdf(buffer: Buffer): Promise<string> {
	const { extractText: extract } = await import("unpdf");
	const { text } = await extract(new Uint8Array(buffer));
	return Array.isArray(text) ? text.join("\n") : text;
}

async function extractDocx(buffer: Buffer): Promise<string> {
	const result = await mammoth.extractRawText({ buffer });
	return result.value;
}
