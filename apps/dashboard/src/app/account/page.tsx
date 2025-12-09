"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { AuthenticatedLayout } from "@/components/authenticated-layout";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient, useSession } from "@/lib/auth-client";

const accountSchema = z.object({
	name: z.string().min(1, "Name is required"),
});

type AccountFormData = z.infer<typeof accountSchema>;

export default function AccountPage() {
	const router = useRouter();
	const { data: session } = useSession();
	const [isDeleting, setIsDeleting] = useState(false);

	const form = useForm<AccountFormData>({
		resolver: zodResolver(accountSchema),
		defaultValues: {
			name: "",
		},
	});

	useEffect(() => {
		if (session?.user?.name) {
			form.reset({ name: session.user.name });
		}
	}, [session, form]);

	const onSubmit = async (data: AccountFormData) => {
		try {
			await authClient.updateUser({ name: data.name });
			toast.success("Account updated");
		} catch (err) {
			console.error("Failed to update account:", err);
			toast.error("Failed to update account");
		}
	};

	const handleDeleteAccount = async () => {
		setIsDeleting(true);
		try {
			await authClient.deleteUser();
			toast.success("Account deleted");
			router.push("/login");
		} catch (err) {
			console.error("Failed to delete account:", err);
			toast.error("Failed to delete account");
			setIsDeleting(false);
		}
	};

	return (
		<AuthenticatedLayout>
			<div className="max-w-2xl p-8 space-y-8">
				<h1 className="text-2xl font-bold">Account Settings</h1>

				<Card>
					<CardHeader>
						<CardTitle>Profile</CardTitle>
						<CardDescription>Manage your account information</CardDescription>
					</CardHeader>
					<CardContent>
						<Form {...form}>
							<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
								<FormField
									control={form.control}
									name="name"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Name</FormLabel>
											<FormControl>
												<Input placeholder="Your name" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<div className="space-y-2">
									<Label>Email</Label>
									<Input value={session?.user?.email || ""} disabled className="bg-muted" />
									<p className="text-xs text-muted-foreground">Email cannot be changed</p>
								</div>

								<div className="flex justify-end pt-4">
									<Button type="submit" disabled={form.formState.isSubmitting}>
										{form.formState.isSubmitting ? "Saving..." : "Save Changes"}
									</Button>
								</div>
							</form>
						</Form>
					</CardContent>
				</Card>

				<Card className="border-red-200">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-red-600">
							<AlertTriangle className="w-5 h-5" />
							Danger Zone
						</CardTitle>
						<CardDescription>Irreversible actions that affect your account</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="flex items-center justify-between">
							<div>
								<p className="font-medium">Delete Account</p>
								<p className="text-sm text-muted-foreground">
									Permanently delete your account and all associated data. This action is not
									reversible.
								</p>
							</div>
							<AlertDialog>
								<AlertDialogTrigger asChild>
									<Button variant="destructive">Delete Account</Button>
								</AlertDialogTrigger>
								<AlertDialogContent>
									<AlertDialogHeader>
										<AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
										<AlertDialogDescription>
											This action cannot be undone. This will permanently delete your account and
											remove all your data from our servers.
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel>Cancel</AlertDialogCancel>
										<AlertDialogAction
											onClick={handleDeleteAccount}
											disabled={isDeleting}
											className="bg-red-600 hover:bg-red-700"
										>
											{isDeleting ? "Deleting..." : "Yes, delete my account"}
										</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
						</div>
					</CardContent>
				</Card>
			</div>
		</AuthenticatedLayout>
	);
}
