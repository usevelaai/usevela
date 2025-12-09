import { polarClient } from "@polar-sh/better-auth";
import { createAuthClient } from "better-auth/react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export const authClient = createAuthClient({
	baseURL: API_BASE,
	fetchOptions: {
		credentials: "include",
	},
	plugins: [polarClient()],
});

export const {
	signIn,
	signUp,
	signOut,
	useSession,
	forgetPassword,
	resetPassword,
} = authClient;
