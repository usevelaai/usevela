import { randomBytes } from "node:crypto";
import { and, eq, getDb, teamInvitations, teamMembers, users } from "@vela/db";
import { Hono } from "hono";

const team = new Hono();

// Generate a unique invitation token
function generateToken(): string {
	return randomBytes(32).toString("hex");
}

// Helper to get userId from context
function getUserId(c: { get: (key: string) => unknown }): string | null {
	const user = c.get("user") as { id: string } | null;
	return user?.id ?? null;
}

// Get team members (users who belong to current user's team)
team.get("/members", async (c) => {
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const db = getDb();
	const members = await db
		.select({
			id: teamMembers.id,
			memberId: teamMembers.memberId,
			role: teamMembers.role,
			createdAt: teamMembers.createdAt,
			email: users.email,
			name: users.name,
		})
		.from(teamMembers)
		.innerJoin(users, eq(teamMembers.memberId, users.id))
		.where(eq(teamMembers.ownerId, userId));

	return c.json(members);
});

// Get pending invitations
team.get("/invitations", async (c) => {
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const db = getDb();
	const invitations = await db
		.select()
		.from(teamInvitations)
		.where(and(eq(teamInvitations.inviterId, userId), eq(teamInvitations.status, "pending")));

	return c.json(invitations);
});

// Send invitation
team.post("/invite", async (c) => {
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const { email, role = "member" } = await c.req.json();

	if (!email) {
		return c.json({ error: "Email is required" }, 400);
	}

	const db = getDb();

	// Check if user is already a team member
	const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);

	if (existingUser.length > 0) {
		const existingMember = await db
			.select()
			.from(teamMembers)
			.where(and(eq(teamMembers.ownerId, userId), eq(teamMembers.memberId, existingUser[0].id)))
			.limit(1);

		if (existingMember.length > 0) {
			return c.json({ error: "User is already a team member" }, 400);
		}
	}

	// Check for existing pending invitation
	const existingInvitation = await db
		.select()
		.from(teamInvitations)
		.where(
			and(
				eq(teamInvitations.inviterId, userId),
				eq(teamInvitations.email, email),
				eq(teamInvitations.status, "pending"),
			),
		)
		.limit(1);

	if (existingInvitation.length > 0) {
		return c.json({ error: "Invitation already sent to this email" }, 400);
	}

	// Create invitation
	const token = generateToken();
	const expiresAt = new Date();
	expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

	const [invitation] = await db
		.insert(teamInvitations)
		.values({
			inviterId: userId,
			email,
			token,
			role,
			expiresAt,
		})
		.returning();

	// TODO: Send email with invitation link
	const inviteUrl = `${process.env.DASHBOARD_URL}/invite/${token}`;

	return c.json({
		invitation,
		inviteUrl,
		message: "Invitation sent successfully",
	});
});

// Accept invitation
team.post("/accept/:token", async (c) => {
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const { token } = c.req.param();
	const db = getDb();

	// Find the invitation
	const [invitation] = await db
		.select()
		.from(teamInvitations)
		.where(eq(teamInvitations.token, token))
		.limit(1);

	if (!invitation) {
		return c.json({ error: "Invalid invitation" }, 404);
	}

	if (invitation.status !== "pending") {
		return c.json({ error: "Invitation is no longer valid" }, 400);
	}

	if (new Date() > invitation.expiresAt) {
		await db
			.update(teamInvitations)
			.set({ status: "expired" })
			.where(eq(teamInvitations.id, invitation.id));
		return c.json({ error: "Invitation has expired" }, 400);
	}

	// Verify the email matches the current user
	const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
	if (!user || user.email !== invitation.email) {
		return c.json({ error: "This invitation was sent to a different email address" }, 403);
	}

	// Add user as team member
	await db.insert(teamMembers).values({
		ownerId: invitation.inviterId,
		memberId: userId,
		role: invitation.role,
	});

	// Update invitation status
	await db
		.update(teamInvitations)
		.set({ status: "accepted", acceptedAt: new Date() })
		.where(eq(teamInvitations.id, invitation.id));

	return c.json({ message: "Invitation accepted successfully" });
});

// Cancel/revoke invitation
team.delete("/invitations/:id", async (c) => {
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const { id } = c.req.param();
	const db = getDb();

	const result = await db
		.delete(teamInvitations)
		.where(and(eq(teamInvitations.id, id), eq(teamInvitations.inviterId, userId)))
		.returning();

	if (result.length === 0) {
		return c.json({ error: "Invitation not found" }, 404);
	}

	return c.json({ message: "Invitation cancelled" });
});

// Remove team member
team.delete("/members/:id", async (c) => {
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const { id } = c.req.param();
	const db = getDb();

	const result = await db
		.delete(teamMembers)
		.where(and(eq(teamMembers.id, id), eq(teamMembers.ownerId, userId)))
		.returning();

	if (result.length === 0) {
		return c.json({ error: "Team member not found" }, 404);
	}

	return c.json({ message: "Team member removed" });
});

// Get invitation by token (for accept page)
team.get("/invitation/:token", async (c) => {
	const { token } = c.req.param();
	const db = getDb();

	const [invitation] = await db
		.select({
			id: teamInvitations.id,
			email: teamInvitations.email,
			role: teamInvitations.role,
			status: teamInvitations.status,
			expiresAt: teamInvitations.expiresAt,
			inviterName: users.name,
			inviterEmail: users.email,
		})
		.from(teamInvitations)
		.innerJoin(users, eq(teamInvitations.inviterId, users.id))
		.where(eq(teamInvitations.token, token))
		.limit(1);

	if (!invitation) {
		return c.json({ error: "Invalid invitation" }, 404);
	}

	return c.json(invitation);
});

export { team };
