"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AuthenticatedLayout } from "@/components/authenticated-layout";
import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAgent } from "@/lib/agent-context";
import {
	createTextSource,
	deleteTextSource,
	getTextSource,
	listTextSources,
	type TextSource,
	updateTextSource,
} from "@/lib/api";

const textSourceSchema = z.object({
	title: z.string().min(1, "Title is required"),
	content: z.string().min(1, "Content is required"),
});

type TextSourceFormData = z.infer<typeof textSourceSchema>;

export default function TextSourcesPage() {
	const { currentAgent, isLoading: agentLoading } = useAgent();
	const [sources, setSources] = useState<TextSource[]>([]);
	const [loading, setLoading] = useState(true);
	const [editing, setEditing] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);

	const form = useForm<TextSourceFormData>({
		resolver: zodResolver(textSourceSchema),
		defaultValues: {
			title: "",
			content: "",
		},
	});

	const fetchSources = useCallback(async () => {
		if (!currentAgent) {
			setLoading(false);
			return;
		}
		setLoading(true);
		try {
			const data = await listTextSources(currentAgent.id);
			setSources(data);
		} catch (err) {
			console.error("Failed to fetch text sources:", err);
		} finally {
			setLoading(false);
		}
	}, [currentAgent]);

	useEffect(() => {
		if (!agentLoading && currentAgent) {
			fetchSources();
		} else if (!agentLoading && !currentAgent) {
			setLoading(false);
		}
	}, [agentLoading, currentAgent, fetchSources]);

	const handleNew = () => {
		setEditing("new");
		form.reset({ title: "", content: "" });
	};

	const handleEdit = async (id: string) => {
		try {
			const source = await getTextSource(id);
			setEditing(id);
			form.setValue("title", source.title);
			form.setValue("content", source.content || "");
		} catch (err) {
			console.error("Failed to load source:", err);
		}
	};

	const handleCancel = () => {
		setEditing(null);
		form.reset({ title: "", content: "" });
	};

	const onSubmit = async (data: TextSourceFormData) => {
		if (!currentAgent) return;
		setSaving(true);

		try {
			if (editing === "new") {
				await createTextSource(currentAgent.id, data.title, data.content);
			} else if (editing) {
				await updateTextSource(editing, data.title, data.content);
			}
			setEditing(null);
			form.reset({ title: "", content: "" });
			await fetchSources();
		} catch (err) {
			console.error("Failed to save:", err);
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async (id: string) => {
		if (!confirm("Delete this text source?")) return;

		try {
			await deleteTextSource(id);
			await fetchSources();
		} catch (err) {
			console.error("Failed to delete:", err);
		}
	};

	const renderSources = () => {
		if (loading) {
			return <p className="p-4 text-gray-500">Loading...</p>;
		}

		if (sources.length === 0) {
			return (
				<p className="p-4 text-gray-500">
					No text sources yet. Click &quot;Add Source&quot; to create one.
				</p>
			);
		}

		return sources.map((source) => (
			<div
				key={source.id}
				className="flex justify-between items-center p-4 border-b last:border-b-0"
			>
				<div>
					<p className="font-medium m-0">{source.title}</p>
					<p className="text-sm text-gray-500 mt-1">
						{new Date(source.createdAt).toLocaleDateString()}
					</p>
				</div>
				<div className="flex gap-2">
					<Button variant="outline" size="sm" onClick={() => handleEdit(source.id)}>
						Edit
					</Button>
					<Button variant="destructive" size="sm" onClick={() => handleDelete(source.id)}>
						Delete
					</Button>
				</div>
			</div>
		));
	};

	return (
		<AuthenticatedLayout>
			<div className="max-w-4xl p-8">
				<div className="flex items-center justify-between mb-6">
					<h1 className="m-0 text-2xl font-bold">Text Sources</h1>
					{!editing && <Button onClick={handleNew}>Add Source</Button>}
				</div>

				{editing && (
					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(onSubmit)}
							className="p-6 mb-6 space-y-4 border rounded-lg"
						>
							<h2 className="mt-0 mb-4 text-xl font-semibold">
								{editing === "new" ? "New Text Source" : "Edit Text Source"}
							</h2>
							<FormField
								control={form.control}
								name="title"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Title</FormLabel>
										<FormControl>
											<Input placeholder="Title" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="content"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Content</FormLabel>
										<FormControl>
											<Textarea
												placeholder="HTML content..."
												className="min-h-[300px] font-mono"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<div className="flex justify-end gap-2">
								<Button type="button" variant="outline" onClick={handleCancel}>
									Cancel
								</Button>
								<Button type="submit" disabled={saving}>
									{saving ? "Saving..." : "Save"}
								</Button>
							</div>
						</form>
					</Form>
				)}

				<div className="overflow-hidden border rounded-lg">
					{renderSources()}
				</div>
			</div>
		</AuthenticatedLayout>
	);
}
