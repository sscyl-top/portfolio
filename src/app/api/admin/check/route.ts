import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-session";

export const runtime = "nodejs";

// GET /api/admin/check — 返回当前会话是否为管理员
// 失败时（requireAdmin 会抛出 redirect）返回 { isAdmin: false }
export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({ isAdmin: true });
  } catch {
    return NextResponse.json({ isAdmin: false });
  }
}
