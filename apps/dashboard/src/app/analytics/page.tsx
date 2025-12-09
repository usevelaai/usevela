"use client";

import { BarChart3, Globe, MessageSquare, ThumbsDown, ThumbsUp, TrendingUp, Wrench } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AuthenticatedLayout } from "@/components/authenticated-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import { useAgent } from "@/lib/agent-context";
import {
	type AnalyticsCountryData,
	type AnalyticsDailyData,
	type AnalyticsSummary,
	type AnalyticsToolData,
	getAnalyticsCountries,
	getAnalyticsDaily,
	getAnalyticsSummary,
	getAnalyticsTools,
} from "@/lib/api";

// Country code to name mapping (common ones)
const countryNames: Record<string, string> = {
	US: "United States",
	GB: "United Kingdom",
	CA: "Canada",
	AU: "Australia",
	DE: "Germany",
	FR: "France",
	JP: "Japan",
	BR: "Brazil",
	IN: "India",
	NL: "Netherlands",
	ES: "Spain",
	IT: "Italy",
	MX: "Mexico",
	KR: "South Korea",
	SG: "Singapore",
	SE: "Sweden",
	NO: "Norway",
	DK: "Denmark",
	FI: "Finland",
	PL: "Poland",
	CH: "Switzerland",
	AT: "Austria",
	BE: "Belgium",
	IE: "Ireland",
	NZ: "New Zealand",
	PT: "Portugal",
	AR: "Argentina",
	CL: "Chile",
	CO: "Colombia",
	ZA: "South Africa",
	AE: "UAE",
	IL: "Israel",
	TH: "Thailand",
	VN: "Vietnam",
	PH: "Philippines",
	MY: "Malaysia",
	ID: "Indonesia",
	TW: "Taiwan",
	HK: "Hong Kong",
	CN: "China",
	RU: "Russia",
};

function getCountryName(code: string): string {
	return countryNames[code] || code;
}

// Country flag emoji from code
function getCountryFlag(code: string): string {
	if (!code || code.length !== 2) return "🌍";
	const codePoints = code
		.toUpperCase()
		.split("")
		.map((char) => 127397 + char.charCodeAt(0));
	return String.fromCodePoint(...codePoints);
}

type DateRange = "7d" | "30d" | "90d";

