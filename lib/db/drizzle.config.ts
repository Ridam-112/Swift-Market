import { defineConfig } from "drizzle-kit";

const url =
  process.env.MAIN_DB_URL ??
  process.env.DATABASE_URL ??
  process.env.DATABASE1_URL ??
  process.env.NEON_DATABASE_URL ??
  "";

if (!url) {
  throw new Error("DATABASE_URL or MAIN_DB_URL must be set");
}

export default defineConfig({
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: { url },
});
