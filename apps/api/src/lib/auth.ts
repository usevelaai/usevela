import { checkout, polar, portal, usage, webhooks } from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";
import { accounts, getDb, sessions, userSubscriptions, users, verifications } from "@vela/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins";
import { Resend } from "resend";
import { mapProductToPlan } from "./plans";

const isSelfHosted = process.env.SELF_HOSTED === "true";
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Only initialize Polar when not self-hosted and credentials are provided
function getPolarPlugins() {
	if (isSelfHosted || !process.env.POLAR_ACCESS_TOKEN) {
		return [];
	}

	const polarClient = new Polar({
		accessToken: process.env.POLAR_ACCESS_TOKEN,
		server: process.env.POLAR_ENVIRONMENT === "sandbox" ? "sandbox" : "production",
	});

	return [
		polar({
			client: polarClient,
			createCustomerOnSignUp: true,
			use: [
				checkout({
					products: [
						{
							productId: process.env.POLAR_PRODUCT_PRO || "",
							slug: "Pro",
						},
						{
							productId: process.env.POLAR_PRODUCT_GROWTH || "",
							slug: "Growth",
						},
						{
							productId: process.env.POLAR_PRODUCT_STARTER || "",
							slug: "Starter",
						},
					],
					successUrl: process.env.POLAR_SUCCESS_URL,
					authenticatedUsersOnly: true,
				}),
				portal(),
				usage(),
				webhooks({
					secret: process.env.POLAR_WEBHOOK_SECRET || "",
					onCustomerStateChanged: async (payload) => {
						// Sync subscription when customer state changes
						const db = getDb();
						const customerId = payload.data.externalId;
						const activeSubscriptions = payload.data.activeSubscriptions || [];

						if (customerId && activeSubscriptions.length > 0) {
							const subscription = activeSubscriptions[0];
							const planId = mapProductToPlan(subscription.productId);
							const periodStart = subscription.currentPeriodStart
								? new Date(subscription.currentPeriodStart)
								: new Date();
							const periodEnd = subscription.currentPeriodEnd
								? new Date(subscription.currentPeriodEnd)
								: new Date(new Date().setMonth(new Date().getMonth() + 1));

							await db
								.insert(userSubscriptions)
								.values({
									userId: customerId,
									planId,
									polarSubscriptionId: subscription.id,
									billingPeriodStart: periodStart,
									billingPeriodEnd: periodEnd,
								})
								.onConflictDoUpdate({
									target: userSubscriptions.userId,
									set: {
										planId,
										polarSubscriptionId: subscription.id,
										billingPeriodStart: periodStart,
										billingPeriodEnd: periodEnd,
										updatedAt: new Date(),
									},
								});
						}
					},
					onOrderPaid: async (_payload) => {
						// Order paid - subscription will be updated via onCustomerStateChanged
					},
					onPayload: async (_payload) => {
						// Generic handler for other events
					},
				}),
			],
		}),
	];
}

export const auth = betterAuth({
	database: drizzleAdapter(getDb(), {
		provider: "pg",
		schema: {
			user: users,
			session: sessions,
			account: accounts,
			verification: verifications,
		},
	}),
	emailAndPassword: {
		enabled: true,
		sendResetPassword: async ({ user, url }) => {
			if (!resend) {
				console.log(`[auth] Password reset for ${user.email}: ${url}`);
				return;
			}
			await resend.emails.send({
				from: process.env.EMAIL_FROM || "Vela <noreply@getvela.ai>",
				to: user.email,
				subject: "Reset your password",
				html: `
					<h2>Reset your password</h2>
					<p>Click the link below to reset your password:</p>
					<a href="${url}">Reset Password</a>
					<p>If you didn't request this, you can safely ignore this email.</p>
				`,
			});
		},
	},
	socialProviders: {
		google: {
			clientId: process.env.GOOGLE_CLIENT_ID || "",
			clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
		},
		github: {
			clientId: process.env.GITHUB_CLIENT_ID || "",
			clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
		},
	},
	plugins: [
		magicLink({
			sendMagicLink: async ({ email, url }) => {
				if (!resend) {
					console.log(`[auth] Magic link for ${email}: ${url}`);
					return;
				}
				await resend.emails.send({
					from: process.env.EMAIL_FROM || "Vela <noreply@getvela.ai>",
					to: email,
					subject: "Sign in to Vela",
					html: `
						<h2>Sign in to Vela</h2>
						<p>Click the link below to sign in:</p>
						<a href="${url}">Sign In</a>
						<p>If you didn't request this, you can safely ignore this email.</p>
					`,
				});
			},
		}),
		...getPolarPlugins(),
	],
	trustedOrigins: [process.env.DASHBOARD_URL || "http://localhost:3000"],
});

export type Auth = typeof auth;
