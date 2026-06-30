import { ResumeEditor } from "@/components/admin/ResumeEditor";
import { getResumeData } from "@/lib/cms/resume";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminResumePage() {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("resumes")
    .select("id")
    .single();

  const resume = await getResumeData();

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan">
        Resume
      </p>
      <h2 className="mt-2 text-2xl font-semibold">简历</h2>
      <p className="mt-1.5 text-xs text-white/48">
        编辑简历页所有内容：基本信息、优势陈述、工作经验、校园经历、教育背景、专长分类、高光标签、下载链接。
      </p>

      {error && error.code !== "PGRST116" ? (
        <p className="mt-5 rounded-md border border-red-300/20 bg-red-300/10 p-4 text-xs text-red-200">
          简历读取失败：{error.message}
        </p>
      ) : null}

      <ResumeEditor resume={resume} />
    </div>
  );
}
