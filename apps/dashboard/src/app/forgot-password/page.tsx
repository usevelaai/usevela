"use client";

import { Inter } from "next/font/google";
import Link from "next/link";
import { useState } from "react";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import LogoIcon from "@/icons/logo";
import { forgetPassword } from "@/lib/auth-client";

export default function ForgotPasswordPage() {
	const [email, setEmail] = useState("");
	const [error, setError] = useState("");
	const [success, setSuccess] = useState(false);
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setLoading(true);

		try {
			const result = await forgetPassword({
				email,
				redirectTo: "/reset-password",
			});
			if (result.error) {
				setError(result.error.message || "Failed to send reset email");
			} else {
				setSuccess(true);
			}
		} catch {
			setError("Failed to send reset email");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className={`flex flex-col items-center justify-center min-h-screen px-4 bg-neutral-50 ${inter.className}`}>
			{/* Logo */}
			<Link href="/" className="flex items-center gap-2 mb-8">
				<div className="flex items-center justify-center w-10 h-10 rounded-xl bg-neutral-900">
					<LogoIcon className="text-white" />
				</div>
				<span className="text-xl font-semibold tracking-tight">Vela</span>
			</Link>

			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<CardTitle className="text-2xl">Forgot password?</CardTitle>
					<CardDescription>Enter your email and we&apos;ll send you a reset link</CardDescription>
				</CardHeader>
				<CardContent>
					{success ? (
						<div className="py-4 text-center">
							<div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-green-100 rounded-full">
								<svg
									className="w-6 h-6 text-green-600"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M5 13l4 4L19 7"
									/>
								</svg>
							</div>
							<p className="text-sm text-muted-foreground">
								Check your email for a password reset link. If you don&apos;t see it, check your
								spam folder.
							</p>
						</div>
					) : (
						<form onSubmit={handleSubmit} className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="email">Email</Label>
								<Input
									id="email"
									type="email"
									placeholder="you@example.com"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									required
								/>
							</div>

							{error && <p className="text-sm font-medium text-destructive">{error}</p>}

							<Button type="submit" className="w-full" disabled={loading}>
								{loading ? "Sending..." : "Send reset link"}
							</Button>
						</form>
					)}
				</CardContent>
				<CardFooter className="flex justify-center">
					<p className="text-sm text-muted-foreground">
						Remember your password?{" "}
						<Link href="/login" className="font-medium text-primary hover:underline">
							Sign in
						</Link>
					</p>
				</CardFooter>
			</Card>

			<p className="mt-8 text-sm text-muted-foreground">
				<Link href="/" className="hover:underline">
					← Back to home
				</Link>
			</p>
		</div>
	);
}
