import type { Config } from "drizzle-kit";

export default {
  out: "./drizzle",
  schema: "./src/lib/server/db/schema.ts",
  dialect: "sqlite",
  driver: "d1-http",
  dbCredentials: {
    databaseId: "f0108085-afcf-431e-b908-743fee588261",
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    token: process.env.CLOUDFLARE_TOKEN!,
  },
} satisfies Config;