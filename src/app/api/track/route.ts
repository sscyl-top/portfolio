import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { trackPageView } from "@/lib/cms/analytics";

export const runtime = "nodejs";

function getClientIp(request: NextRequest): string | undefined {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim();
  }
  return (request as unknown as { ip?: string }).ip ?? undefined;
}

function getWorkSlugFromPath(path: string): string | undefined {
  if (!path.startsWith("/works/")) return undefined;
  const slug = path.slice("/works/".length).split("/")[0];
  return slug || undefined;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      path?: string;
      workSlug?: string;
      referrer?: string;
    };

    const path = typeof body.path === "string" ? body.path : "/";
    const workSlug =
      typeof body.workSlug === "string"
        ? body.workSlug
        : getWorkSlugFromPath(path);
    const referrer = typeof body.referrer === "string" ? body.referrer : "";

    const cookieStore = await cookies();
    let sessionId = cookieStore.get("portfolio_session_id")?.value;
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      cookieStore.set("portfolio_session_id", sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 30,
        path: "/",
      });
    }

    const result = await trackPageView({
      path,
      workSlug,
      referrer,
      sessionId,
      ip: getClientIp(request),
      userAgent: request.headers.get("user-agent") ?? undefined,
      acceptLanguage: request.headers.get("accept-language") ?? undefined,
    });

    if (!result.success) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Track page view failed", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
