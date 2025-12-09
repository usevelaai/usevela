"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { HelpCircle, Plus, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { AuthenticatedLayout } from "@/components/authenticated-layout";
import { Button } from "@/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAgent } from "@/lib/agent-context";
import {
	createQaSource,
	deleteQaSource,
	getQaSource,
	listQaSources,
	type QaSource,
	updateQaSource,
} from "@/lib/api";

const qaSourceSchema = z.object({
	questions: z
		.array(z.object({ value: z.string().min(1, "Question is required") }))
		.min(1, "At least one question is required"),
	answer: z.string().min(1, "Answer is required"),
});

type QaSourceFormData = z.infer<typeof qaSourceSchema>;

export default function QaSourcesPage() {
	const { currentAgent, isLoading: agentLoading } = useAgent();
	const [sources, setSources] = useState<QaSource[]>([]);
	const [loading, setLoading] = useState(true);
	const [editing, setEditing] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);

	const form = useForm<QaSourceFormData>({
		resolver: zodResolver(qaSourceSchema),
		defaultValues: {
			questions: [{ value: "" }],
			answer: "",
		},
	});

	const { fields, append, remove } = useFieldArray({
		control: form.control,
		name: "questions",
	});

	const fetchSources = useCallback(async () => {
		if (!currentAgent) {
			setLoading(false);
			return;
		}
		setLoading(true);
		try {
			const data = await listQaSources(currentAgent.id);
			setSources(data);
		} catch (err) {
			console.error("Failed to fetch Q&A sources:", err);
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
		form.reset({ questions: [{ value: "" }], answer: "" });
	};

	const handleEdit = async (id: string) => {
		try {
			const source = await getQaSource(id);
			setEditing(id);
			form.reset({
				questions: source.questions.map((q) => ({ value: q })),
				answer: source.answer,
			});
		} catch (err) {
			console.error("Failed to load source:", err);
		}
	};

	const handleCancel = () => {
		setEditing(null);
		form.reset({ questions: [{ value: "" }], answer: "" });
	};

	const onSubmit = async (data: QaSourceFormData) => {
		if (!currentAgent) return;
		setSaving(true);

		try {
			const questions = data.questions.map((q) => q.value);

			if (editing === "new") {
				await createQaSource(currentAgent.id, questions, data.answer);
			} else if (editing) {
				await updateQaSource(editing, questions, data.answer);
			}
			setEditing(null);
			form.reset({ questions: [{ value: "" }], answer: "" });
			await fetchSources();
		} catch (err) {
			console.error("Failed to save:", err);
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async (id: string) => {
		if (!confirm("Delete this Q&A?")) return;

		try {
			await deleteQaSource(id);
			await fetchSources();
		} catch (err) {
			console.error("Failed to delete:", err);
		}
	};

	const renderSources = () => {
		if (loading || agentLoading) {
			return <p className="p-4 text-gray-500">Loading...</p>;
		}

		if (!currentAgent) {
			return (
				<p className="p-4 text-gray-500">
					No agent selected. Please select or create an agent.
				</p>
			);
		}

		if (sources.length === 0) {
			return (
				<Empty className="my-8">
					<EmptyContent>
						<EmptyMedia variant="icon">
							<HelpCircle />
						</EmptyMedia>
						<EmptyTitle>No Q&A sources yet</EmptyTitle>
						<EmptyDescription>
							Add question-answer pairs to train your AI with specific responses.
						</EmptyDescription>
					</EmptyContent>
				</Empty>
			);
		}

		return sources.map((source) => (
			<div
				key={source.id}
				className="flex items-start justify-between p-4 border-b last:border-b-0"
			>
				<div className="flex-1 min-w-0">
					<div className="space-y-1">
						{source.questions.slice(0, 2).map((q, idx) => (
							<p key={`${source.id}-q-${idx}`} className="m-0 font-medium truncate">
								{q}
							</p>
						))}
						{source.questions.length > 2 && (
							<p className="text-sm text-muted-foreground">
								+{source.questions.length - 2} more question
								{source.questions.length - 2 > 1 ? "s" : ""}
							</p>
						)}
					</div>
					<p className="mt-2 text-sm text-gray-500">
						{new Date(source.createdAt).toLocaleDateString()}
					</p>
				</div>
				<div className="flex gap-2 ml-4">
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
					<h1 className="m-0 text-2xl font-bold">Q&A Sources</h1>
					{!editing && <Button onClick={handleNew}>Add Q&A</Button>}
				</div>

				{editing && (
					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(onSubmit)}
							className="p-6 mb-6 space-y-4 border rounded-lg"
						>
							<h2 className="mt-0 mb-4 text-xl font-semibold">
								{editing === "new" ? "New Q&A" : "Edit Q&A"}
							</h2>

							<div className="space-y-3">
								<Label>
									Questions{" "}
									<span className="text-sm font-normal text-muted-foreground">
										(triggers for this answer)
									</span>
								</Label>
								{fields.map((field, index) => (
									<FormField
										key={field.id}
										control={form.control}
										name={`questions.${index}.value`}
										render={({ field }) => (
											<FormItem>
												<div className="flex gap-2">
													<FormControl>
														<Input placeholder={`Question ${index + 1}`} {...field} />
													</FormControl>
													{fields.length > 1 && (
														<Button
															type="button"
															variant="ghost"
															size="icon"
															onClick={() => remove(index)}
														>
															<X className="w-4 h-4" />
														</Button>
													)}
												</div>
												<FormMessage />
											</FormItem>
										)}
									/>
								))}
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => append({ value: "" })}
								>
									<Plus className="w-4 h-4 mr-1" />
									Add Question
								</Button>
							</div>

							<FormField
								control={form.control}
								name="answer"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Answer (HTML supported)</FormLabel>
										<FormControl>
											<Textarea
												placeholder="Enter the answer..."
												className="min-h-[200px]"
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
