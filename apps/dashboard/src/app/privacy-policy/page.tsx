import Link from "next/link";

export const metadata = {
	title: "Privacy Policy - Vela",
	description: "Privacy Policy for Vela",
};

export default function PrivacyPolicyPage() {
	return (
		<div className="min-h-screen bg-background">
			{/* Header */}
			<header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
				<div className="container flex items-center justify-between px-4 py-4 mx-auto">
					<Link href="/" className="text-xl font-bold">
						Vela
					</Link>
					<nav className="flex items-center gap-4">
						<Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground">
							Pricing
						</Link>
						<Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
							Log in
						</Link>
					</nav>
				</div>
			</header>

			{/* Content */}
			<main className="container max-w-4xl px-4 py-12 mx-auto">
				<h1 className="mb-2 text-4xl font-bold">Privacy Policy</h1>
				<p className="mb-8 text-muted-foreground">Last updated: December 7, 2025</p>

				<div className="space-y-8 prose prose-neutral dark:prose-invert max-w-none">
					<section>
						<h2 className="mb-4 text-2xl font-semibold">1. Introduction</h2>
						<p className="leading-relaxed text-muted-foreground">
							Welcome to Vela (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). We are
							committed to protecting your privacy and personal information. This Privacy Policy
							explains how we collect, use, disclose, and safeguard your information when you use
							our AI-powered chat platform and related services.
						</p>
					</section>

					<section>
						<h2 className="mb-4 text-2xl font-semibold">2. Information We Collect</h2>

						<h3 className="mb-2 text-lg font-medium">2.1 Information You Provide</h3>
						<ul className="pl-6 space-y-2 list-disc text-muted-foreground">
							<li>
								<strong>Account Information:</strong> When you create an account, we collect your
								name, email address, and authentication credentials.
							</li>
							<li>
								<strong>Chat Content:</strong> Messages you send through our platform, including
								conversations with AI agents.
							</li>
							<li>
								<strong>Knowledge Sources:</strong> Documents, text sources, and Q&A content you
								upload to train your agents.
							</li>
							<li>
								<strong>Payment Information:</strong> Billing details processed securely through our
								payment provider (Polar).
							</li>
						</ul>

						<h3 className="mt-4 mb-2 text-lg font-medium">
							2.2 Information Collected Automatically
						</h3>
						<ul className="pl-6 space-y-2 list-disc text-muted-foreground">
							<li>
								<strong>Usage Data:</strong> Message counts, feature usage, and interaction
								patterns.
							</li>
							<li>
								<strong>Device Information:</strong> Browser type, operating system, and device
								identifiers.
							</li>
							<li>
								<strong>Log Data:</strong> IP addresses, access times, and pages viewed.
							</li>
							<li>
								<strong>Cookies:</strong> Session cookies for authentication and preferences.
							</li>
						</ul>
					</section>

					<section>
						<h2 className="mb-4 text-2xl font-semibold">3. How We Use Your Information</h2>
						<p className="mb-4 text-muted-foreground">
							We use the collected information for the following purposes:
						</p>
						<ul className="pl-6 space-y-2 list-disc text-muted-foreground">
							<li>To provide and maintain our services</li>
							<li>To process your transactions and manage your subscription</li>
							<li>To personalize your experience and improve our AI agents</li>
							<li>To communicate with you about updates, security alerts, and support</li>
							<li>To monitor usage and enforce our terms of service</li>
							<li>To detect and prevent fraud or abuse</li>
							<li>To comply with legal obligations</li>
						</ul>
					</section>

					<section>
						<h2 className="mb-4 text-2xl font-semibold">4. Data Storage and Security</h2>
						<p className="mb-4 leading-relaxed text-muted-foreground">
							We implement industry-standard security measures to protect your data:
						</p>
						<ul className="pl-6 space-y-2 list-disc text-muted-foreground">
							<li>All data is encrypted in transit using TLS/SSL</li>
							<li>Sensitive data is encrypted at rest</li>
							<li>We use secure cloud infrastructure with regular security audits</li>
							<li>Access to personal data is restricted to authorized personnel only</li>
							<li>Regular backups ensure data integrity and availability</li>
						</ul>
					</section>

					<section>
						<h2 className="mb-4 text-2xl font-semibold">5. Data Sharing and Disclosure</h2>
						<p className="mb-4 text-muted-foreground">
							We do not sell your personal information. We may share your data with:
						</p>
						<ul className="pl-6 space-y-2 list-disc text-muted-foreground">
							<li>
								<strong>Service Providers:</strong> Third-party services that help us operate our
								platform (e.g., cloud hosting, payment processing, AI model providers).
							</li>
							<li>
								<strong>AI Model Providers:</strong> Your chat messages are sent to AI providers
								(such as Anthropic) to generate responses. These providers have their own privacy
								policies.
							</li>
							<li>
								<strong>Legal Requirements:</strong> When required by law, court order, or to
								protect our rights and safety.
							</li>
							<li>
								<strong>Business Transfers:</strong> In connection with a merger, acquisition, or
								sale of assets.
							</li>
						</ul>
					</section>

					<section>
						<h2 className="mb-4 text-2xl font-semibold">6. Your Rights and Choices</h2>
						<p className="mb-4 text-muted-foreground">
							Depending on your location, you may have the following rights:
						</p>
						<ul className="pl-6 space-y-2 list-disc text-muted-foreground">
							<li>
								<strong>Access:</strong> Request a copy of your personal data
							</li>
							<li>
								<strong>Correction:</strong> Update or correct inaccurate information
							</li>
							<li>
								<strong>Deletion:</strong> Request deletion of your account and associated data
							</li>
							<li>
								<strong>Portability:</strong> Receive your data in a portable format
							</li>
							<li>
								<strong>Opt-out:</strong> Unsubscribe from marketing communications
							</li>
							<li>
								<strong>Restriction:</strong> Limit how we process your data
							</li>
						</ul>
						<p className="mt-4 text-muted-foreground">
							To exercise these rights, please contact us at privacy@usevela.ai.
						</p>
					</section>

					<section>
						<h2 className="mb-4 text-2xl font-semibold">7. Data Retention</h2>
						<p className="leading-relaxed text-muted-foreground">
							We retain your personal data for as long as your account is active or as needed to
							provide services. Chat history and conversation data are retained according to your
							preferences. You can delete conversations at any time. When you delete your account,
							we will delete or anonymize your personal data within 30 days, except where we are
							required to retain it for legal purposes.
						</p>
					</section>

					<section>
						<h2 className="mb-4 text-2xl font-semibold">8. Cookies and Tracking</h2>
						<p className="mb-4 leading-relaxed text-muted-foreground">
							We use essential cookies for authentication and session management. We do not use
							third-party advertising cookies. You can configure your browser to refuse cookies, but
							this may limit your ability to use our services.
						</p>
					</section>

					<section>
						<h2 className="mb-4 text-2xl font-semibold">9. Children&apos;s Privacy</h2>
						<p className="leading-relaxed text-muted-foreground">
							Our services are not intended for children under 13 years of age. We do not knowingly
							collect personal information from children under 13. If you believe we have collected
							information from a child under 13, please contact us immediately.
						</p>
					</section>

					<section>
						<h2 className="mb-4 text-2xl font-semibold">10. International Data Transfers</h2>
						<p className="leading-relaxed text-muted-foreground">
							Your information may be transferred to and processed in countries other than your own.
							We ensure appropriate safeguards are in place to protect your data in accordance with
							this Privacy Policy and applicable laws.
						</p>
					</section>

					<section>
						<h2 className="mb-4 text-2xl font-semibold">11. Changes to This Policy</h2>
						<p className="leading-relaxed text-muted-foreground">
							We may update this Privacy Policy from time to time. We will notify you of any
							material changes by posting the new policy on this page and updating the &quot;Last
							updated&quot; date. Your continued use of our services after changes become effective
							constitutes acceptance of the updated policy.
						</p>
					</section>

					<section>
						<h2 className="mb-4 text-2xl font-semibold">12. Contact Us</h2>
						<p className="leading-relaxed text-muted-foreground">
							If you have questions or concerns about this Privacy Policy or our data practices,
							please contact us at:
						</p>
						<div className="p-4 mt-4 rounded-lg bg-muted">
							<p className="font-medium">Vela</p>
							<p className="text-muted-foreground">Email: privacy@usevela.ai</p>
						</div>
					</section>
				</div>
			</main>

			{/* Footer */}
			<footer className="py-8 mt-12 border-t">
				<div className="container flex flex-col items-center justify-between gap-4 px-4 mx-auto md:flex-row">
					<p className="text-sm text-muted-foreground">
						&copy; {new Date().getFullYear()} Vela. All rights reserved.
					</p>
					<nav className="flex gap-6 text-sm text-muted-foreground">
						<Link href="/privacy-policy" className="hover:text-foreground">
							Privacy Policy
						</Link>
						<Link href="/terms" className="hover:text-foreground">
							Terms of Service
						</Link>
						<Link href="/pricing" className="hover:text-foreground">
							Pricing
						</Link>
					</nav>
				</div>
			</footer>
		</div>
	);
}
