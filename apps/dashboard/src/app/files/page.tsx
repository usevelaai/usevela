"use client";

import { FileUpload } from "@vela/ui";
import { useCallback, useEffect, useState } from "react";
import { AuthenticatedLayout } from "@/components/authenticated-layout";
import { Button } from "@/components/ui/button";
import { useAgent } from "@/lib/agent-context";
import { deleteDocument, listDocuments, uploadDocument } from "@/lib/api";

interface Document {
	id: string;
	filename: string;
	mimeType: string;
	size: number;
	createdAt: string;
}

export default function FilesPage() {
	const { currentAgent, isLoading: agentLoading } = useAgent();
	const [documents, setDocuments] = useState<Document[]>([]);
	const [loading, setLoading] = useState(true);

	const fetchDocuments = useCallback(async () => {
		if (!currentAgent) {
			setLoading(false);
			return;
		}
		setLoading(true);
		try {
			const docs = await listDocuments(currentAgent.id);
			setDocuments(docs);
		} catch (err) {
			console.error("Failed to fetch documents:", err);
		} finally {
			setLoading(false);
		}
	}, [currentAgent]);

	useEffect(() => {
		if (!agentLoading && currentAgent) {
			fetchDocuments();
		} else if (!agentLoading && !currentAgent) {
			setLoading(false);
		}
	}, [agentLoading, currentAgent, fetchDocuments]);

	const handleUpload = useCallback(
		async (file: File) => {
			if (!currentAgent) return;
			await uploadDocument(currentAgent.id, file);
			await fetchDocuments();
		},
		[currentAgent, fetchDocuments],
	);

	const handleDelete = useCallback(
		async (id: string) => {
			await deleteDocument(id);
			await fetchDocuments();
		},
		[fetchDocuments],
	);

	const formatSize = (bytes: number) => {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	};

	const renderDocuments = () => {
		if (loading) {
			return <p className="text-gray-500">Loading...</p>;
		}

		if (documents.length === 0) {
			return <p className="text-gray-500">No documents uploaded yet.</p>;
		}

		return (
			<div className="overflow-hidden border rounded-lg">
				{documents.map((doc) => (
					<div
						key={doc.id}
						className="flex items-center justify-between p-4 border-b last:border-b-0"
					>
						<div>
							<p className="font-medium">{doc.filename}</p>
							<p className="text-sm text-gray-500">
								{formatSize(doc.size)} &middot; {new Date(doc.createdAt).toLocaleDateString()}
							</p>
						</div>
						<Button variant="destructive" size="sm" onClick={() => handleDelete(doc.id)}>
							Delete
						</Button>
					</div>
				))}
			</div>
		);
	};

	return (
		<AuthenticatedLayout>
			<div className="max-w-3xl p-8">
				<h1 className="mb-6 text-2xl font-bold">Documents</h1>

				<FileUpload onUpload={handleUpload} />

				<div className="mt-8">
					<h2 className="mb-4 text-xl font-semibold">Uploaded Documents</h2>

					{renderDocuments()}
				</div>
			</div>
		</AuthenticatedLayout>
	);
}