export default function AnalyticsPage() {
	const { currentAgent, isLoading: agentLoading } = useAgent();
	const [dateRange, setDateRange] = useState<DateRange>("30d");
	const [loading, setLoading] = useState(true);
	const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
	const [dailyData, setDailyData] = useState<AnalyticsDailyData[]>([]);
	const [countryData, setCountryData] = useState<AnalyticsCountryData[]>([]);
	const [toolData, setToolData] = useState<AnalyticsToolData[]>([]);

	const getDateRange = useCallback((range: DateRange) => {
		const end = new Date();
		const start = new Date();
		switch (range) {
			case "7d":
				start.setDate(start.getDate() - 7);
				break;
			case "30d":
				start.setDate(start.getDate() - 30);
				break;
			case "90d":
				start.setDate(start.getDate() - 90);
				break;
		}
		return {
			startDate: start.toISOString().split("T")[0],
			endDate: end.toISOString().split("T")[0],
		};
	}, []);

	const fetchAnalytics = useCallback(async () => {
		if (!currentAgent) {
			setLoading(false);
			return;
		}

		setLoading(true);
		try {
			const { startDate, endDate } = getDateRange(dateRange);

			const [summaryData, daily, countries, tools] = await Promise.all([
				getAnalyticsSummary(currentAgent.id, startDate, endDate),
				getAnalyticsDaily(currentAgent.id, startDate, endDate),
				getAnalyticsCountries(currentAgent.id, startDate, endDate),
				getAnalyticsTools(currentAgent.id, startDate, endDate),
			]);

			setSummary(summaryData);
			setDailyData(daily);
			setCountryData(countries);
			setToolData(tools);
		} catch (err) {
			console.error("Failed to fetch analytics:", err);
		} finally {
			setLoading(false);
		}
	}, [currentAgent, dateRange, getDateRange]);

	useEffect(() => {
		if (!agentLoading && currentAgent) {
			fetchAnalytics();
		} else if (!agentLoading && !currentAgent) {
			setLoading(false);
		}
	}, [agentLoading, currentAgent, fetchAnalytics]);

	// Find max for chart scaling
	const maxConversations = Math.max(...dailyData.map((d) => d.conversations), 1);
	const maxMessages = Math.max(...dailyData.map((d) => d.messages), 1);

	if (loading) {
		return (
			<AuthenticatedLayout>
				<div className="p-6">
					<p className="text-muted-foreground">Loading analytics...</p>
				</div>
			</AuthenticatedLayout>
		);
	}

	if (!currentAgent) {
		return (
			<AuthenticatedLayout>
				<Empty className="my-16">
					<EmptyContent>
						<EmptyMedia variant="icon">
							<BarChart3 />
						</EmptyMedia>
						<EmptyTitle>No agent selected</EmptyTitle>
						<EmptyDescription>Select an agent to view analytics.</EmptyDescription>
					</EmptyContent>
				</Empty>
			</AuthenticatedLayout>
		);
	}

	return (
		<AuthenticatedLayout>
			<div className="p-6 max-w-screen-xl space-y-6">
				{/* Header */}
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-bold">Analytics</h1>
					<div className="flex gap-2">
						<Button
							variant={dateRange === "7d" ? "default" : "outline"}
							size="sm"
							onClick={() => setDateRange("7d")}
						>
							7 days
						</Button>
						<Button
							variant={dateRange === "30d" ? "default" : "outline"}
							size="sm"
							onClick={() => setDateRange("30d")}
						>
							30 days
						</Button>
						<Button
							variant={dateRange === "90d" ? "default" : "outline"}
							size="sm"
							onClick={() => setDateRange("90d")}
						>
							90 days
						</Button>
					</div>
				</div>

				{/* Summary Cards */}
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
					<Card>
						<CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
							<CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
							<MessageSquare className="w-4 h-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">{summary?.totalConversations.toLocaleString() || 0}</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
							<CardTitle className="text-sm font-medium">Total Messages</CardTitle>
							<TrendingUp className="w-4 h-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">{summary?.totalMessages.toLocaleString() || 0}</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
							<CardTitle className="text-sm font-medium">Avg Messages/Conv</CardTitle>
							<BarChart3 className="w-4 h-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">{summary?.avgMessagesPerConversation || 0}</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
							<CardTitle className="text-sm font-medium">Feedback Score</CardTitle>
							<ThumbsUp className="w-4 h-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
								{summary && (summary.thumbsUp + summary.thumbsDown) > 0
									? `${Math.round(summary.feedbackRatio * 100)}%`
									: "N/A"}
							</div>
							<p className="text-xs text-muted-foreground">
								<ThumbsUp className="inline w-3 h-3 mr-1" />
								{summary?.thumbsUp || 0}
								<ThumbsDown className="inline w-3 h-3 mx-1 ml-2" />
								{summary?.thumbsDown || 0}
							</p>
						</CardContent>
					</Card>
				</div>

				{/* Charts */}
				<div className="grid gap-4 lg:grid-cols-2">
					{/* Conversations Chart */}
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Conversations Over Time</CardTitle>
						</CardHeader>
						<CardContent>
							{dailyData.length === 0 ? (
								<p className="py-8 text-center text-muted-foreground">No data available</p>
							) : (
								<div className="space-y-1">
									{dailyData.slice(-14).map((day) => (
										<div key={day.date} className="flex items-center gap-2 text-sm">
											<span className="w-20 text-xs text-muted-foreground shrink-0">
												{new Date(day.date).toLocaleDateString("en-US", {
													month: "short",
													day: "numeric",
												})}
											</span>
											<div className="flex-1 h-4 overflow-hidden bg-gray-100 rounded">
												<div
													className="h-full transition-all bg-blue-500 rounded"
													style={{
														width: `${(day.conversations / maxConversations) * 100}%`,
													}}
												/>
											</div>
											<span className="w-8 text-xs text-right">{day.conversations}</span>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>

					{/* Messages Chart */}
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Messages Over Time</CardTitle>
						</CardHeader>
						<CardContent>
							{dailyData.length === 0 ? (
								<p className="py-8 text-center text-muted-foreground">No data available</p>
							) : (
								<div className="space-y-1">
									{dailyData.slice(-14).map((day) => (
										<div key={day.date} className="flex items-center gap-2 text-sm">
											<span className="w-20 text-xs text-muted-foreground shrink-0">
												{new Date(day.date).toLocaleDateString("en-US", {
													month: "short",
													day: "numeric",
												})}
											</span>
											<div className="flex-1 h-4 overflow-hidden bg-gray-100 rounded">
												<div
													className="h-full transition-all bg-green-500 rounded"
													style={{
														width: `${(day.messages / maxMessages) * 100}%`,
													}}
												/>
											</div>
											<span className="w-8 text-xs text-right">{day.messages}</span>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>
				</div>

				{/* Tool Usage */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-base">
							<Wrench className="w-4 h-4" />
							Tool Usage
						</CardTitle>
					</CardHeader>
					<CardContent>
						{toolData.length === 0 ? (
							<p className="py-8 text-center text-muted-foreground">No tool usage data available</p>
						) : (
							<div className="overflow-x-auto">
								<table className="w-full text-sm">
									<thead>
										<tr className="border-b">
											<th className="py-2 text-left font-medium">Tool Name</th>
											<th className="py-2 text-right font-medium">Executions</th>
											<th className="py-2 text-right font-medium">Success Rate</th>
											<th className="py-2 text-right font-medium">Avg Time</th>
										</tr>
									</thead>
									<tbody>
										{toolData.map((tool) => (
											<tr key={tool.toolName} className="border-b last:border-0">
												<td className="py-3">
													<code className="text-sm bg-gray-100 px-2 py-1 rounded">
														{tool.toolName}
													</code>
												</td>
												<td className="py-3 text-right">
													{tool.executionCount.toLocaleString()}
												</td>
												<td className="py-3 text-right">
													<Badge
														variant={tool.successRate >= 0.9 ? "default" : tool.successRate >= 0.7 ? "secondary" : "destructive"}
													>
														{Math.round(tool.successRate * 100)}%
													</Badge>
												</td>
												<td className="py-3 text-right text-muted-foreground">
													{tool.avgExecutionTimeMs}ms
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</CardContent>
				</Card>

				{/* Country Breakdown */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-base">
							<Globe className="w-4 h-4" />
							Conversations by Country
						</CardTitle>
					</CardHeader>
					<CardContent>
						{countryData.length === 0 ? (
							<p className="py-8 text-center text-muted-foreground">No country data available</p>
						) : (
							<div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
								{countryData.slice(0, 12).map((country) => (
									<div
										key={country.countryCode}
										className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
									>
										<div className="flex items-center gap-2">
											<span className="text-lg">{getCountryFlag(country.countryCode)}</span>
											<span className="text-sm font-medium">
												{getCountryName(country.countryCode)}
											</span>
										</div>
										<span className="text-sm text-muted-foreground">
											{country.conversationCount.toLocaleString()}
										</span>
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</AuthenticatedLayout>
	);
}
