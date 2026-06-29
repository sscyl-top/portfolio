import { NextResponse } from "next/server";

import { getAuthorizedAdmin } from "@/lib/admin-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * 已禁用：COS 同步会导致流量异常激增（曾一天消耗 200+GB）。
 * 当前存储后端为 Cloudflare R2，新文件通过 sign-upload 路由直接预签名直传到 R2。
 *
 * 保留此路由返回 410 Gone，避免管理后台误触发批量镜像。
 */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const user = await getAuthorizedAdmin(supabase);
  if (!user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  return NextResponse.json(
    {
      error:
        "此接口已禁用：COS 同步曾导致单日 200GB+ 流量费用。新文件应直接通过 R2 上传，旧 Supabase 文件应通过 R2 迁移工具单独处理。",
      disabled: true,
    },
    { status: 410 },
  );
}
