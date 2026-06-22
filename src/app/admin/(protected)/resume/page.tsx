import { Plus, Save } from "lucide-react";

import { resume as staticResume } from "@/data/portfolio";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { saveResume } from "./actions";

type ResumeRow = {
  name: string;
  alias: string;
  role: string;
  positioning: string;
  location: string;
  email: string;
  phone: string;
  zcool_url: string;
  wechat_id: string;
  strengths: string[];
};

export default async function AdminResumePage() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("resumes")
    .select(
      "name,alias,role,positioning,location,email,phone,zcool_url,wechat_id,strengths",
    )
    .single();

  const fallback: ResumeRow = {
    name: staticResume.name,
    alias: staticResume.alias,
    role: staticResume.role,
    positioning: staticResume.positioning,
    location: staticResume.location,
    email: staticResume.contact.email,
    phone: staticResume.contact.phone,
    zcool_url: staticResume.contact.zcool ?? "",
    wechat_id: "CTT522423",
    strengths: staticResume.strengths,
  };
  const resume = (data as ResumeRow | null) ?? fallback;
  const strengths: string[] =
    resume.strengths.length > 0 ? resume.strengths : [""];

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan">
        Resume
      </p>
      <h2 className="mt-3 text-3xl font-semibold">简历</h2>
      <p className="mt-3 text-sm text-white/48">
        编辑简历页面显示的基本信息、联系方式和优势陈述；教育经历、工作履历等复杂数据结构暂由代码维护。
      </p>

      {error && error.code !== "PGRST116" ? (
        <p className="mt-6 rounded-md border border-red-300/20 bg-red-300/10 p-4 text-sm text-red-200">
          简历读取失败：{error.message}
        </p>
      ) : null}

      <form
        action={saveResume}
        className="mt-6 grid gap-5 rounded-md border border-white/10 bg-white/[0.035] p-5"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="姓名" name="name" defaultValue={resume.name} />
          <Field label="英文名" name="alias" defaultValue={resume.alias} />
          <Field label="职位" name="role" defaultValue={resume.role} />
          <Field label="地点" name="location" defaultValue={resume.location} />
          <Field label="邮箱" name="email" defaultValue={resume.email} />
          <Field label="电话" name="phone" defaultValue={resume.phone} />
          <Field label="Zcool URL" name="zcool_url" defaultValue={resume.zcool_url} />
          <Field label="微信号" name="wechat_id" defaultValue={resume.wechat_id} />
        </div>
        <Field
          label="定位描述"
          name="positioning"
          defaultValue={resume.positioning}
        />

        <section>
          <h3 className="flex items-center gap-2 text-sm font-medium text-white/80">
            优势陈述
            <span className="font-mono text-xs text-white/34">
              {strengths.filter(Boolean).length} 条
            </span>
          </h3>
          <div className="mt-3 grid gap-3">
            {strengths.concat([""]).map((strength, index) => (
              <div key={index} className="flex items-start gap-2">
                <input
                  name="strength"
                  defaultValue={strength}
                  placeholder={`第 ${index + 1} 条优势陈述`}
                  className="min-h-10 flex-1 rounded-md border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-cyan"
                />
                {index < strengths.length ? (
                  <span className="grid min-h-10 w-10 place-items-center font-mono text-xs text-white/26">
                    {index + 1}
                  </span>
                ) : (
                  <span className="grid min-h-10 w-10 place-items-center text-white/20">
                    <Plus className="h-4 w-4" />
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>

        <div className="flex justify-end">
          <button className="inline-flex min-h-10 items-center gap-2 rounded-md bg-cyan px-5 text-sm font-medium text-black transition hover:bg-white">
            <Save aria-hidden="true" className="h-4 w-4" />
            保存简历
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  defaultValue: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="text-white/58">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="min-h-10 rounded-md border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-cyan"
      />
    </label>
  );
}