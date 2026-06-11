import { config } from "dotenv"
import { defineConfig } from "drizzle-kit"

config()

const {
  DATABASE_HOST,
  DATABASE_PORT,
  DATABASE_USER,
  DATABASE_PASSWORD,
  DATABASE_NAME,
} = process.env

if (!DATABASE_HOST || !DATABASE_USER || !DATABASE_PASSWORD || !DATABASE_NAME) {
  throw new Error("Missing database environment variables")
}

export default defineConfig({
  schema: "./src/database/schema.ts",
  out: "./src/database/migrations",
  dialect: "postgresql",
  dbCredentials: {
    host: DATABASE_HOST,
    port: parseInt(DATABASE_PORT || "5432"),
    user: DATABASE_USER,
    password: DATABASE_PASSWORD,
    database: DATABASE_NAME,
    ssl: false,
  },
  verbose: true,
  strict: true,
})
