import { NextResponse } from "next/server";

import { getLiveVisitors } from "@/lib/cms/analytics";
import { requireAdmin } from "@/lib/admin-session";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();
    const liveVisitors = await getLiveVisitors();
    return NextResponse.json({ liveVisitors });
  } catch (error) {
    console.error("Live analytics failed", error);
    return NextResponse.json({ liveVisitors: 0 }, { status: 401 });
  }
}
