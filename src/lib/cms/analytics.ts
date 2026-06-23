"use server";

import { createHash } from "node:crypto";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const trackPageViewPayloadSchema = z.object({
  path: z.string().max(2048),
  workSlug: z.string().max(255).optional(),
  referrer: z.string().max(2048).optional(),
  sessionId: z.string().max(255).optional(),
  ip: z.string().max(255).optional(),
  userAgent: z.string().max(1000).optional(),
  acceptLanguage: z.string().max(255).optional(),
});

export type TrackPageViewPayload = z.infer<typeof trackPageViewPayloadSchema>;

export type AnalyticsStats = {
  totalVisits: number;
  todayPageViews: number;
  uniqueVisitors: number;
  liveVisitors: number;
  topWorks: Array<{ title: string; slug: string; views: number }>;
  topSources: Array<{ source: string; count: number }>;
  deviceBreakdown: Array<{ device: string; count: number; percent: number }>;
  recentMessages: Array<{
    id: string;
    name: string;
    subject: string;
    created_at: string;
  }>;
  recentComments: Array<{
    id: string;
    author_name: string;
    content: string;
    created_at: string;
  }>;
  recentVisits: Array<{
    id: string;
    session_id: string;
    landing_path: string;
    device_type: string;
    country: string | null;
    region: string | null;
    city: string | null;
    browser: string | null;
    os: string | null;
    referer: string | null;
    created_at: string;
  }>;
};

function hashIp(ip: string | undefined) {
  if (!ip) return undefined;
  const secret =
    process.env.ANALYTICS_IP_SALT ??
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    "portfolio-analytics-salt";
  return createHash("sha256").update(`${secret}:${ip}`).digest("hex");
}

function parseDeviceType(userAgent: string | undefined): string {
  if (!userAgent) return "unknown";
  const ua = userAgent.toLowerCase();
  if (/tablet|ipad/.test(ua)) return "tablet";
  if (/mobile|android(?!.*tablet)|iphone|ipod/.test(ua)) return "mobile";
  if (/bot|crawl|spider|slurp/.test(ua)) return "bot";
  return "desktop";
}

function parseOs(userAgent: string | undefined): string {
  if (!userAgent) return "unknown";
  const ua = userAgent.toLowerCase();
  if (/windows nt/.test(ua)) return "Windows";
  if (/mac os|macintosh/.test(ua)) return "macOS";
  if (/android/.test(ua)) return "Android";
  if (/ios|iphone|ipad|ipod/.test(ua)) return "iOS";
  if (/linux/.test(ua)) return "Linux";
  return "unknown";
}

function parseBrowser(userAgent: string | undefined): string {
  if (!userAgent) return "unknown";
  const ua = userAgent.toLowerCase();
  if (/edg/.test(ua)) return "Edge";
  if (/opr|opera/.test(ua)) return "Opera";
  if (/firefox/.test(ua)) return "Firefox";
  if (/chrome|chromium|crios/.test(ua)) return "Chrome";
  if (/safari/.test(ua)) return "Safari";
  return "unknown";
}

function getReferrerHost(referrer: string | undefined | null): string {
  if (!referrer) return "direct";
  try {
    const url = new URL(referrer);
    return url.hostname || "direct";
  } catch {
    return referrer.length > 100 ? `${referrer.slice(0, 100)}...` : referrer;
  }
}

export async function trackPageView(payload: TrackPageViewPayload) {
  const parsed = trackPageViewPayloadSchema.safeParse(payload);
  if (!parsed.success) return { success: false, error: "Invalid payload" };

  const service = createSupabaseServiceClient();

  const {
    path,
    workSlug,
    referrer,
    sessionId,
    ip,
    userAgent,
    acceptLanguage,
  } = parsed.data;

  const deviceType = parseDeviceType(userAgent);
  const os = parseOs(userAgent);
  const browser = parseBrowser(userAgent);
  const ipHash = hashIp(ip);

  // 会话 ID：优先使用客户端传入，否则基于 UA/IP 生成一个稳定值
  let finalSessionId = sessionId;
  if (!finalSessionId) {
    finalSessionId = createHash("sha256")
      .update(`${userAgent ?? ""}:${ip ?? ""}:${acceptLanguage ?? ""}`)
      .digest("hex");
  }

  // 30 分钟内同一 session 视为一次访问
  const sessionWindow = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data: existingVisits } = await service
    .from("visits")
    .select("id")
    .eq("session_id", finalSessionId)
    .gte("created_at", sessionWindow)
    .order("created_at", { ascending: false })
    .limit(1);

  let visitId: string;

  if (existingVisits && existingVisits.length > 0) {
    visitId = existingVisits[0].id;
  } else {
    const { data: visit, error: visitError } = await service
      .from("visits")
      .insert({
        session_id: finalSessionId,
        ip_hash: ipHash,
        user_agent: userAgent,
        device_type: deviceType,
        os,
        browser,
        referer: referrer,
        landing_path: path,
      })
      .select("id")
      .single();

    if (visitError || !visit) {
      console.error("Failed to insert visit", visitError);
      return { success: false, error: visitError?.message };
    }

    visitId = visit.id;
  }

  const { error: pageViewError } = await service.from("page_views").insert({
    visit_id: visitId,
    path,
    work_slug: workSlug,
    referrer: referrer,
    device_type: deviceType,
  });

  if (pageViewError) {
    console.error("Failed to insert page view", pageViewError);
    return { success: false, error: pageViewError.message };
  }

  if (workSlug) {
    const { data: work } = await service
      .from("works")
      .select("id")
      .eq("slug", workSlug)
      .is("deleted_at", null)
      .single();

    if (work?.id) {
      const { error: rpcError } = await service.rpc("increment_work_view", {
        p_work_id: work.id,
        p_view_date: new Date().toISOString().slice(0, 10),
      });

      if (rpcError) {
        console.error("Failed to increment work view", rpcError);
      }
    }
  }

  return { success: true };
}

