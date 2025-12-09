"use client";

import {
	ArrowRight,
	Bot,
	BrainCircuit,
	Code2,
	FileText,
	Globe,
	History,
	Lock,
	MessageSquare,
	Palette,
	Settings2,
	Shield,
	Sparkles,
	Upload,
	Users,
	Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

function FeatureSection({
	title,
	description,
	features,
	reverse = false,
	gradient,
}: {
	title: string;
	description: string;
	features: { icon: React.ElementType; title: string; description: string }[];
	reverse?: boolean;
	gradient: string;
}) {
	const [isVisible, setIsVisible] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					setIsVisible(true);
				}
			},
			{ threshold: 0.1 }
		);

		if (ref.current) {
			observer.observe(ref.current);
		}

		return () => observer.disconnect();
	}, []);

	return (
		<div
			ref={ref}
			className={`grid lg:grid-cols-2 gap-16 items-center ${reverse ? "lg:flex-row-reverse" : ""}`}
		>
			<div className={`space-y-6 ${reverse ? "lg:order-2" : ""}`}>
				<h2 className="text-3xl font-bold leading-tight md:text-4xl text-neutral-900">
					{title}
				</h2>
				<p className="text-lg leading-relaxed text-neutral-600">{description}</p>
				<div className="pt-4 space-y-4">
					{features.map((feature, i) => {
						const Icon = feature.icon;
						return (
							<div
								key={feature.title}
								className={`flex gap-4 p-4 rounded-xl bg-white border border-neutral-100 shadow-sm transition-all duration-500 hover:shadow-md hover:border-neutral-200 ${isVisible
									? "opacity-100 translate-y-0"
									: "opacity-0 translate-y-4"
									}`}
								style={{ transitionDelay: `${i * 100}ms` }}
							>
								<div className="flex items-center justify-center w-10 h-10 rounded-lg bg-neutral-100 shrink-0">
									<Icon className="w-5 h-5 text-neutral-700" />
								</div>
								<div>
									<h3 className="mb-1 font-semibold text-neutral-900">
										{feature.title}
									</h3>
									<p className="text-sm text-neutral-600">{feature.description}</p>
								</div>
							</div>
						);
					})}
				</div>
			</div>
			<div className={`relative ${reverse ? "lg:order-1" : ""}`}>
				<div
					className={`aspect-square rounded-3xl ${gradient} p-8 flex items-center justify-center transition-all duration-700 ${isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
						}`}
				>
					<div className="flex items-center justify-center w-full h-full shadow-2xl rounded-2xl bg-white/90 backdrop-blur-sm shadow-neutral-900/10">
						<div className="p-8 text-center">
							<div className="flex items-center justify-center w-20 h-20 mx-auto mb-6 rounded-2xl bg-neutral-900">
								{(() => {
									const FirstIcon = features[0]?.icon;
									return FirstIcon ? <FirstIcon className="w-10 h-10 text-white" /> : null;
								})()}
							</div>
							<p className="text-2xl font-bold text-neutral-900">{title}</p>
						</div>
					</div>
				</div>
				{/* Decorative elements */}
				<div className="absolute w-24 h-24 rounded-full -top-4 -right-4 bg-amber-200/50 blur-2xl" />
				<div className="absolute w-32 h-32 rounded-full -bottom-4 -left-4 bg-orange-200/50 blur-2xl" />
			</div>
		</div>
	);
}

function StatCard({ value, label }: { value: string; label: string }) {
	return (
		<div className="p-8 text-center">
			<p className="mb-2 text-5xl font-bold text-white md:text-6xl">{value}</p>
			<p className="text-neutral-400">{label}</p>
		</div>
	);
}

