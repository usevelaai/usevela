import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [react()],
	build: {
		rollupOptions: {
			input: {
				main: "index.html",
				embed: "src/embed.ts",
			},
			output: {
				entryFileNames: (chunkInfo) => {
					if (chunkInfo.name === "embed") {
						return "embed.min.js";
					}
					return "assets/[name]-[hash].js";
				},
			},
		},
	},
	server: {
		cors: true,
	},
});
