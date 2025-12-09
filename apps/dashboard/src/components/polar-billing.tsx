"use client";

import { AlertTriangle, CreditCard, ExternalLink, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getUsage, type UsageData } from "@/lib/api";

function UsageProgress({ used, limit }: { used: number; limit: number }) {
	const percent = Math.min((used / limit) * 100, 100);
	const isWarning = percent >= 80;
	const isCritical = percent >= 95;

	return (
		<div className="space-y-2">
			<div className="flex justify-between text-sm">
				<span className="text-muted-foreground">Messages used</span>
				<span className="font-medium">
					{used.toLocaleString()} / {limit.toLocaleString()}
				</span>
			</div>
			<div className="h-3 overflow-hidden rounded-full bg-muted">
				<div
					className={`h-full transition-all duration-300 rounded-full ${isCritical ? "bg-destructive" : isWarning ? "bg-yellow-500" : "bg-primary"
						}`}
					style={{ width: `${percent}%` }}
				/>
			</div>
			<p className="text-xs text-muted-foreground">
				{(limit - used).toLocaleString()} messages remaining
			</p>
		</div>
	);
}

function PlanCard({
	name,
	price,
	messages,
	isCurrent,
}: {
	name: string;
	price: number;
	messages: number;
	isCurrent: boolean;
}) {
	return (
		<div
			className={`border rounded-lg p-4 ${isCurrent ? "border-primary bg-primary/5" : "border-border"
				}`}
		>
			<div className="flex items-start justify-between mb-2">
				<h4 className="font-semibold">{name}</h4>
				{isCurrent && (
					<span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
						Current
					</span>
				)}
			</div>
			<p className="text-2xl font-bold">
				${price}
				<span className="text-sm font-normal text-muted-foreground">/mo</span>
			</p>
			<p className="mt-1 text-sm text-muted-foreground">
				{messages.toLocaleString()} messages/month
			</p>
		</div>
	);
}

const PLANS = [
	{ id: "free", name: "Free", price: 0, messages: 100 },
	{ id: "starter", name: "Starter", price: 9, messages: 2000 },
	{ id: "growth", name: "Growth", price: 29, messages: 15000 },
	{ id: "pro", name: "Pro", price: 99, messages: 50000 },
];

export function PolarBilling() {
	const [usage, setUsage] = useState<UsageData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		async function fetchUsage() {
			try {
				const data = await getUsage();
				setUsage(data);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to load usage");
			} finally {
				setLoading(false);
			}
		}
		fetchUsage();
	}, []);

	const isNearLimit = usage && usage.percentUsed >= 80;

	return (
		<div className="max-w-4xl p-8 space-y-8">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-bold">Billing & Subscription</h1>
			</div>

			{/* Usage Overview */}
			<div className="p-6 space-y-4 border rounded-lg">
				<div className="flex items-center gap-3">
					<TrendingUp className="w-5 h-5 text-primary" />
					<h2 className="text-lg font-semibold">Usage Overview</h2>
				</div>

				{loading ? (
					<div className="space-y-3">
						<Skeleton className="w-48 h-4" />
						<Skeleton className="w-full h-3" />
						<Skeleton className="w-32 h-4" />
					</div>
				) : error ? (
					<p className="text-sm text-destructive">{error}</p>
				) : usage ? (
					<>
						<UsageProgress used={usage.used} limit={usage.limit} />
						{usage.billingPeriodEnd && (
							<p className="text-xs text-muted-foreground">
								Resets on{" "}
								{new Date(usage.billingPeriodEnd).toLocaleDateString("en-US", {
									month: "long",
									day: "numeric",
									year: "numeric",
								})}
							</p>
						)}
					</>
				) : null}

				{isNearLimit && (
					<div className="flex items-start gap-3 p-3 border rounded-lg bg-yellow-500/10 border-yellow-500/20">
						<AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
						<div>
							<p className="text-sm font-medium text-yellow-700">Approaching message limit</p>
							<p className="text-xs text-yellow-600">
								Consider upgrading your plan to avoid service interruption.
							</p>
						</div>
					</div>
				)}
			</div>

			{/* Current Plan */}
			<div className="p-6 space-y-4 border rounded-lg">
				<div className="flex items-center gap-3">
					<CreditCard className="w-5 h-5 text-primary" />
					<h2 className="text-lg font-semibold">Your Plan</h2>
				</div>

				{loading ? (
					<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
						{[1, 2, 3, 4].map((i) => (
							<Skeleton key={i} className="rounded-lg h-28" />
						))}
					</div>
				) : (
					<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
						{PLANS.map((plan) => (
							<PlanCard
								key={plan.id}
								name={plan.name}
								price={plan.price}
								messages={plan.messages}
								isCurrent={usage?.planId === plan.id}
							/>
						))}
					</div>
				)}
			</div>

			{/* Manage Subscription */}
			<div className="p-6 space-y-4 border rounded-lg">
				<h2 className="text-lg font-semibold">Manage Subscription</h2>
				<p className="text-sm text-muted-foreground">
					Upgrade, downgrade, or manage your payment methods through Polar.
				</p>
				<Button asChild>
					<Link
						href={`https://polar.sh/dashboard/${process.env.NEXT_PUBLIC_POLAR_ORGANIZATION_ID}`}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-2"
					>
						Open Polar Dashboard
						<ExternalLink className="w-4 h-4" />
					</Link>
				</Button>
			</div>
		</div>
	);
}
