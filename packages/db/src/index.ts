import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export { and, count, desc, eq, gte, lte, ne, sql, sum } from "drizzle-orm";
export * from "./schema";

const connectionString = process.env.DATABASE_URL;

const client = connectionString ? postgres(connectionString) : null;

export const db = client ? drizzle(client, { schema }) : null;

export function getDb() {
	if (!db) {
		throw new Error("DATABASE_URL not configured");
	}
	return db;
}
