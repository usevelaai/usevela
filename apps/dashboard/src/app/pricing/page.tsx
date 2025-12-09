"use client";

import { Check, MessageSquare, Sparkles, Zap } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";

const PLANS = [
	{
		id: "free",
		name: "Free",
		price: 0,
		messages: 100,
		description: "Perfect for trying out Vela",
		features: [
			"100 messages per month",
			"1 custom agent",
			"Basic knowledge sources",
			"Community support",
		],
		icon: MessageSquare,
		popular: false,
	},
	{
		id: "starter",
		name: "Starter",
		price: 9,
		messages: 2000,
		description: "Great for individuals and small projects",
		features: [
			"2,000 messages per month",
			"5 custom agents",
			"Document uploads (PDF, DOCX)",
			"Q&A knowledge sources",
			"Email support",
		],
		icon: Zap,
		popular: false,
		polarSlug: "Starter",
	},
	{
		id: "growth",
		name: "Growth",
		price: 29,
		messages: 15000,
		description: "For growing teams and businesses",
		features: [
			"15,000 messages per month",
			"Unlimited agents",
			"All knowledge source types",
			"Priority support",
			"Advanced analytics",
		],
		icon: Sparkles,
		popular: true,
		polarSlug: "Growth",
	},
	{
		id: "pro",
		name: "Pro",
		price: 99,
		messages: 50000,
		description: "For high-volume production workloads",
		features: [
			"50,000 messages per month",
			"Unlimited agents",
			"All knowledge source types",
			"Dedicated support",
			"Custom integrations",
			"API access",
		],
		icon: Sparkles,
		popular: false,
		polarSlug: "Pro",
	},
];

function PricingCard({
	plan,
	currentPlanId,
	isAuthenticated,
}: {
	plan: (typeof PLANS)[number];
	currentPlanId: string | null;
	isAuthenticated: boolean;
}) {
	const isCurrent = currentPlanId === plan.id;
	const isUpgrade =
		currentPlanId &&
		PLANS.findIndex((p) => p.id === plan.id) > PLANS.findIndex((p) => p.id === currentPlanId);
	const Icon = plan.icon;

	const handleUpgrade = () => {
		if (plan.polarSlug) {
			// Redirect to Polar checkout
			window.location.href = `/api/auth/checkout/${plan.polarSlug}`;
		}
	};

	return (
		<Card
			className={`relative flex flex-col ${plan.popular ? "border-primary shadow-lg scale-105 z-10" : "border-border"
				}`}
		>
			{plan.popular && (
				<div className="absolute -top-3 left-1/2 -translate-x-1/2">
					<span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
						Most Popular
					</span>
				</div>
			)}

			<CardHeader className="text-center pb-2">
				<div
					className={`mx-auto mb-4 p-3 rounded-full ${plan.popular ? "bg-primary/10" : "bg-muted"}`}
				>
					<Icon className={`h-6 w-6 ${plan.popular ? "text-primary" : "text-muted-foreground"}`} />
				</div>
				<CardTitle className="text-xl">{plan.name}</CardTitle>
				<CardDescription>{plan.description}</CardDescription>
			</CardHeader>

			<CardContent className="flex-1">
				<div className="text-center mb-6">
					<span className="text-4xl font-bold">${plan.price}</span>
					<span className="text-muted-foreground">/month</span>
					<p className="text-sm text-muted-foreground mt-1">
						{plan.messages.toLocaleString()} messages
					</p>
				</div>

				<ul className="space-y-3">
					{plan.features.map((feature) => (
						<li key={feature} className="flex items-start gap-2">
							<Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
							<span className="text-sm">{feature}</span>
						</li>
					))}
				</ul>
			</CardContent>

			<CardFooter className="pt-4">
				{!isAuthenticated ? (
					<Button asChild className="w-full" variant={plan.popular ? "default" : "outline"}>
						<Link href="/signup">Get Started</Link>
					</Button>
				) : isCurrent ? (
					<Button disabled className="w-full" variant="outline">
						Current Plan
					</Button>
				) : plan.id === "free" ? (
					<Button disabled className="w-full" variant="outline">
						Free Tier
					</Button>
				) : isUpgrade ? (
					<Button
						onClick={handleUpgrade}
						className="w-full"
						variant={plan.popular ? "default" : "outline"}
					>
						Upgrade to {plan.name}
					</Button>
				) : (
					<Button onClick={handleUpgrade} className="w-full" variant="outline">
						Switch to {plan.name}
					</Button>
				)}
			</CardFooter>
		</Card>
	);
}

