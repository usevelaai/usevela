"use client";

import { type ChangeEvent, type DragEvent, useCallback, useState } from "react";

export interface FileUploadProps {
	onUpload: (file: File) => Promise<void>;
	accept?: string;
	maxSize?: number;
	disabled?: boolean;
}

const ACCEPTED_TYPES = ".pdf,.docx,.txt";
const MAX_SIZE_MB = 10;

export function FileUpload({
	onUpload,
	accept = ACCEPTED_TYPES,
	maxSize = MAX_SIZE_MB * 1024 * 1024,
	disabled = false,
}: FileUploadProps) {
	const [isDragging, setIsDragging] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	const handleFile = useCallback(
		async (file: File) => {
			setError(null);
			setSuccess(null);

			if (file.size > maxSize) {
				setError(`File too large (max ${MAX_SIZE_MB}MB)`);
				return;
			}

			const validTypes = [
				"application/pdf",
				"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
				"text/plain",
			];
			if (!validTypes.includes(file.type)) {
				setError("Unsupported file type (PDF, DOCX, TXT only)");
				return;
			}

			setUploading(true);
			try {
				await onUpload(file);
				setSuccess(`Uploaded: ${file.name}`);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Upload failed");
			} finally {
				setUploading(false);
			}
		},
		[maxSize, onUpload],
	);

	const handleDragOver = useCallback((e: DragEvent) => {
		e.preventDefault();
		setIsDragging(true);
	}, []);

	const handleDragLeave = useCallback((e: DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
	}, []);

	const handleDrop = useCallback(
		(e: DragEvent) => {
			e.preventDefault();
			setIsDragging(false);
			const file = e.dataTransfer.files[0];
			if (file) handleFile(file);
		},
		[handleFile],
	);

	const handleChange = useCallback(
		(e: ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (file) handleFile(file);
			e.target.value = "";
		},
		[handleFile],
	);

	const containerStyle: React.CSSProperties = {
		border: `2px dashed ${isDragging ? "#3b82f6" : "#d1d5db"}`,
		borderRadius: "0.5rem",
		padding: "2rem",
		textAlign: "center",
		backgroundColor: isDragging ? "#eff6ff" : "#f9fafb",
		cursor: disabled || uploading ? "not-allowed" : "pointer",
		opacity: disabled || uploading ? 0.6 : 1,
		transition: "all 0.2s ease",
	};

	const labelStyle: React.CSSProperties = {
		display: "block",
		cursor: disabled || uploading ? "not-allowed" : "pointer",
	};

	const textStyle: React.CSSProperties = {
		color: "#6b7280",
		fontSize: "0.875rem",
		marginTop: "0.5rem",
	};

	const errorStyle: React.CSSProperties = {
		color: "#dc2626",
		fontSize: "0.875rem",
		marginTop: "0.5rem",
	};

	const successStyle: React.CSSProperties = {
		color: "#16a34a",
		fontSize: "0.875rem",
		marginTop: "0.5rem",
	};

	return (
		<div
			style={containerStyle}
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
		>
			<label style={labelStyle}>
				<input
					type="file"
					accept={accept}
					onChange={handleChange}
					disabled={disabled || uploading}
					style={{ display: "none" }}
				/>
				<div>
					<svg
						style={{ width: "3rem", height: "3rem", margin: "0 auto", color: "#9ca3af" }}
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
						/>
					</svg>
					<p style={{ marginTop: "0.5rem", fontWeight: 500 }}>
						{uploading ? "Uploading..." : "Drop file here or click to upload"}
					</p>
					<p style={textStyle}>PDF, DOCX, or TXT (max {MAX_SIZE_MB}MB)</p>
				</div>
			</label>
			{error && <p style={errorStyle}>{error}</p>}
			{success && <p style={successStyle}>{success}</p>}
		</div>
	);
}