export default function FeaturesPage() {
	return (
		<div className="min-h-screen bg-neutral-50">
			{/* Navigation */}
			<nav className="fixed top-0 left-0 right-0 z-50 border-b bg-white/80 backdrop-blur-xl border-neutral-100">
				<div className="flex items-center justify-between h-16 max-w-6xl px-6 mx-auto">
					<Link href="/" className="flex items-center gap-2">
						<div className="flex items-center justify-center w-8 h-8 rounded-lg bg-neutral-900">
							<MessageSquare className="w-4 h-4 text-white" />
						</div>
						<span className="text-lg font-semibold tracking-tight">Vela</span>
					</Link>
					<div className="items-center hidden gap-8 md:flex">
						<Link
							href="/features"
							className="text-sm font-medium transition-colors text-neutral-900"
						>
							Features
						</Link>
						<Link
							href="/pricing"
							className="text-sm transition-colors text-neutral-600 hover:text-neutral-900"
						>
							Pricing
						</Link>
						<Link
							href="/login"
							className="text-sm transition-colors text-neutral-600 hover:text-neutral-900"
						>
							Log in
						</Link>
						<Button asChild size="sm" className="px-4 rounded-full">
							<Link href="/signup">Get Started</Link>
						</Button>
					</div>
				</div>
			</nav>

			{/* Hero */}
			<section className="px-6 pt-32 pb-20 bg-white">
				<div className="max-w-4xl mx-auto text-center">
					<div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-100 text-neutral-700 text-sm font-medium mb-8">
						<Sparkles className="w-4 h-4" />
						Everything you need
					</div>
					<h1 className="text-4xl md:text-6xl font-bold text-neutral-900 leading-[1.1] tracking-tight mb-6">
						Powerful features for{" "}
						<span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600">
							exceptional support
						</span>
					</h1>
					<p className="max-w-2xl mx-auto mb-10 text-xl leading-relaxed text-neutral-600">
						Build, train, and deploy AI chatbots that truly understand your business.
						Every feature designed for scale, security, and simplicity.
					</p>
					<div className="flex flex-wrap justify-center gap-4">
						<Button asChild size="lg" className="h-12 px-8 text-base rounded-full">
							<Link href="/signup">
								Start Building Free
								<ArrowRight className="w-4 h-4 ml-2" />
							</Link>
						</Button>
					</div>
				</div>
			</section>

			{/* Quick Features Grid */}
			<section className="px-6 py-16 bg-white border-y border-neutral-200">
				<div className="max-w-6xl mx-auto">
					<div className="grid grid-cols-2 gap-8 md:grid-cols-4">
						{[
							{ icon: Bot, label: "Custom Agents" },
							{ icon: FileText, label: "Knowledge Base" },
							{ icon: Code2, label: "Easy Embed" },
							{ icon: Shield, label: "Enterprise Security" },
							{ icon: Zap, label: "Real-time Streaming" },
							{ icon: Palette, label: "Full Customization" },
							{ icon: History, label: "Chat History" },
							{ icon: Globe, label: "Multi-language" },
						].map(({ icon: Icon, label }) => (
							<div key={label} className="flex items-center justify-center gap-3">
								<div className="flex items-center justify-center w-10 h-10 rounded-xl bg-neutral-100">
									<Icon className="w-5 h-5 text-neutral-700" />
								</div>
								<span className="font-medium text-neutral-900">{label}</span>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Feature Sections */}
			<section className="px-6 py-24">
				<div className="max-w-6xl mx-auto space-y-32">
					{/* Knowledge Base */}
					<FeatureSection
						title="Train on your data"
						description="Upload your existing content and watch your AI become an expert on your business instantly."
						gradient="bg-gradient-to-br from-amber-100 to-orange-100"
						features={[
							{
								icon: Upload,
								title: "Document Upload",
								description:
									"PDF, DOCX, TXT files processed and indexed automatically.",
							},
							{
								icon: FileText,
								title: "Text Sources",
								description:
									"Add rich text content with formatting preserved.",
							},
							{
								icon: BrainCircuit,
								title: "Q&A Pairs",
								description:
									"Define exact question-answer pairs for precision responses.",
							},
						]}
					/>

					{/* Custom Agents */}
					<FeatureSection
						title="Multiple AI agents"
						description="Create specialized agents for different use cases, each with unique personalities and expertise."
						gradient="bg-gradient-to-br from-blue-100 to-indigo-100"
						reverse
						features={[
							{
								icon: Bot,
								title: "Custom Personalities",
								description:
									"Define tone, style, and behavior for each agent.",
							},
							{
								icon: Settings2,
								title: "Model Selection",
								description:
									"Choose from Claude models optimized for different tasks.",
							},
							{
								icon: Users,
								title: "Team Collaboration",
								description:
									"Share agents across your team with role-based access.",
							},
						]}
					/>

					{/* Widget Customization */}
					<FeatureSection
						title="Fully customizable"
						description="Make the chat widget your own with complete control over appearance and behavior."
						gradient="bg-gradient-to-br from-emerald-100 to-teal-100"
						features={[
							{
								icon: Palette,
								title: "Brand Colors",
								description:
									"Match your brand with custom colors and themes.",
							},
							{
								icon: MessageSquare,
								title: "Custom Messages",
								description:
									"Set welcome messages, placeholders, and suggestions.",
							},
							{
								icon: Globe,
								title: "Multi-language",
								description:
									"AI responds in your customer's preferred language.",
							},
						]}
					/>

					{/* Security */}
					<FeatureSection
						title="Enterprise security"
						description="Built-in protections to keep your data safe and prevent abuse."
						gradient="bg-gradient-to-br from-rose-100 to-pink-100"
						reverse
						features={[
							{
								icon: Shield,
								title: "Rate Limiting",
								description:
									"Prevent abuse with configurable message limits.",
							},
							{
								icon: Lock,
								title: "Domain Restrictions",
								description:
									"Control which websites can use your chat widget.",
							},
							{
								icon: History,
								title: "Audit Logs",
								description:
									"Complete conversation history for compliance.",
							},
						]}
					/>
				</div>
			</section>

			{/* Stats Section */}
			<section className="px-6 py-20 bg-neutral-900">
				<div className="max-w-6xl mx-auto">
					<div className="grid divide-y md:grid-cols-4 md:divide-y-0 md:divide-x divide-neutral-800">
						<StatCard value="99.9%" label="Uptime SLA" />
						<StatCard value="<100ms" label="Response Time" />
						<StatCard value="1M+" label="Messages/Month" />
						<StatCard value="24/7" label="AI Availability" />
					</div>
				</div>
			</section>

			{/* Integration Section */}
			<section className="px-6 py-24 bg-white">
				<div className="max-w-4xl mx-auto text-center">
					<h2 className="mb-4 text-3xl font-bold md:text-4xl text-neutral-900">
						One line of code
					</h2>
					<p className="mb-12 text-lg text-neutral-600">
						Add the chat widget to any website in seconds. Works with React, Vue, plain HTML, and more.
					</p>
					<div className="relative">
						<div className="p-6 overflow-x-auto text-left bg-neutral-900 rounded-2xl">
							<div className="flex items-center gap-2 mb-4">
								<div className="w-3 h-3 bg-red-500 rounded-full" />
								<div className="w-3 h-3 bg-yellow-500 rounded-full" />
								<div className="w-3 h-3 bg-green-500 rounded-full" />
							</div>
							<pre className="text-sm md:text-base">
								<code className="text-neutral-300">
									<span className="text-pink-400">&lt;script</span>{" "}
									<span className="text-amber-400">src</span>
									<span className="text-neutral-500">=</span>
									<span className="text-green-400">&quot;https://usevela.ai/widget.js&quot;</span>
									<span className="text-pink-400">&gt;&lt;/script&gt;</span>
								</code>
							</pre>
						</div>
					</div>
				</div>
			</section>

			{/* CTA */}
			<section className="px-6 py-24 bg-neutral-50">
				<div className="max-w-3xl mx-auto text-center">
					<h2 className="mb-4 text-3xl font-bold md:text-4xl text-neutral-900">
						Ready to build your AI assistant?
					</h2>
					<p className="mb-8 text-lg text-neutral-600">
						Start free with 100 messages per month. No credit card required.
					</p>
					<div className="flex flex-wrap justify-center gap-4">
						<Button asChild size="lg" className="h-12 px-8 text-base rounded-full">
							<Link href="/signup">
								Get Started Free
								<ArrowRight className="w-4 h-4 ml-2" />
							</Link>
						</Button>
						<Button
							asChild
							variant="outline"
							size="lg"
							className="h-12 px-8 text-base rounded-full"
						>
							<Link href="/pricing">View Pricing</Link>
						</Button>
					</div>
				</div>
			</section>

			{/* Footer */}
			<footer className="px-6 py-12 bg-white border-t border-neutral-200">
				<div className="flex flex-col items-center justify-between max-w-6xl gap-6 mx-auto md:flex-row">
					<div className="flex items-center gap-2">
						<div className="flex items-center justify-center w-6 h-6 rounded bg-neutral-900">
							<MessageSquare className="w-3 h-3 text-white" />
						</div>
						<span className="font-medium text-neutral-900">Vela</span>
					</div>
					<div className="flex items-center gap-6 text-sm text-neutral-600">
						<Link href="/features" className="transition-colors hover:text-neutral-900">
							Features
						</Link>
						<Link href="/pricing" className="transition-colors hover:text-neutral-900">
							Pricing
						</Link>
						<Link href="/privacy-policy" className="transition-colors hover:text-neutral-900">
							Privacy
						</Link>
					</div>
					<p className="text-sm text-neutral-500">© {new Date().getFullYear()} Vela</p>
				</div>
			</footer>
		</div>
	);
}
