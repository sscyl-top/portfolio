"use client";

import { useState } from "react";
import { Plus, Trash2, Save, GripVertical, ChevronUp, ChevronDown, CheckCircle, AlertCircle } from "lucide-react";

import { saveResume } from "@/app/admin/(protected)/resume/actions";
import type {
  ResumeData,
  ResumeExperience,
  ResumeCampus,
  ResumeExpertise,
  ResumeAchievement,
  ResumeActivity,
  ResumeEducation,
  ResumeDownloads,
} from "@/lib/cms/resume";

interface Props {
  resume: ResumeData;
}

export function ResumeEditor({ resume }: Props) {
  const [isPending, setIsPending] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'ok' | 'err'>('idle');
  const [saveMsg, setSaveMsg] = useState('');

  async function handleSubmit(formData: FormData) {
    setIsPending(true);
    setSaveStatus('idle');
    try {
      const result = await saveResume(formData);
      if (result && !result.success) {
        setSaveStatus('err');
        setSaveMsg(result.error || '未知错误');
      } else {
        setSaveStatus('ok');
        setSaveMsg('保存成功');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } catch (e) {
      setSaveStatus('err');
      setSaveMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form
      action={handleSubmit}
      className="mt-5 grid gap-4 rounded-md border border-white/10 bg-white/[0.035] p-4"
    >
      <BasicFields resume={resume} />
      <StrengthsList defaultItems={resume.strengths} />
      <HighlightsList defaultItems={resume.highlights} />
      <ServicesList defaultItems={resume.services} />
      <DownloadsFields downloads={resume.downloads} />
      <ExpertiseList defaultItems={resume.expertise} />
      <ExperienceList defaultItems={resume.experience} />
      <CampusList defaultItems={resume.campus} />
      <EducationSection education={resume.education} />

      <div className="flex items-center justify-between pt-3">
        <div>
          {saveStatus === 'ok' && (
            <span className="flex items-center gap-1.5 text-xs text-green-400">
              <CheckCircle className="h-3.5 w-3.5" />{saveMsg}
            </span>
          )}
          {saveStatus === 'err' && (
            <span className="flex items-center gap-1.5 text-xs text-red-400" title={saveMsg}>
              <AlertCircle className="h-3.5 w-3.5" />保存失败：{saveMsg}
            </span>
          )}
        </div>
        <button
          disabled={isPending}
          type="submit"
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-cyan px-4 text-xs font-medium text-black transition hover:bg-white disabled:opacity-50"
        >
          <Save aria-hidden="true" className="h-3.5 w-3.5" />
          {isPending ? "保存中…" : "保存简历"}
        </button>
      </div>
    </form>
  );
}

function BasicFields({ resume }: { resume: ResumeData }) {
  return (
    <section className="grid gap-4 md:grid-cols-2">
      <Field label="姓名" name="name" defaultValue={resume.name} required />
      <Field label="英文名" name="alias" defaultValue={resume.alias} />
      <Field label="职位" name="role" defaultValue={resume.role} />
      <Field label="地点" name="location" defaultValue={resume.location} />
      <Field label="邮箱" name="email" defaultValue={resume.contact.email} required />
      <Field label="电话" name="phone" defaultValue={resume.contact.phone} />
      <Field label="Zcool URL" name="zcool_url" defaultValue={resume.contact.zcool} />
      <Field label="微信号" name="wechat_id" defaultValue="" />
      <div className="md:col-span-2">
        <TextArea
          label="定位描述"
          name="positioning"
          defaultValue={resume.positioning}
          rows={2}
        />
      </div>
    </section>
  );
}

function StrengthsList({ defaultItems }: { defaultItems: string[] }) {
  const [items, setItems] = useState<string[]>(defaultItems.length > 0 ? defaultItems : [""]);

  return (
    <ListSection title="优势陈述" addLabel="添加优势">
      {items.map((item, i) => (
        <ListRow key={i} onRemove={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}>
          <input
            name="strength"
            defaultValue={item}
            placeholder={`第 ${i + 1} 条优势陈述`}
            className="h-9 flex-1 rounded-md border border-white/10 bg-black/20 px-2.5 text-xs outline-none focus:border-cyan"
          />
        </ListRow>
      ))}
      <AddButton onClick={() => setItems((prev) => [...prev, ""])} label="添加优势" />
    </ListSection>
  );
}

function HighlightsList({ defaultItems }: { defaultItems: string[] }) {
  const [items, setItems] = useState<string[]>(defaultItems.length > 0 ? defaultItems : [""]);

  return (
    <ListSection title="高光标签" addLabel="添加标签">
      {items.map((item, i) => (
        <ListRow key={i} onRemove={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}>
          <input
            name="highlight"
            defaultValue={item}
            placeholder="例如 Brand Visual System"
            className="h-9 flex-1 rounded-md border border-white/10 bg-black/20 px-2.5 text-xs outline-none focus:border-cyan"
          />
        </ListRow>
      ))}
      <AddButton onClick={() => setItems((prev) => [...prev, ""])} label="添加标签" />
    </ListSection>
  );
}

function ServicesList({ defaultItems }: { defaultItems: string[] }) {
  const [items, setItems] = useState<string[]>(defaultItems.length > 0 ? defaultItems : [""]);

  return (
    <ListSection title="服务范围" addLabel="添加服务">
      {items.map((item, i) => (
        <ListRow key={i} onRemove={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}>
          <input
            name="service"
            defaultValue={item}
            placeholder="例如 品牌视觉升级"
            className="h-9 flex-1 rounded-md border border-white/10 bg-black/20 px-2.5 text-xs outline-none focus:border-cyan"
          />
        </ListRow>
      ))}
      <AddButton onClick={() => setItems((prev) => [...prev, ""])} label="添加服务" />
    </ListSection>
  );
}

function DownloadsFields({ downloads }: { downloads: ResumeDownloads }) {
  return (
    <section>
      <h3 className="text-xs font-medium text-white/80">下载链接</h3>
      <div className="mt-2 grid gap-3 md:grid-cols-2">
        <Field label="PDF 链接" name="download_pdf" defaultValue={downloads.pdf} />
        <Field label="JPG 链接" name="download_jpg" defaultValue={downloads.jpg} />
      </div>
    </section>
  );
}

function ExpertiseList({ defaultItems }: { defaultItems: ResumeExpertise[] }) {
  const [items, setItems] = useState<ResumeExpertise[]>(
    defaultItems.length > 0 ? defaultItems : [{ title: "", items: [""] }],
  );

  return (
    <ListSection title="专长分类" addLabel="添加分类">
      {items.map((expertise, i) => (
        <div
          key={i}
          className="rounded-md border border-white/10 bg-black/20 p-3"
        >
          <div className="flex items-center gap-1.5">
            <input
              name="expertise_title"
              defaultValue={expertise.title}
              placeholder="分类名称"
              className="h-9 flex-1 rounded-md border border-white/10 bg-black/40 px-2.5 text-xs outline-none focus:border-cyan"
            />
            <button
              type="button"
              onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
              className="grid h-9 w-9 place-items-center rounded-md border border-white/10 text-white/40 hover:border-red-300/30 hover:text-red-300"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-2 space-y-1.5">
            {(expertise.items.length > 0 ? expertise.items : [""]).map((item, j) => (
              <div key={j} className="flex items-center gap-1.5">
                <input
                  name={`expertise_items_${i}`}
                  defaultValue={item}
                  placeholder={`第 ${j + 1} 项`}
                  className="h-9 flex-1 rounded-md border border-white/10 bg-black/40 px-2.5 text-xs outline-none focus:border-cyan"
                />
                <button
                  type="button"
                  onClick={() =>
                    setItems((prev) =>
                      prev.map((e, idx) =>
                        idx === i
                          ? { ...e, items: e.items.filter((_, jdx) => jdx !== j) }
                          : e,
                      ),
                    )
                  }
                  className="grid h-9 w-9 place-items-center rounded-md text-white/30 hover:text-white/70"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              setItems((prev) =>
                prev.map((e, idx) =>
                  idx === i ? { ...e, items: [...e.items, ""] } : e,
                ),
              )
            }
            className="mt-2 inline-flex items-center gap-1 text-[11px] text-cyan hover:text-white"
          >
            <Plus className="h-3 w-3" /> 添加子项
          </button>
        </div>
      ))}
      <AddButton
        onClick={() => setItems((prev) => [...prev, { title: "", items: [""] }])}
        label="添加分类"
      />
    </ListSection>
  );
}

function ExperienceList({ defaultItems }: { defaultItems: ResumeExperience[] }) {
  const [items, setItems] = useState<ResumeExperience[]>(
    defaultItems.length > 0
      ? defaultItems
      : [{ company: "", title: "", period: "", points: [""] }],
  );

  function moveItem(from: number, direction: "up" | "down") {
    setItems((prev) => {
      const to = direction === "up" ? from - 1 : from + 1;
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
  }

  return (
    <ListSection title="工作经验" addLabel="添加经历">
      {items.map((exp, i) => (
        <div key={i} className="rounded-md border border-white/10 bg-black/20 p-3">
          <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto_auto]">
            <input
              name="experience_company"
              defaultValue={exp.company}
              placeholder="公司"
              className="h-9 rounded-md border border-white/10 bg-black/40 px-2.5 text-xs outline-none focus:border-cyan"
            />
            <input
              name="experience_title"
              defaultValue={exp.title}
              placeholder="职位"
              className="h-9 rounded-md border border-white/10 bg-black/40 px-2.5 text-xs outline-none focus:border-cyan"
            />
            <div className="flex items-start gap-1">
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => moveItem(i, "up")}
                  disabled={i === 0}
                  className="grid h-4 w-4 place-items-center rounded text-white/30 hover:text-white/70 disabled:opacity-30"
                >
                  <ChevronUp className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => moveItem(i, "down")}
                  disabled={i === items.length - 1}
                  className="grid h-4 w-4 place-items-center rounded text-white/30 hover:text-white/70 disabled:opacity-30"
                >
                  <ChevronDown className="h-3 w-3" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
                className="grid h-9 w-9 place-items-center rounded-md border border-white/10 text-white/40 hover:border-red-300/30 hover:text-red-300"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <input
            name="experience_period"
            defaultValue={exp.period}
            placeholder="时间段"
            className="mt-2 h-9 w-full rounded-md border border-white/10 bg-black/40 px-2.5 text-xs outline-none focus:border-cyan"
          />
          <div className="mt-2 space-y-1.5">
            {(exp.points.length > 0 ? exp.points : [""]).map((point, j) => (
              <div key={j} className="flex items-start gap-1.5">
                <input
                  name={`experience_points_${i}`}
                  defaultValue={point}
                  placeholder={`第 ${j + 1} 条描述`}
                  className="h-9 flex-1 rounded-md border border-white/10 bg-black/40 px-2.5 text-xs outline-none focus:border-cyan"
                />
                <button
                  type="button"
                  onClick={() =>
                    setItems((prev) =>
                      prev.map((e, idx) =>
                        idx === i
                          ? { ...e, points: e.points.filter((_, jdx) => jdx !== j) }
                          : e,
                      ),
                    )
                  }
                  className="grid h-9 w-9 place-items-center rounded-md text-white/30 hover:text-white/70"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              setItems((prev) =>
                prev.map((e, idx) =>
                  idx === i ? { ...e, points: [...e.points, ""] } : e,
                ),
              )
            }
            className="mt-2 inline-flex items-center gap-1 text-[11px] text-cyan hover:text-white"
          >
            <Plus className="h-3 w-3" /> 添加描述
          </button>
        </div>
      ))}
      <AddButton
        onClick={() => setItems((prev) => [{ company: "", title: "", period: "", points: [""] }, ...prev])}
        label="添加经历"
      />
    </ListSection>
  );
}

function CampusList({ defaultItems }: { defaultItems: ResumeCampus[] }) {
  const [items, setItems] = useState<ResumeCampus[]>(
    defaultItems.length > 0
      ? defaultItems
      : [{ company: "", title: "", period: "", description: "" }],
  );

  function moveItem(from: number, direction: "up" | "down") {
    setItems((prev) => {
      const to = direction === "up" ? from - 1 : from + 1;
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
  }

  return (
    <ListSection title="校园经历" addLabel="添加经历">
      {items.map((item, i) => (
        <div key={i} className="rounded-md border border-white/10 bg-black/20 p-3">
          <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto_auto]">
            <input
              name="campus_company"
              defaultValue={item.company}
              placeholder="公司 / 组织"
              className="h-9 rounded-md border border-white/10 bg-black/40 px-2.5 text-xs outline-none focus:border-cyan"
            />
            <input
              name="campus_title"
              defaultValue={item.title}
              placeholder="职位"
              className="h-9 rounded-md border border-white/10 bg-black/40 px-2.5 text-xs outline-none focus:border-cyan"
            />
            <div className="flex items-start gap-1">
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => moveItem(i, "up")}
                  disabled={i === 0}
                  className="grid h-4 w-4 place-items-center rounded text-white/30 hover:text-white/70 disabled:opacity-30"
                >
                  <ChevronUp className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => moveItem(i, "down")}
                  disabled={i === items.length - 1}
                  className="grid h-4 w-4 place-items-center rounded text-white/30 hover:text-white/70 disabled:opacity-30"
                >
                  <ChevronDown className="h-3 w-3" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
                className="grid h-9 w-9 place-items-center rounded-md border border-white/10 text-white/40 hover:border-red-300/30 hover:text-red-300"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <input
            name="campus_period"
            defaultValue={item.period}
            placeholder="时间段"
            className="mt-2 h-9 w-full rounded-md border border-white/10 bg-black/40 px-2.5 text-xs outline-none focus:border-cyan"
          />
          <TextArea
            name="campus_description"
            defaultValue={item.description}
            placeholder="经历描述"
            rows={3}
            className="mt-2"
          />
        </div>
      ))}
      <AddButton
        onClick={() =>
          setItems((prev) => [{ company: "", title: "", period: "", description: "" }, ...prev])
        }
        label="添加经历"
      />
    </ListSection>
  );
}

function EducationSection({ education }: { education: ResumeEducation }) {
  const [achievements, setAchievements] = useState<ResumeAchievement[]>(
    education.achievements.length > 0 ? education.achievements : [{ label: "", value: "" }],
  );
  const [activities, setActivities] = useState<ResumeActivity[]>(
    education.activities.length > 0 ? education.activities : [{ period: "", title: "", description: "" }],
  );

  return (
    <section>
      <h3 className="text-xs font-medium text-white/80">教育背景</h3>
      <div className="mt-2 grid gap-3 md:grid-cols-2">
        <Field label="学校" name="education_school" defaultValue={education.school} />
        <Field label="学校英文" name="education_schoolEnglish" defaultValue={education.schoolEnglish} />
        <Field label="专业" name="education_major" defaultValue={education.major} />
        <Field label="专业英文" name="education_majorEnglish" defaultValue={education.majorEnglish} />
      </div>
      <div className="mt-2">
        <Field label="时间段" name="education_period" defaultValue={education.period} />
      </div>
      <TextArea label="备注" name="education_note" defaultValue={education.note} rows={2} className="mt-2" />

      <div className="mt-4">
        <h4 className="text-[11px] font-medium uppercase text-white/50">荣誉与成就</h4>
        {achievements.map((ach, i) => (
          <div key={i} className="mt-1.5 grid gap-1.5 md:grid-cols-[1fr_1fr_1fr_auto]">
            <input
              name="achievement_label"
              defaultValue={ach.label}
              placeholder="标签"
              className="h-9 rounded-md border border-white/10 bg-black/20 px-2.5 text-xs outline-none focus:border-cyan"
            />
            <input
              name="achievement_value"
              defaultValue={ach.value}
              placeholder="内容"
              className="h-9 rounded-md border border-white/10 bg-black/20 px-2.5 text-xs outline-none focus:border-cyan"
            />
            <input
              name="achievement_detail"
              defaultValue={ach.detail ?? ""}
              placeholder="补充（可选）"
              className="h-9 rounded-md border border-white/10 bg-black/20 px-2.5 text-xs outline-none focus:border-cyan"
            />
            <button
              type="button"
              onClick={() => setAchievements((prev) => prev.filter((_, idx) => idx !== i))}
              className="grid h-9 w-9 place-items-center rounded-md text-white/30 hover:text-white/70"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
        <AddButton
          onClick={() => setAchievements((prev) => [...prev, { label: "", value: "" }])}
          label="添加成就"
          className="mt-2"
        />
      </div>

      <div className="mt-4">
        <h4 className="text-[11px] font-medium uppercase text-white/50">组织与实践</h4>
        {activities.map((act, i) => (
          <div key={i} className="mt-1.5 rounded-md border border-white/10 bg-black/20 p-3">
            <div className="grid gap-1.5 md:grid-cols-[1fr_1fr_auto]">
              <input
                name="activity_period"
                defaultValue={act.period}
                placeholder="时间段"
                className="h-9 rounded-md border border-white/10 bg-black/40 px-2.5 text-xs outline-none focus:border-cyan"
              />
              <input
                name="activity_title"
                defaultValue={act.title}
                placeholder="职务 / 活动"
                className="h-9 rounded-md border border-white/10 bg-black/40 px-2.5 text-xs outline-none focus:border-cyan"
              />
              <button
                type="button"
                onClick={() => setActivities((prev) => prev.filter((_, idx) => idx !== i))}
                className="grid h-9 w-9 place-items-center rounded-md text-white/30 hover:text-white/70"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
            <TextArea
              name="activity_description"
              defaultValue={act.description}
              placeholder="描述"
              rows={2}
              className="mt-2"
            />
          </div>
        ))}
        <AddButton
          onClick={() =>
            setActivities((prev) => [...prev, { period: "", title: "", description: "" }])
          }
          label="添加活动"
          className="mt-2"
        />
      </div>
    </section>
  );
}

function ListSection({
  title,
  addLabel,
  children,
}: {
  title: string;
  addLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="text-xs font-medium text-white/80">{title}</h3>
      <div className="mt-2 space-y-2">{children}</div>
    </section>
  );
}

function ListRow({
  children,
  onRemove,
}: {
  children: React.ReactNode;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <GripVertical className="h-3.5 w-3.5 text-white/20" />
      {children}
      <button
        type="button"
        onClick={onRemove}
        className="grid h-9 w-9 place-items-center rounded-md text-white/30 hover:text-white/70"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function AddButton({
  onClick,
  label,
  className = "",
}: {
  onClick: () => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-9 items-center gap-1 rounded-md border border-cyan/30 px-3 text-xs text-cyan transition hover:bg-cyan/10 ${className}`}
    >
      <Plus className="h-3 w-3" />
      {label}
    </button>
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
    <label className="grid gap-1.5 text-xs">
      <span className="text-white/58">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="h-9 rounded-md border border-white/10 bg-black/20 px-2.5 text-xs outline-none focus:border-cyan"
      />
    </label>
  );
}

function TextArea({
  label,
  name,
  defaultValue,
  rows = 3,
  placeholder,
  className = "",
}: {
  label?: string;
  name: string;
  defaultValue: string;
  rows?: number;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={`grid gap-1.5 text-xs ${className}`}>
      {label ? <span className="text-white/58">{label}</span> : null}
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={rows}
        placeholder={placeholder}
        className="min-h-[4rem] resize-y rounded-md border border-white/10 bg-black/20 px-2.5 py-2 text-xs outline-none focus:border-cyan"
      />
    </label>
  );
}
