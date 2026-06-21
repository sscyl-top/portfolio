import { createClient } from "@supabase/supabase-js";

import { getRequiredEnv, loadEnvFile } from "./env.mjs";

loadEnvFile();

async function main() {
  const email = process.argv[2] || process.env.ADMIN_EMAIL;
  if (!email) {
    throw new Error("Usage: npm run cms:make-admin -- email@example.com");
  }

  const supabase = createClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("SUPABASE_SECRET_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) throw error;

  const user = data.users.find((item) => item.email === email);
  if (!user) throw new Error(`User not found: ${email}`);

  const { error: updateError } = await supabase.auth.admin.updateUserById(
    user.id,
    {
      app_metadata: {
        ...user.app_metadata,
        role: "admin",
      },
    },
  );
  if (updateError) throw updateError;

  const { error: profileError } = await supabase.from("admin_profiles").upsert({
    user_id: user.id,
    display_name: email,
  });
  if (profileError) throw profileError;

  console.log(`OK admin role assigned to ${email}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
