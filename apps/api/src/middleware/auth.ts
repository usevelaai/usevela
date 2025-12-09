import type { Context, Next } from "hono";
import { auth } from "../lib/auth";

export type AuthVariables = {
	user: typeof auth.$Infer.Session.user | null;
	session: typeof auth.$Infer.Session.session | null;
};

export async function authMiddleware(c: Context, next: Next) {
	const session = await auth.api.getSession({
		headers: c.req.raw.headers,
	});

	c.set("user", session?.user || null);
	c.set("session", session?.session || null);

	await next();
}

export async function requireAuth(c: Context, next: Next) {
	const session = await auth.api.getSession({
		headers: c.req.raw.headers,
	});

	if (!session) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	c.set("user", session.user);
	c.set("session", session.session);

	await next();
}