export async function getLiveVisitors(): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data, error } = await supabase.rpc("count_distinct_sessions_since", {
    since,
  });

  if (error) {
    // 兜底：若函数未部署则使用 page_views + visits 去重查询
    const { data: fallback } = await supabase
      .from("page_views")
      .select("visit_id, visits!inner(session_id)")
      .gte("created_at", since);

    const sessionIds = new Set(
      (fallback ?? []).map((row) => {
        const visits = (row as { visits?: { session_id: string } | { session_id: string }[] }).visits;
        const visit = Array.isArray(visits) ? visits[0] : visits;
        return visit?.session_id;
      }),
    );
    sessionIds.delete(undefined);
    return sessionIds.size;
  }

  return data ?? 0;
}

export async function getAnalyticsStats(): Promise<AnalyticsStats> {
  const supabase = await createSupabaseServerClient();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    { count: totalVisits },
    { count: todayPageViews },
    { count: uniqueVisitors },
    liveVisitors,
    { data: topWorksRaw },
    { data: sourcesRaw },
    { data: devicesRaw },
    { data: recentMessages },
    { data: recentComments },
    { data: recentVisitsRaw },
  ] = await Promise.all([
    supabase
      .from("visits")
      .select("*", { count: "exact", head: true }),
    supabase
      .from("page_views")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayStart.toISOString()),
    supabase.rpc("count_unique_visitors"),
    getLiveVisitors(),
    supabase
      .from("work_views")
      .select("view_count, works!inner(title, slug)")
      .order("view_count", { ascending: false })
      .limit(10),
    supabase
      .from("page_views")
      .select("referrer")
      .not("referrer", "is", null)
      .order("created_at", { ascending: false })
      .limit(2000),
    supabase
      .from("visits")
      .select("device_type")
      .not("device_type", "is", null)
      .limit(5000),
    supabase
      .from("contact_messages")
      .select("id, name, subject, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("work_comments")
      .select("id, author_name, content, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("visits")
      .select("id,session_id,landing_path,device_type,country,region,city,browser,os,referer,created_at")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  // 聚合热门来源
  const sourceCounts = new Map<string, number>();
  (sourcesRaw ?? [])
    .map((row) => getReferrerHost(row.referrer))
    .forEach((source) => {
      sourceCounts.set(source, (sourceCounts.get(source) ?? 0) + 1);
    });

  const topSources = Array.from(sourceCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([source, count]) => ({ source, count }));

  // 聚合设备占比
  const deviceCounts = new Map<string, number>();
  (devicesRaw ?? []).forEach((row) => {
    const device = row.device_type || "unknown";
    deviceCounts.set(device, (deviceCounts.get(device) ?? 0) + 1);
  });

  const deviceTotal = Array.from(deviceCounts.values()).reduce(
    (sum, count) => sum + count,
    0,
  );

  const deviceBreakdown = Array.from(deviceCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([device, count]) => ({
      device,
      count,
      percent: deviceTotal > 0 ? Math.round((count / deviceTotal) * 1000) / 10 : 0,
    }));

  // 热门作品
  const topWorks = (topWorksRaw ?? [])
    .filter(
      (
        row,
      ): row is {
        view_count: number;
        works: { title: string; slug: string }[];
      } =>
        typeof row.view_count === "number" &&
        Array.isArray(row.works) &&
        row.works.length > 0,
    )
    .map((row) => {
      const work = row.works[0];
      return {
        title: work?.title ?? "未知作品",
        slug: work?.slug ?? "",
        views: row.view_count,
      };
    });

  return {
    totalVisits: totalVisits ?? 0,
    todayPageViews: todayPageViews ?? 0,
    uniqueVisitors: uniqueVisitors ?? 0,
    liveVisitors,
    topWorks,
    topSources,
    deviceBreakdown,
    recentMessages: (recentMessages ?? []) as AnalyticsStats["recentMessages"],
    recentComments: (recentComments ?? []) as AnalyticsStats["recentComments"],
    recentVisits: (recentVisitsRaw ?? []).map((visit) => ({
      ...visit,
      path: visit.landing_path,
    })) as AnalyticsStats["recentVisits"],
  };
}
