"use client";

import { Check, MessageSquare, Sparkles, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
		polarSlug: null,
	},
	{
		id: "starter",
		name: "Starter",
		price: 9,
		messages: 2000,
		description: "Great for individuals and small projects",
		features: [
			"2,000 messages per month",
			"1 custom agent",
			"Document uploads (PDF, DOCX)",
			"Q&A knowledge sources",
			"Email support",
		],
		icon: Zap,
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
			"1 custom agent",
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
			"3 custom agents",
			"All knowledge source types",
			"Dedicated support",
			"Custom integrations",
			"API access",
		],
		icon: Sparkles,
		polarSlug: "Pro",
	},
];

export default function ChoosePlanPage() {
	const router = useRouter();
	const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleSelectPlan = async (plan: (typeof PLANS)[number]) => {
		setSelectedPlan(plan.id);
		setLoading(true);
		setError(null);

		try {
			if (plan.polarSlug) {
				// Use Polar checkout via BetterAuth client
				await authClient.checkout({
					slug: plan.polarSlug,
				});
			} else {
				// Free plan - just go to dashboard
				router.push("/");
				router.refresh();
			}
		} catch (err) {
			console.error("Checkout error:", err);
			setError("Failed to start checkout. Please try again.");
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12 px-4">
			<div className="max-w-6xl mx-auto">
				<div className="text-center mb-12">
					<h1 className="text-4xl font-bold mb-4">Welcome to Vela! 🎉</h1>
					<p className="text-xl text-muted-foreground max-w-2xl mx-auto">
						Choose a plan to get started. You can always upgrade or change your plan later.
					</p>
					{error && <p className="mt-4 text-destructive text-sm">{error}</p>}
				</div>

				<div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
					{PLANS.map((plan) => {
						const Icon = plan.icon;
						const isSelected = selectedPlan === plan.id;
						const isLoading = isSelected && loading;

						return (
							<Card
								key={plan.id}
								className={`relative flex flex-col transition-all ${plan.popular
										? "border-primary shadow-lg scale-105 z-10"
										: "border-border hover:border-primary/50"
									} ${isSelected ? "ring-2 ring-primary" : ""}`}
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
										className={`mx-auto mb-4 p-3 rounded-full ${plan.popular ? "bg-primary/10" : "bg-muted"
											}`}
									>
										<Icon
											className={`h-6 w-6 ${plan.popular ? "text-primary" : "text-muted-foreground"
												}`}
										/>
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
												<Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
												<span className="text-sm">{feature}</span>
											</li>
										))}
									</ul>
								</CardContent>

								<CardFooter>
									<Button
										className="w-full"
										variant={plan.popular ? "default" : "outline"}
										onClick={() => handleSelectPlan(plan)}
										disabled={loading}
									>
										{isLoading ? "Redirecting..." : plan.price === 0 ? "Start Free" : "Get Started"}
									</Button>
								</CardFooter>
							</Card>
						);
					})}
				</div>

				<p className="text-center text-sm text-muted-foreground mt-8">
					All paid plans include a 14-day free trial. Cancel anytime.
				</p>
			</div>
		</div>
	);
}
