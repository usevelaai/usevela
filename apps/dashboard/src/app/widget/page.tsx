"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthenticatedLayout } from "@/components/authenticated-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAgent } from "@/lib/agent-context";
import { getInterfaceSettings } from "@/lib/api";

const WIDGET_URL = process.env.NEXT_PUBLIC_WIDGET_URL || "http://localhost:3002";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface InterfaceSettings {
	theme: "light" | "dark";
	primaryColor: string;
	chatBubbleColor: string;
	displayName: string;
	profilePicture: string | null;
	initialMessage: string | null;
	suggestedMessages: string[];
	messagePlaceholder: string | null;
	footerMessage: string | null;
	dismissibleMessage: string | null;
	welcomeBubbles: string[] | null;
}

export default function WidgetPage() {
	const [copied, setCopied] = useState(false);
	const [settings, setSettings] = useState<InterfaceSettings | null>(null);
	const { currentAgent } = useAgent();

	// Fetch interface settings for the selected agent
	useEffect(() => {
		if (!currentAgent) return;

		getInterfaceSettings(currentAgent.id)
			.then(setSettings)
			.catch(console.error);
	}, [currentAgent]);

	// Generate the config object for the embed script
	const generateConfig = () => {
		if (!settings || !currentAgent) return {};
		return {
			url: WIDGET_URL,
			apiUrl: API_URL,
			agentId: currentAgent.id,
			theme: settings.theme,
			primaryColor: settings.primaryColor,
			chatBubbleColor: settings.chatBubbleColor,
			displayName: settings.displayName,
			profilePicture: settings.profilePicture,
			initialMessage: settings.initialMessage,
			suggestedMessages: settings.suggestedMessages,
			messagePlaceholder: settings.messagePlaceholder,
			footerMessage: settings.footerMessage,
			dismissibleMessage: settings.dismissibleMessage,
			welcomeBubbles: settings.welcomeBubbles || [],
		};
	};

	const embedScript = `<script>
window.__vela_config = ${JSON.stringify(generateConfig(), null, 2)};
</script>
<script src="${WIDGET_URL}/dist/embed.min.js" defer></script>`;

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(embedScript);
			setCopied(true);
			toast.success("Copied to clipboard");
			setTimeout(() => setCopied(false), 2000);
		} catch {
			toast.error("Failed to copy");
		}
	};

	return (
		<AuthenticatedLayout>
			<div className="max-w-4xl p-8">
				<h1 className="mb-6 text-2xl font-bold">Widget</h1>

				<Card>
					<CardHeader>
						<CardTitle>Embed Code</CardTitle>
						<CardDescription>
							Copy and paste this code into your website to add the chat widget. Place it before the
							closing &lt;/body&gt; tag.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="relative">
							<pre className="p-4 overflow-x-auto text-sm text-gray-100 bg-gray-900 rounded-lg">
								<code>{embedScript}</code>
							</pre>
							<Button
								size="sm"
								variant="secondary"
								className="absolute top-2 right-2"
								onClick={handleCopy}
							>
								{copied ? (
									<>
										<Check className="w-4 h-4 mr-1" />
										Copied
									</>
								) : (
									<>
										<Copy className="w-4 h-4 mr-1" />
										Copy
									</>
								)}
							</Button>
						</div>

						<div className="mt-6 space-y-4">
							<h3 className="font-medium">Installation</h3>
							<ol className="space-y-2 text-sm list-decimal list-inside text-muted-foreground">
								<li>Copy the embed code above</li>
								<li>Paste it into your website&apos;s HTML before the closing &lt;/body&gt; tag</li>
								<li>The chat widget will appear in the bottom-right corner</li>
							</ol>
						</div>
					</CardContent>
				</Card>
			</div>
		</AuthenticatedLayout>
	);
}
