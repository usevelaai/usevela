"use client";

import { MessageSquare } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
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
import { resetPassword } from "@/lib/auth-client";

function ResetPasswordForm() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const token = searchParams.get("token");
	const error_param = searchParams.get("error");

	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [error, setError] = useState(error_param === "INVALID_TOKEN" ? "Invalid or expired reset link" : "");
	const [success, setSuccess] = useState(false);
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");

		if (password !== confirmPassword) {
			setError("Passwords do not match");
			return;
		}

		if (password.length < 8) {
			setError("Password must be at least 8 characters");
			return;
		}

		if (!token) {
			setError("Invalid reset link");
			return;
		}

		setLoading(true);

		try {
			const result = await resetPassword({
				newPassword: password,
				token,
			});
			if (result.error) {
				setError(result.error.message || "Failed to reset password");
			} else {
				setSuccess(true);
				setTimeout(() => {
					router.push("/login");
				}, 2000);
			}
		} catch {
			setError("Failed to reset password");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Card className="w-full max-w-md">
			<CardHeader className="text-center">
				<CardTitle className="text-2xl">Reset password</CardTitle>
				<CardDescription>Enter your new password below</CardDescription>
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
							Password reset successful! Redirecting to login...
						</p>
					</div>
				) : (
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="password">New Password</Label>
							<Input
								id="password"
								type="password"
								placeholder="••••••••"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								minLength={8}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="confirmPassword">Confirm Password</Label>
							<Input
								id="confirmPassword"
								type="password"
								placeholder="••••••••"
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								required
								minLength={8}
							/>
							<p className="text-xs text-muted-foreground">
								Must be at least 8 characters
							</p>
						</div>

						{error && (
							<p className="text-sm font-medium text-destructive">{error}</p>
						)}

						<Button type="submit" className="w-full" disabled={loading || !token}>
							{loading ? "Resetting..." : "Reset password"}
						</Button>
					</form>
				)}
			</CardContent>
			<CardFooter className="flex justify-center">
				<p className="text-sm text-muted-foreground">
					<Link
						href="/login"
						className="font-medium text-primary hover:underline"
					>
						Back to sign in
					</Link>
				</p>
			</CardFooter>
		</Card>
	);
}

export default function ResetPasswordPage() {
	return (
		<div className="flex flex-col items-center justify-center min-h-screen px-4 bg-neutral-50">
			{/* Logo */}
			<Link href="/" className="flex items-center gap-2 mb-8">
				<div className="flex items-center justify-center w-10 h-10 rounded-xl bg-neutral-900">
					<MessageSquare className="w-5 h-5 text-white" />
				</div>
				<span className="text-xl font-semibold tracking-tight">Vela</span>
			</Link>

			<Suspense fallback={
				<Card className="w-full max-w-md">
					<CardContent className="py-8">
						<div className="flex justify-center">
							<div className="w-8 h-8 border-b-2 rounded-full animate-spin border-neutral-900" />
						</div>
					</CardContent>
				</Card>
			}>
				<ResetPasswordForm />
			</Suspense>

			<p className="mt-8 text-sm text-muted-foreground">
				<Link href="/" className="hover:underline">
					← Back to home
				</Link>
			</p>
		</div>
	);
}
