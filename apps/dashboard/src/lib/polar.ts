import { Polar } from "@polar-sh/sdk";

export const polar = new Polar({
	accessToken: process.env.POLAR_ACCESS_TOKEN || "",
});

// You can get your organization ID from Polar dashboard
export const POLAR_ORGANIZATION_ID = process.env.NEXT_PUBLIC_POLAR_ORGANIZATION_ID || "";
