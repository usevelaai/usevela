import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	transpilePackages: ["@vela/ui"],
	// Enable standalone output for Docker
	output: "standalone",
	// Allow images from any domain (for profile pictures)
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "**",
			},
		],
	},
};

export default nextConfig;