export default function PricingPage() {
	const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		async function checkAuth() {
			try {
				const session = await authClient.getSession();
				if (session?.data?.user) {
					setIsAuthenticated(true);
					// Get current plan from user data or usage endpoint
					const response = await fetch(
						`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/usage`,
						{ credentials: "include" },
					);
					if (response.ok) {
						const data = await response.json();
						setCurrentPlanId(data.planId || "free");
					}
				}
			} catch (err) {
				console.error("Auth check failed:", err);
			} finally {
				setLoading(false);
			}
		}
		checkAuth();
	}, []);

	return (
		<div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
			{/* Header */}
			<header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
				<div className="container mx-auto px-4 py-4 flex justify-between items-center">
					<Link href="/" className="text-xl font-bold">
						Vela
					</Link>
					<nav className="flex items-center gap-4">
						{isAuthenticated ? (
							<Button asChild variant="ghost">
								<Link href="/">Dashboard</Link>
							</Button>
						) : (
							<>
								<Button asChild variant="ghost">
									<Link href="/login">Log in</Link>
								</Button>
								<Button asChild>
									<Link href="/signup">Sign up</Link>
								</Button>
							</>
						)}
					</nav>
				</div>
			</header>

			{/* Hero */}
			<section className="container mx-auto px-4 py-16 text-center">
				<h1 className="text-4xl md:text-5xl font-bold mb-4">Simple, Transparent Pricing</h1>
				<p className="text-xl text-muted-foreground max-w-2xl mx-auto">
					Choose the plan that fits your needs. Scale up as you grow. No hidden fees, cancel
					anytime.
				</p>
			</section>

			{/* Pricing Cards */}
			<section className="container mx-auto px-4 pb-16">
				{loading ? (
					<div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
						{[1, 2, 3, 4].map((i) => (
							<Card key={i} className="h-[480px] animate-pulse bg-muted/50" />
						))}
					</div>
				) : (
					<div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto items-start">
						{PLANS.map((plan) => (
							<PricingCard
								key={plan.id}
								plan={plan}
								currentPlanId={currentPlanId}
								isAuthenticated={isAuthenticated}
							/>
						))}
					</div>
				)}
			</section>

			{/* FAQ Section */}
			<section className="container mx-auto px-4 py-16 border-t">
				<h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
				<div className="max-w-3xl mx-auto grid gap-6">
					<div className="space-y-2">
						<h3 className="text-lg font-semibold">What counts as a message?</h3>
						<p className="text-muted-foreground">
							Each message you send to your AI agent counts as one message. Bot responses are not
							counted separately.
						</p>
					</div>
					<div className="space-y-2">
						<h3 className="text-lg font-semibold">What happens if I exceed my limit?</h3>
						<p className="text-muted-foreground">
							You won&apos;t be able to send new messages until your billing period resets or you
							upgrade to a higher plan.
						</p>
					</div>
					<div className="space-y-2">
						<h3 className="text-lg font-semibold">Can I change plans anytime?</h3>
						<p className="text-muted-foreground">
							Yes! You can upgrade or downgrade at any time. Changes take effect immediately, with
							prorated billing.
						</p>
					</div>
					<div className="space-y-2">
						<h3 className="text-lg font-semibold">Do unused messages roll over?</h3>
						<p className="text-muted-foreground">
							No, message limits reset at the start of each billing period. Unused messages do not
							carry over.
						</p>
					</div>
					<div className="space-y-2">
						<h3 className="text-lg font-semibold">Is there a free trial?</h3>
						<p className="text-muted-foreground">
							The Free plan gives you 100 messages per month to try out Vela. No credit card
							required.
						</p>
					</div>
				</div>
			</section>

			{/* CTA Section */}
			<section className="container mx-auto px-4 py-16 text-center border-t">
				<h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
				<p className="text-muted-foreground mb-8 max-w-xl mx-auto">
					Join thousands of users who are already building amazing AI-powered experiences with
					Vela.
				</p>
				{!isAuthenticated && (
					<Button asChild size="lg">
						<Link href="/signup">Start for Free</Link>
					</Button>
				)}
			</section>

			{/* Footer */}
			<footer className="border-t py-8">
				<div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
					&copy; {new Date().getFullYear()} Vela. All rights reserved.
				</div>
			</footer>
		</div>
	);
}
