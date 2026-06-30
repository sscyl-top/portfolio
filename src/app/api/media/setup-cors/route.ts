import { PutBucketCorsCommand } from "@aws-sdk/client-s3";
import { getAuthorizedAdmin } from "@/lib/admin-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getR2Client, getR2Config } from "@/lib/r2/client";

export const runtime = "nodejs";

// 一次性 CORS 配置路由：部署后访问一次即可，配置幂等可重复执行
export async function POST() {
  const supabase = await createSupabaseServerClient();
  const user = await getAuthorizedAdmin(supabase);
  if (!user) {
    return Response.json({ error: "未授权" }, { status: 401 });
  }

  try {
    const config = getR2Config();
    const client = getR2Client();

    // R2 CORS 规则：允许生产域名和本地开发域名 PUT/GET/HEAD
    await client.send(
      new PutBucketCorsCommand({
        Bucket: config.bucket,
        CORSConfiguration: {
          CORSRules: [
            {
              ID: "allow-browser-upload",
              AllowedOrigins: [
                "https://sscyl.top",
                "http://localhost:3000",
                "http://127.0.0.1:3000",
              ],
              AllowedMethods: ["GET", "PUT", "HEAD"],
              AllowedHeaders: [
                "Content-Type",
                "Content-MD5",
                "Content-Length",
                "x-amz-*",
              ],
              ExposeHeaders: ["ETag", "Content-Length", "Content-Type"],
              MaxAgeSeconds: 3600,
            },
          ],
        },
      }),
    );

    return Response.json({
      ok: true,
      message: `R2 bucket "${config.bucket}" CORS 已配置`,
      allowedOrigins: ["https://sscyl.top", "http://localhost:3000"],
      allowedMethods: ["GET", "PUT", "HEAD"],
    });
  } catch (error) {
    return Response.json(
      { error: `CORS 配置失败: ${(error as Error).message}` },
      { status: 500 },
    );
  }
}
