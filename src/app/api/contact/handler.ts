import {
  parseContactSubmission,
  type ContactSubmission,
} from "@/lib/contact";

type SavedMessage = { id: string };

export type ContactHandlerDependencies = {
  hashIp: (ip: string) => Promise<string>;
  countRecent: (ipHash: string) => Promise<number>;
  save: (
    submission: ContactSubmission,
    ipHash: string,
  ) => Promise<SavedMessage>;
  notify: (submission: ContactSubmission) => Promise<void>;
  markNotification: (
    id: string,
    notified: boolean,
    error?: string,
  ) => Promise<void>;
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown notification error";
}

export function createContactHandler(dependencies: ContactHandlerDependencies) {
  return async function contactHandler(request: Request) {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "请求内容格式无效" }, { status: 400 });
    }

    const parsed = parseContactSubmission(body);

    if (!parsed.success) {
      if (parsed.isSpam) {
        return Response.json({ success: true }, { status: 201 });
      }

      return Response.json(
        { error: "请检查表单内容", fieldErrors: parsed.fieldErrors },
        { status: 400 },
      );
    }

    const forwardedFor = request.headers.get("x-forwarded-for");
    const ip = forwardedFor?.split(",")[0]?.trim() || "unknown";
    const ipHash = await dependencies.hashIp(ip);
    const recentCount = await dependencies.countRecent(ipHash);

    if (recentCount >= 3) {
      return Response.json(
        { error: "提交过于频繁，请稍后再试" },
        { status: 429 },
      );
    }

    const saved = await dependencies.save(parsed.data, ipHash);

    try {
      await dependencies.notify(parsed.data);
      await dependencies.markNotification(saved.id, true);
    } catch (error) {
      await dependencies.markNotification(
        saved.id,
        false,
        errorMessage(error),
      );
    }

    return Response.json({ success: true, id: saved.id }, { status: 201 });
  };
}
