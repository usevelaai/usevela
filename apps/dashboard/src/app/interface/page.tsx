"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Palette, Plus, Trash2, Upload, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { AuthenticatedLayout } from "@/components/authenticated-layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAgent } from "@/lib/agent-context";
import {
	deleteProfilePicture,
	getInterfaceSettings,
	updateInterfaceSettings,
	uploadProfilePicture,
} from "@/lib/api";

const settingsSchema = z.object({
	theme: z.enum(["light", "dark"]),
	primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color"),
	chatBubbleColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color"),
	chatBubbleAlign: z.enum(["left", "right"]),
	displayName: z.string().min(1, "Display name is required").max(100),
	initialMessage: z.string().max(500).nullable(),
	suggestedMessages: z.array(z.object({ value: z.string().max(200) })),
	messagePlaceholder: z.string().max(100).nullable(),
	footerMessage: z.string().max(200).nullable(),
	dismissibleMessage: z.string().max(500).nullable(),
	welcomeBubbles: z.array(z.object({ value: z.string().max(150) })).max(5),
	collectUserFeedback: z.boolean(),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export default function InterfaceSettingsPage() {
	const { currentAgent, isLoading: agentLoading } = useAgent();
	const [loading, setLoading] = useState(true);
	const [profilePicture, setProfilePicture] = useState<string | null>(null);
	const [uploading, setUploading] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const form = useForm<SettingsFormData>({
		resolver: zodResolver(settingsSchema),
		defaultValues: {
			theme: "light",
			primaryColor: "#3b82f6",
			chatBubbleColor: "#3b82f6",
			chatBubbleAlign: "right",
			displayName: "AI Assistant",
			initialMessage: "Hello! How can I help you today?",
			suggestedMessages: [],
			messagePlaceholder: "Type a message...",
			footerMessage: null,
			dismissibleMessage: null,
			welcomeBubbles: [],
			collectUserFeedback: false,
		},
	});

	const {
		fields: suggestedFields,
		append: appendSuggested,
		remove: removeSuggested,
	} = useFieldArray({
		control: form.control,
		name: "suggestedMessages",
	});
	const {
		fields: welcomeFields,
		append: appendWelcome,
		remove: removeWelcome,
	} = useFieldArray({
		control: form.control,
		name: "welcomeBubbles",
	});

	const fetchSettings = useCallback(async () => {
		if (!currentAgent) {
			setLoading(false);
			return;
		}
		setLoading(true);
		try {
			const settings = await getInterfaceSettings(currentAgent.id);
			setProfilePicture(settings.profilePicture);
			form.reset({
				theme: settings.theme,
				primaryColor: settings.primaryColor,
				chatBubbleColor: settings.chatBubbleColor,
				chatBubbleAlign: settings.chatBubbleAlign,
				displayName: settings.displayName,
				initialMessage: settings.initialMessage,
				suggestedMessages: (settings.suggestedMessages || []).map((msg) => ({ value: msg })),
				messagePlaceholder: settings.messagePlaceholder,
				footerMessage: settings.footerMessage,
				dismissibleMessage: settings.dismissibleMessage,
				welcomeBubbles: (settings.welcomeBubbles || []).map((msg) => ({ value: msg })),
				collectUserFeedback: settings.collectUserFeedback,
			});
		} catch (err) {
			console.error("Failed to fetch settings:", err);
			toast.error("Failed to load settings");
		} finally {
			setLoading(false);
		}
	}, [form, currentAgent]);

	useEffect(() => {
		if (!agentLoading && currentAgent) {
			fetchSettings();
		} else if (!agentLoading && !currentAgent) {
			setLoading(false);
		}
	}, [agentLoading, currentAgent, fetchSettings]);

	const onSubmit = async (data: SettingsFormData) => {
		if (!currentAgent) return;
		try {
			await updateInterfaceSettings(currentAgent.id, {
				...data,
				suggestedMessages: data.suggestedMessages.map((m) => m.value).filter((v) => v.trim()),
				welcomeBubbles: data.welcomeBubbles.map((m) => m.value).filter((v) => v.trim()),
			});
			toast.success("Settings saved. Update your widget embed code to apply changes.", {
				duration: 5000,
			});
		} catch (err) {
			console.error("Failed to save settings:", err);
			toast.error("Failed to save settings");
		}
	};

	const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
		if (!currentAgent) return;
		const file = e.target.files?.[0];
		if (!file) return;

		setUploading(true);
		try {
			const result = await uploadProfilePicture(currentAgent.id, file);
			setProfilePicture(result.url);
			toast.success("Profile picture uploaded");
		} catch (err) {
			console.error("Failed to upload:", err);
			toast.error((err as Error).message);
		} finally {
			setUploading(false);
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
		}
	};

	const handleRemoveProfilePicture = async () => {
		if (!currentAgent) return;
		try {
			await deleteProfilePicture(currentAgent.id);
			setProfilePicture(null);
			toast.success("Profile picture removed");
		} catch (err) {
			console.error("Failed to remove:", err);
			toast.error("Failed to remove profile picture");
		}
	};

	if (loading) {
		return (
			<AuthenticatedLayout>
				<div className="max-w-4xl p-8">
					<p className="text-gray-500">Loading...</p>
				</div>
			</AuthenticatedLayout>
		);
	}

	return (
		<AuthenticatedLayout>
			<div className="max-w-4xl p-8">
				<div className="flex items-center gap-3 mb-6">
					<Palette className="w-8 h-8" />
					<h1 className="text-3xl font-bold">Interface Settings</h1>
				</div>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
						{/* Theme & Colors Section */}
						<div className="p-6 space-y-6 border rounded-lg">
							<h2 className="text-xl font-semibold">Appearance</h2>

							<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
								<FormField
									control={form.control}
									name="theme"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Theme</FormLabel>
											<Select onValueChange={field.onChange} defaultValue={field.value}>
												<FormControl>
													<SelectTrigger>
														<SelectValue placeholder="Select theme" />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													<SelectItem value="light">Light</SelectItem>
													<SelectItem value="dark">Dark</SelectItem>
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="chatBubbleAlign"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Chat Bubble Alignment</FormLabel>
											<Select onValueChange={field.onChange} defaultValue={field.value}>
												<FormControl>
													<SelectTrigger>
														<SelectValue placeholder="Select alignment" />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													<SelectItem value="right">Right</SelectItem>
													<SelectItem value="left">Left</SelectItem>
												</SelectContent>
											</Select>
											<FormDescription>Position of user messages in the chat</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="primaryColor"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Primary Color</FormLabel>
											<div className="flex gap-2">
												<FormControl>
													<Input type="color" className="w-12 h-10 p-1" {...field} />
												</FormControl>
												<Input
													placeholder="#3b82f6"
													value={field.value}
													onChange={field.onChange}
													className="flex-1"
												/>
											</div>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="chatBubbleColor"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Chat Bubble Color</FormLabel>
											<div className="flex gap-2">
												<FormControl>
													<Input type="color" className="w-12 h-10 p-1" {...field} />
												</FormControl>
												<Input
													placeholder="#3b82f6"
													value={field.value}
													onChange={field.onChange}
													className="flex-1"
												/>
											</div>
											<FormDescription>Color of user message bubbles</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						</div>

						{/* Branding Section */}
						<div className="p-6 space-y-6 border rounded-lg">
							<h2 className="text-xl font-semibold">Branding</h2>

							<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
								<FormField
									control={form.control}
									name="displayName"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Display Name</FormLabel>
											<FormControl>
												<Input placeholder="AI Assistant" {...field} />
											</FormControl>
											<FormDescription>Name shown in the chat header</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>

								<div>
									<Label>Profile Picture</Label>
									<div className="flex items-center gap-4 mt-2">
										{profilePicture ? (
											<div className="relative">
												<Image
													src={profilePicture}
													alt="Profile"
													width={64}
													height={64}
													className="object-cover w-16 h-16 rounded-full"
												/>
												<button
													type="button"
													onClick={handleRemoveProfilePicture}
													className="absolute p-1 text-white bg-red-500 rounded-full -top-1 -right-1 hover:bg-red-600"
												>
													<X className="w-3 h-3" />
												</button>
											</div>
										) : (
											<div className="flex items-center justify-center w-16 h-16 bg-gray-200 rounded-full">
												<Upload className="w-6 h-6 text-gray-400" />
											</div>
										)}
										<div>
											<input
												ref={fileInputRef}
												type="file"
												accept="image/jpeg,image/png,image/gif,image/webp"
												onChange={handleFileSelect}
												className="hidden"
											/>
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={() => fileInputRef.current?.click()}
												disabled={uploading}
											>
												{uploading ? "Uploading..." : "Upload Image"}
											</Button>
											<p className="mt-1 text-xs text-gray-500">Max 2MB. JPG, PNG, GIF, WebP</p>
										</div>
									</div>
								</div>
							</div>
						</div>

						{/* Messages Section */}
						<div className="p-6 space-y-6 border rounded-lg">
							<h2 className="text-xl font-semibold">Messages</h2>

							<FormField
								control={form.control}
								name="initialMessage"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Initial Message</FormLabel>
										<FormControl>
											<Textarea
												placeholder="Hello! How can I help you today?"
												{...field}
												value={field.value || ""}
											/>
										</FormControl>
										<FormDescription>First message shown when chat opens</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<div>
								<Label>Suggested Messages</Label>
								<p className="mb-2 text-sm text-muted-foreground">
									Quick reply options shown to users
								</p>
								<div className="space-y-2">
									{suggestedFields.map((field, index) => (
										<div key={field.id} className="flex gap-2">
											<FormField
												control={form.control}
												name={`suggestedMessages.${index}.value`}
												render={({ field }) => (
													<FormItem className="flex-1">
														<FormControl>
															<Input placeholder="e.g., What are your hours?" {...field} />
														</FormControl>
													</FormItem>
												)}
											/>
											<Button
												type="button"
												variant="outline"
												size="icon"
												onClick={() => removeSuggested(index)}
											>
												<Trash2 className="w-4 h-4" />
											</Button>
										</div>
									))}
									{suggestedFields.length < 5 && (
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() => appendSuggested({ value: "" })}
										>
											<Plus className="w-4 h-4 mr-2" />
											Add Suggestion
										</Button>
									)}
								</div>
							</div>

							<FormField
								control={form.control}
								name="messagePlaceholder"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Message Placeholder</FormLabel>
										<FormControl>
											<Input placeholder="Type a message..." {...field} value={field.value || ""} />
										</FormControl>
										<FormDescription>Placeholder text in the message input</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="dismissibleMessage"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Dismissible Message</FormLabel>
										<FormControl>
											<Textarea
												placeholder="Optional banner message users can dismiss"
												{...field}
												value={field.value || ""}
											/>
										</FormControl>
										<FormDescription>Optional banner that users can close</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="footerMessage"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Footer Message</FormLabel>
										<FormControl>
											<Input
												placeholder="Powered by Vela"
												{...field}
												value={field.value || ""}
											/>
										</FormControl>
										<FormDescription>Text shown at the bottom of the chat</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="dismissibleMessage"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Dismissible Banner</FormLabel>
										<FormControl>
											<Input
												placeholder="This is an AI assistant. Responses may not be accurate."
												{...field}
												value={field.value || ""}
											/>
										</FormControl>
										<FormDescription>
											A dismissible message shown above the input field (leave empty to hide)
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<div>
								<Label>Welcome Bubbles</Label>
								<p className="mb-2 text-sm text-muted-foreground">
									Add up to 5 messages. One will be shown above the chat icon (rotates/random).
								</p>
								{welcomeFields.map((field, idx) => (
									<div key={field.id} className="flex items-center gap-2 mt-2">
										<FormField
											control={form.control}
											name={`welcomeBubbles.${idx}.value`}
											render={({ field }) => (
												<FormItem className="flex-1">
													<FormControl>
														<Input
															placeholder="👋 Hi! Need help? Click to chat!"
															{...field}
														/>
													</FormControl>
												</FormItem>
											)}
										/>
										<Button type="button" variant="ghost" size="icon" onClick={() => removeWelcome(idx)}>
											<Trash2 className="w-4 h-4" />
										</Button>
									</div>
								))}
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="mt-2"
									onClick={() => appendWelcome({ value: "" })}
									disabled={welcomeFields.length >= 5}
								>
									<Plus className="w-4 h-4 mr-1" /> Add Bubble
								</Button>
							</div>
						</div>						{/* Features Section */}
						<div className="p-6 space-y-6 border rounded-lg">
							<h2 className="text-xl font-semibold">Features</h2>

							<FormField
								control={form.control}
								name="collectUserFeedback"
								render={({ field }) => (
									<FormItem className="flex flex-row items-center space-x-3 space-y-0">
										<FormControl>
											<Checkbox checked={field.value} onCheckedChange={field.onChange} />
										</FormControl>
										<div className="space-y-1 leading-none">
											<FormLabel className="cursor-pointer">Collect User Feedback</FormLabel>
											<FormDescription>
												Show thumbs up/down buttons on assistant messages
											</FormDescription>
										</div>
									</FormItem>
								)}
							/>
						</div>

						<div className="flex justify-end">
							<Button type="submit" disabled={form.formState.isSubmitting}>
								{form.formState.isSubmitting ? "Saving..." : "Save Settings"}
							</Button>
						</div>
					</form>
				</Form>
			</div>
		</AuthenticatedLayout>
	);
}
