import fs from "node:fs";

import { createClient } from "@supabase/supabase-js";

import { getRequiredEnv, loadEnvFile } from "./env.mjs";

loadEnvFile();

const requiredEnv = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "CONTACT_RATE_LIMIT_SECRET",
  "ADMIN_EMAIL",
];

const optionalEnv = ["RESEND_API_KEY", "RESEND_FROM_EMAIL", "NEXT_PUBLIC_SITE_URL"];

async function main() {
  const missing = requiredEnv.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required env: ${missing.join(", ")}`);
  }

  const supabase = createClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("SUPABASE_SECRET_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const adminEmail = getRequiredEnv("ADMIN_EMAIL");
  const checks = [];
  const check = async (name, run) => {
    try {
      await run();
      checks.push({ name, ok: true });
    } catch (error) {
      checks.push({ name, ok: false, message: error.message || String(error) });
    }
  };

  await check("cms tables", async () => {
    const { error } = await supabase.from("works").select("id").limit(1);
    if (error) throw error;
  });

  await check("contact migration file", async () => {
    if (!fs.existsSync("supabase/migrations/20260620135759_create_contact_messages.sql")) {
      throw new Error("Missing contact messages migration");
    }
  });

  await check("media bucket", async () => {
    const { data, error } = await supabase.storage.listBuckets();
    if (error) throw error;
    if (!data.some((bucket) => bucket.name === "portfolio-media")) {
      throw new Error("Missing portfolio-media storage bucket");
    }
  });

  await check("admin user", async () => {
    const { data, error } = await supabase.auth.admin.listUsers();
    if (error) throw error;

    const user = data.users.find((item) => item.email === adminEmail);
    if (!user) throw new Error(`Admin email not found: ${adminEmail}`);
    if (user.app_metadata?.role !== "admin") {
      throw new Error("Admin user exists but app_metadata.role is not admin");
    }
  });

  const missingOptional = optionalEnv.filter((key) => !process.env[key]);
  for (const result of checks) {
    const prefix = result.ok ? "OK" : "FAIL";
    console.log(`${prefix} ${result.name}${result.message ? ` - ${result.message}` : ""}`);
  }

  if (missingOptional.length > 0) {
    console.log(`WARN optional env not set: ${missingOptional.join(", ")}`);
  }

  if (checks.some((result) => !result.ok)) process.exit(1);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
