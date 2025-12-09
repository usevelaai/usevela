import { Hono } from "hono";

const configRoute = new Hono();

// Public configuration endpoint - no auth required
configRoute.get("/", (c) => {
	return c.json({
		selfHosted: process.env.SELF_HOSTED === "true",
	});
});

export { configRoute };
