import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

import { getAuthorizedAdmin } from "@/lib/admin-session";
import { seedStaticPortfolioData } from "@/lib/cms/seed-static-portfolio";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const client = await createSupabaseServerClient();
  const user = await getAuthorizedAdmin(client);

  if (!user) {
    return NextResponse.redirect(new URL("/admin?error=unauthorized", request.url));
  }

  try {
    await seedStaticPortfolioData({ adminUserId: user.id, client });
    revalidatePath("/admin");
    revalidatePath("/admin/works");
    revalidatePath("/admin/categories");

    return NextResponse.redirect(new URL("/admin/works?seeded=1", request.url));
  } catch (error) {
    const message = error instanceof Error ? error.message : "seed_failed";
    const url = new URL("/admin/works", request.url);
    url.searchParams.set("seedError", message);

    return NextResponse.redirect(url);
  }
}
