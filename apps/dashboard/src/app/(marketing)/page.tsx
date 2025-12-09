"use client";

import {
	ArrowRight,
	Bot,
	Code2,
	FileText,
	MessageSquare,
	Shield,
	Sparkles,
	Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const DEMO_MESSAGES = [
	{ role: "user", content: "What are your business hours?" },
	{
		role: "assistant",
		content: "We're open Monday through Friday, 9 AM to 6 PM EST. How can I help you today?",
	},
	{ role: "user", content: "Do you offer refunds?" },
	{
		role: "assistant",
		content:
			"Yes! We offer a 30-day money-back guarantee on all plans. No questions asked.",
	},
];

function ChatDemo() {
	const [visibleMessages, setVisibleMessages] = useState<number>(0);
	const [isTyping, setIsTyping] = useState(false);

	useEffect(() => {
		if (visibleMessages >= DEMO_MESSAGES.length) return;

		const timer = setTimeout(
			() => {
				if (DEMO_MESSAGES[visibleMessages]?.role === "assistant") {
					setIsTyping(true);
					setTimeout(() => {
						setIsTyping(false);
						setVisibleMessages((v) => v + 1);
					}, 800);
				} else {
					setVisibleMessages((v) => v + 1);
				}
			},
			visibleMessages === 0 ? 1000 : 2000
		);

		return () => clearTimeout(timer);
	}, [visibleMessages]);

	return (
		<div className="w-full max-w-sm mx-auto">
			<div className="overflow-hidden bg-white border shadow-2xl rounded-2xl border-neutral-200 shadow-neutral-900/10">
				{/* Chat Header */}
				<div className="flex items-center gap-3 px-4 py-3 bg-neutral-900">
					<div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500">
						<Bot className="w-5 h-5 text-white" />
					</div>
					<div>
						<p className="text-sm font-medium text-white">Support Assistant</p>
						<p className="text-xs text-neutral-400">Always online</p>
					</div>
					<div className="flex gap-1 ml-auto">
						<div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
					</div>
				</div>

				{/* Chat Messages */}
				<div className="p-4 space-y-3 overflow-hidden h-72 bg-neutral-50">
					{DEMO_MESSAGES.slice(0, visibleMessages).map((msg, i) => (
						<div
							key={i}
							className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
							style={{ animationDelay: `${i * 100}ms` }}
						>
							<div
								className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${msg.role === "user"
									? "bg-neutral-900 text-white rounded-br-md"
									: "bg-white text-neutral-800 border border-neutral-200 rounded-bl-md shadow-sm"
									}`}
							>
								{msg.content}
							</div>
						</div>
					))}
					{isTyping && (
						<div className="flex justify-start duration-200 animate-in fade-in">
							<div className="px-4 py-3 bg-white border shadow-sm border-neutral-200 rounded-2xl rounded-bl-md">
								<div className="flex gap-1">
									<span className="w-2 h-2 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: "0ms" }} />
									<span className="w-2 h-2 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: "150ms" }} />
									<span className="w-2 h-2 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: "300ms" }} />
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Chat Input */}
				<div className="p-3 bg-white border-t border-neutral-200">
					<div className="flex gap-2">
						<input
							type="text"
							placeholder="Type a message..."
							className="flex-1 px-4 py-2.5 rounded-full bg-neutral-100 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
							disabled
						/>
						<button className="flex items-center justify-center w-10 h-10 text-white transition-colors rounded-full bg-neutral-900 hover:bg-neutral-800">
							<ArrowRight className="w-4 h-4" />
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

function FeatureCard({
	icon: Icon,
	title,
	description,
}: {
	icon: React.ElementType;
	title: string;
	description: string;
}) {
	return (
		<div className="p-6 transition-all duration-300 bg-white border group rounded-2xl border-neutral-200 hover:border-neutral-300 hover:shadow-lg hover:shadow-neutral-900/5">
			<div className="flex items-center justify-center w-12 h-12 mb-4 transition-colors duration-300 rounded-xl bg-neutral-100 group-hover:bg-neutral-900 group-hover:text-white">
				<Icon className="w-6 h-6" />
			</div>
			<h3 className="mb-2 text-lg font-semibold text-neutral-900">{title}</h3>
			<p className="text-sm leading-relaxed text-neutral-600">{description}</p>
		</div>
	);
}

export default function LandingPage() {
	return (
		<div className="min-h-screen bg-white">
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
						<Link href="/features" className="text-sm transition-colors text-neutral-600 hover:text-neutral-900">
							Features
						</Link>
						<Link href="/pricing" className="text-sm transition-colors text-neutral-600 hover:text-neutral-900">
							Pricing
						</Link>
						<Link href="/login" className="text-sm transition-colors text-neutral-600 hover:text-neutral-900">
							Log in
						</Link>
						<Button asChild size="sm" className="px-4 rounded-full">
							<Link href="/signup">Get Started</Link>
						</Button>
					</div>
				</div>
			</nav>

			{/* Hero Section */}
			<section className="px-6 pt-32 pb-20">
				<div className="max-w-6xl mx-auto">
					<div className="grid items-center gap-16 lg:grid-cols-2">
						<div className="space-y-8">
							<div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium">
								<Sparkles className="w-4 h-4" />
								AI-powered customer support
							</div>
							<h1 className="text-5xl md:text-6xl font-bold text-neutral-900 leading-[1.1] tracking-tight">
								Your AI assistant,{" "}
								<span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600">
									trained on your data
								</span>
							</h1>
							<p className="max-w-lg text-xl leading-relaxed text-neutral-600">
								Deploy a custom AI chatbot that knows your business inside out. Train it with your docs, FAQs, and knowledge base in minutes.
							</p>
							<div className="flex flex-wrap gap-4">
								<Button asChild size="lg" className="h-12 px-8 text-base rounded-full">
									<Link href="/signup">
										Start for Free
										<ArrowRight className="w-4 h-4 ml-2" />
									</Link>
								</Button>
								<Button asChild variant="outline" size="lg" className="h-12 px-8 text-base rounded-full">
									<Link href="/pricing">View Pricing</Link>
								</Button>
							</div>
							<p className="text-sm text-neutral-500">
								No credit card required · 100 free messages/month
							</p>
						</div>
						<div className="lg:pl-8">
							<ChatDemo />
						</div>
					</div>
				</div>
			</section>

			{/* Social Proof */}
			<section className="py-16 border-y border-neutral-100 bg-neutral-50">
				<div className="max-w-6xl px-6 mx-auto">
					<p className="mb-8 text-sm text-center text-neutral-500">
						Trusted by teams at
					</p>
					<div className="flex flex-wrap items-center justify-center opacity-50 gap-x-12 gap-y-6">
						{["Acme Corp", "TechStart", "DataFlow", "CloudBase", "NextGen"].map((name) => (
							<span key={name} className="text-xl font-semibold tracking-tight text-neutral-400">
								{name}
							</span>
						))}
					</div>
				</div>
			</section>

			{/* Features */}
			<section className="px-6 py-24">
				<div className="max-w-6xl mx-auto">
					<div className="max-w-2xl mx-auto mb-16 text-center">
						<h2 className="mb-4 text-3xl font-bold md:text-4xl text-neutral-900">
							Everything you need to support customers 24/7
						</h2>
						<p className="text-lg text-neutral-600">
							Powerful features that help you deliver exceptional customer experiences at scale.
						</p>
					</div>
					<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
						<FeatureCard
							icon={FileText}
							title="Knowledge Base"
							description="Upload PDFs, documents, and text files. Your AI learns from your existing content instantly."
						/>
						<FeatureCard
							icon={Bot}
							title="Custom Agents"
							description="Create multiple AI agents with different personalities and expertise for various use cases."
						/>
						<FeatureCard
							icon={Code2}
							title="Easy Integration"
							description="Add the chat widget to any website with a single line of code. Works everywhere."
						/>
						<FeatureCard
							icon={Shield}
							title="Rate Limiting"
							description="Built-in protection against abuse with customizable rate limits and domain restrictions."
						/>
						<FeatureCard
							icon={Zap}
							title="Real-time Streaming"
							description="Responses stream in real-time for a natural, engaging conversation experience."
						/>
						<FeatureCard
							icon={MessageSquare}
							title="Conversation History"
							description="Review all conversations, analyze patterns, and continuously improve your AI's responses."
						/>
					</div>
				</div>
			</section>

			{/* How it Works */}
			<section className="px-6 py-24 text-white bg-neutral-900">
				<div className="max-w-6xl mx-auto">
					<div className="max-w-2xl mx-auto mb-16 text-center">
						<h2 className="mb-4 text-3xl font-bold md:text-4xl">
							Up and running in 5 minutes
						</h2>
						<p className="text-lg text-neutral-400">
							No complex setup. No coding required. Just results.
						</p>
					</div>
					<div className="grid gap-8 md:grid-cols-3">
						{[
							{
								step: "01",
								title: "Create your agent",
								description: "Sign up and create your first AI agent with a custom name and personality.",
							},
							{
								step: "02",
								title: "Add your knowledge",
								description: "Upload documents, add Q&As, or write custom content for your AI to learn.",
							},
							{
								step: "03",
								title: "Embed & go live",
								description: "Copy the embed code and paste it on your website. Your AI is now live.",
							},
						].map((item) => (
							<div key={item.step} className="relative">
								<span className="absolute text-6xl font-bold text-neutral-800 -top-2 -left-2">
									{item.step}
								</span>
								<div className="pt-12 pl-8">
									<h3 className="mb-3 text-xl font-semibold">{item.title}</h3>
									<p className="leading-relaxed text-neutral-400">{item.description}</p>
								</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* CTA */}
			<section className="px-6 py-24">
				<div className="max-w-3xl mx-auto text-center">
					<h2 className="mb-4 text-3xl font-bold md:text-4xl text-neutral-900">
						Ready to transform your customer support?
					</h2>
					<p className="mb-8 text-lg text-neutral-600">
						Join thousands of businesses using vela to deliver exceptional AI-powered experiences.
					</p>
					<Button asChild size="lg" className="h-12 px-8 text-base rounded-full">
						<Link href="/signup">
							Get Started for Free
							<ArrowRight className="w-4 h-4 ml-2" />
						</Link>
					</Button>
				</div>
			</section>

			{/* Footer */}
			<footer className="px-6 py-12 border-t border-neutral-200">
				<div className="flex flex-col items-center justify-between max-w-6xl gap-6 mx-auto md:flex-row">
					<div className="flex items-center gap-2">
						<div className="flex items-center justify-center w-6 h-6 rounded bg-neutral-900">
							<MessageSquare className="w-3 h-3 text-white" />
						</div>
						<span className="font-medium text-neutral-900">vela</span>
					</div>
					<div className="flex items-center gap-6 text-sm text-neutral-600">
						<Link href="/pricing" className="transition-colors hover:text-neutral-900">
							Pricing
						</Link>
						<Link href="/privacy-policy" className="transition-colors hover:text-neutral-900">
							Privacy
						</Link>
						<Link href="/login" className="transition-colors hover:text-neutral-900">
							Log in
						</Link>
					</div>
					<p className="text-sm text-neutral-500">
						© {new Date().getFullYear()} Vela
					</p>
				</div>
			</footer>
		</div>
	);
}
