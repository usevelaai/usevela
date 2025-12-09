"use client";

import { Check, Copy, Mail, Trash2, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { AuthenticatedLayout } from "@/components/authenticated-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	cancelTeamInvitation,
	getTeamInvitations,
	getTeamMembers,
	removeTeamMember,
	sendTeamInvitation,
	type TeamInvitation,
	type TeamMember,
} from "@/lib/api";

export default function TeamPage() {
	const [members, setMembers] = useState<TeamMember[]>([]);
	const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
	const [email, setEmail] = useState("");
	const [role, setRole] = useState("member");
	const [loading, setLoading] = useState(true);
	const [sending, setSending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

	useEffect(() => {
		async function loadTeamData() {
			try {
				setLoading(true);
				const [membersData, invitationsData] = await Promise.all([
					getTeamMembers(),
					getTeamInvitations(),
				]);
				setMembers(membersData);
				setInvitations(invitationsData);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to load team data");
			} finally {
				setLoading(false);
			}
		}
		loadTeamData();
	}, []);

	async function refreshTeamData() {
		try {
			setLoading(true);
			const [membersData, invitationsData] = await Promise.all([
				getTeamMembers(),
				getTeamInvitations(),
			]);
			setMembers(membersData);
			setInvitations(invitationsData);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load team data");
		} finally {
			setLoading(false);
		}
	}

	async function handleSendInvitation(e: React.FormEvent) {
		e.preventDefault();
		if (!email.trim()) return;

		try {
			setSending(true);
			setError(null);
			setSuccess(null);
			await sendTeamInvitation(email.trim(), role);
			setSuccess(`Invitation sent to ${email}`);
			setEmail("");
			setRole("member");

			// Refresh invitations
			await refreshTeamData();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to send invitation");
		} finally {
			setSending(false);
		}
	}

	async function handleCancelInvitation(id: string) {
		try {
			await cancelTeamInvitation(id);
			setInvitations(invitations.filter((inv) => inv.id !== id));
			setSuccess("Invitation cancelled");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to cancel invitation");
		}
	}

	async function handleRemoveMember(id: string) {
		if (!confirm("Are you sure you want to remove this team member?")) return;

		try {
			await removeTeamMember(id);
			setMembers(members.filter((m) => m.id !== id));
			setSuccess("Team member removed");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to remove team member");
		}
	}

	function copyInviteUrl(token: string) {
		const url = `${window.location.origin}/invite/${token}`;
		navigator.clipboard.writeText(url);
		setCopiedUrl(token);
		setTimeout(() => setCopiedUrl(null), 2000);
	}

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	}

	const renderMembers = () => {
		if (loading) {
			return <div className="py-8 text-center text-gray-500">Loading...</div>;
		}

		if (members.length === 0) {
			return (
				<div className="py-8 text-center text-gray-500">
					<p>No team members yet.</p>
					<p className="mt-1 text-sm">Invite someone using the form above to get started.</p>
				</div>
			);
		}

		return (
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Member</TableHead>
						<TableHead>Role</TableHead>
						<TableHead>Joined</TableHead>
						<TableHead className="text-right">Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{members.map((member) => (
						<TableRow key={member.id}>
							<TableCell>
								<div>
									<div className="font-medium">{member.name || "No name"}</div>
									<div className="text-sm text-gray-500">{member.email}</div>
								</div>
							</TableCell>
							<TableCell>
								<Badge variant="secondary" className="capitalize">
									{member.role}
								</Badge>
							</TableCell>
							<TableCell>{formatDate(member.createdAt)}</TableCell>
							<TableCell className="text-right">
								<Button
									variant="ghost"
									size="icon"
									onClick={() => handleRemoveMember(member.id)}
									className="text-red-600 hover:text-red-700 hover:bg-red-50"
									title="Remove member"
								>
									<Trash2 className="w-4 h-4" />
								</Button>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		);
	};

	return (
		<AuthenticatedLayout>
			<div className="max-w-4xl p-8">
				<div className="mb-8">
					<h1 className="text-3xl font-bold">Team Settings</h1>
					<p className="mt-2 text-gray-600">Manage your team members and invitations</p>
				</div>

				{error && (
					<div className="p-4 mb-6 text-red-700 border border-red-200 rounded-lg bg-red-50">
						{error}
					</div>
				)}

				{success && (
					<div className="p-4 mb-6 text-green-700 border border-green-200 rounded-lg bg-green-50">
						{success}
					</div>
				)}

				{/* Invite Form */}
				<Card className="mb-8">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<UserPlus className="w-5 h-5" />
							Invite Team Member
						</CardTitle>
						<CardDescription>
							Send an invitation to add someone to your team. They&apos;ll receive an email with a
							link to join.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleSendInvitation} className="flex gap-4">
							<Input
								type="email"
								placeholder="Enter email address"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								className="flex-1"
								required
							/>
							<Select value={role} onValueChange={setRole}>
								<SelectTrigger className="w-[140px]">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="member">Member</SelectItem>
									<SelectItem value="admin">Admin</SelectItem>
								</SelectContent>
							</Select>
							<Button type="submit" disabled={sending || !email.trim()}>
								{sending ? "Sending..." : "Send Invite"}
							</Button>
						</form>
					</CardContent>
				</Card>

				{/* Pending Invitations */}
				{invitations.length > 0 && (
					<Card className="mb-8">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Mail className="w-5 h-5" />
								Pending Invitations
							</CardTitle>
							<CardDescription>Invitations that haven&apos;t been accepted yet</CardDescription>
						</CardHeader>
						<CardContent>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Email</TableHead>
										<TableHead>Role</TableHead>
										<TableHead>Expires</TableHead>
										<TableHead className="text-right">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{invitations.map((invitation) => (
										<TableRow key={invitation.id}>
											<TableCell>{invitation.email}</TableCell>
											<TableCell>
												<Badge variant="secondary" className="capitalize">
													{invitation.role}
												</Badge>
											</TableCell>
											<TableCell>{formatDate(invitation.expiresAt)}</TableCell>
											<TableCell className="text-right">
												<div className="flex justify-end gap-2">
													<Button
														variant="ghost"
														size="icon"
														onClick={() => copyInviteUrl(invitation.id)}
														title="Copy invite link"
													>
														{copiedUrl === invitation.id ? (
															<Check className="w-4 h-4 text-green-600" />
														) : (
															<Copy className="w-4 h-4" />
														)}
													</Button>
													<Button
														variant="ghost"
														size="icon"
														onClick={() => handleCancelInvitation(invitation.id)}
														className="text-red-600 hover:text-red-700 hover:bg-red-50"
														title="Cancel invitation"
													>
														<Trash2 className="w-4 h-4" />
													</Button>
												</div>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</CardContent>
					</Card>
				)}

				{/* Team Members */}
				<Card>
					<CardHeader>
						<CardTitle>Team Members</CardTitle>
						<CardDescription>People who have access to your workspace</CardDescription>
					</CardHeader>
					<CardContent>
						{renderMembers()}
					</CardContent>
				</Card>
			</div>
		</AuthenticatedLayout>
	);
}
