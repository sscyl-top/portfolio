"use client";

import { AlertCircle, CheckCircle, Send } from "lucide-react";
import { useState, type FormEvent } from "react";

type ContactFormProps = {
  id?: string;
  type: "hiring" | "commercial";
  title: string;
  description: string;
  subjectLabel: string;
  subjectPlaceholder: string;
  rangeLabel: string;
  rangePlaceholder: string;
  messageLabel: string;
  messagePlaceholder: string;
};

type FieldError = { name?: string; email?: string; message?: string };

const fieldClass =
  "min-h-9 w-full rounded-lg border border-white/10 bg-black/25 px-3 py-1.5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-copper/65 focus:bg-black/40";

const errorFieldClass =
  "min-h-9 w-full rounded-lg border border-red-400/40 bg-black/25 px-3 py-1.5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-copper/65 focus:bg-black/40";

const errorTextClass = "mt-1 flex items-center gap-1 text-xs text-red-300";

/** 统一的短字段：标签左 / 输入右，垂直居中对齐 */
function InlineField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0 w-[2.6rem] text-right text-xs text-white/50">
        {label}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function ContactForm({
  id,
  type,
  title,
  description,
  subjectLabel,
  subjectPlaceholder,
  rangeLabel,
  rangePlaceholder,
  messageLabel,
  messagePlaceholder,
}: ContactFormProps) {
  const [status, setStatus] = useState<
    "idle" | "pending" | "success" | "error"
  >("idle");
  const [feedback, setFeedback] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldError>({});

  function validate(form: HTMLFormElement): boolean {
    const fd = new FormData(form);
    const errors: FieldError = {};

    const name = (fd.get("name") as string)?.trim();
    const email = (fd.get("email") as string)?.trim();
    const message = (fd.get("message") as string)?.trim();

    if (!name || name.length < 2) {
      errors.name = "请填写姓名（至少2个字符）";
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "请填写有效的邮箱地址";
    }
    if (!message || message.length < 10) {
      errors.message = `请填写${messageLabel}（至少10个字符）`;
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    if (!validate(form)) return;

    setStatus("pending");
    setFeedback("");

    const body = Object.fromEntries(new FormData(form));

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = (await response.json()) as {
        error?: string;
        fieldErrors?: Record<string, string>;
      };

      if (!response.ok) {
        if (result.fieldErrors) {
          const mapped: FieldError = {};
          if (result.fieldErrors.name) mapped.name = result.fieldErrors.name;
          if (result.fieldErrors.email) mapped.email = result.fieldErrors.email;
          if (result.fieldErrors.message) mapped.message = result.fieldErrors.message;
          setFieldErrors(mapped);
          setStatus("idle");
          return;
        }
        throw new Error(result.error || "消息提交失败");
      }

      form.reset();
      setFieldErrors({});
      setStatus("success");
      setFeedback("消息已发送，我会尽快回复。");
    } catch (error) {
      setStatus("error");
      setFeedback(error instanceof Error ? error.message : "消息提交失败，请稍后再试");
    }
  }

  return (
    <article
      id={id}
      data-testid={`${type}-contact-card`}
      className="scroll-mt-24 rounded-lg border border-white/10 bg-white/[0.035] p-3.5 md:p-5"
    >
      <div className="border-b border-white/10 pb-3">
        <p className="font-mono text-[10px] uppercase text-copper">
          {type === "hiring" ? "Hiring enquiry" : "Commercial enquiry"}
        </p>
        <h3 className="mt-2 text-2xl font-semibold text-white md:text-3xl">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-white/58 md:mt-3 md:text-[15px] md:leading-7">
          {description}
        </p>
      </div>

      <form
        data-testid={`${type}-contact-form`}
        className="mt-3 space-y-2.5 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0"
        onSubmit={handleSubmit}
      >
        <input type="hidden" name="type" value={type} />
        <div className="absolute -left-[9999px]" aria-hidden="true">
          <label htmlFor={`${type}-website`}>Website</label>
          <input
            id={`${type}-website`}
            name="website"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        {/* ── 短字段：标签左 / 输入右（统一模式）── */}
        <InlineField label="姓名">
          <input
            className={fieldErrors.name ? errorFieldClass : fieldClass}
            name="name"
            placeholder="您的姓名"
            autoComplete="name"
            maxLength={80}
            onChange={() => setFieldErrors((prev) => ({ ...prev, name: undefined }))}
          />
          {fieldErrors.name ? (
            <p className={errorTextClass}>
              <AlertCircle aria-hidden="true" className="h-3 w-3" />
              {fieldErrors.name}
            </p>
          ) : null}
        </InlineField>

        <InlineField label="邮箱">
          <input
            className={fieldErrors.email ? errorFieldClass : fieldClass}
            type="email"
            name="email"
            placeholder="your@email.com"
            autoComplete="email"
            maxLength={160}
            onChange={() => setFieldErrors((prev) => ({ ...prev, email: undefined }))}
          />
          {fieldErrors.email ? (
            <p className={errorTextClass}>
              <AlertCircle aria-hidden="true" className="h-3 w-3" />
              {fieldErrors.email}
            </p>
          ) : null}
        </InlineField>

        <InlineField label="公司">
          <input
            className={fieldClass}
            name="company"
            placeholder="您的公司名称"
            autoComplete="organization"
            maxLength={120}
          />
        </InlineField>

        <div className="sm:col-span-2">
          <span className="block mb-1 text-xs text-white/55">{messageLabel}</span>
          <textarea
            className={`${fieldErrors.message ? errorFieldClass : fieldClass} min-h-16 resize-y py-2.5`}
            name="message"
            placeholder={messagePlaceholder}
            maxLength={3000}
            onChange={() => setFieldErrors((prev) => ({ ...prev, message: undefined }))}
          />
          {fieldErrors.message ? (
            <p className={errorTextClass}>
              <AlertCircle aria-hidden="true" className="h-3 w-3" />
              {fieldErrors.message}
            </p>
          ) : null}
        </div>

        <InlineField label={subjectLabel}>
          <input
            className={fieldClass}
            name="subject"
            placeholder={subjectPlaceholder}
            maxLength={120}
          />
        </InlineField>

        <InlineField label={rangeLabel}>
          <input
            className={fieldClass}
            name="range"
            placeholder={rangePlaceholder}
            maxLength={80}
          />
        </InlineField>

        {/* 备注 — 全宽 textarea */}
        <div className="sm:col-span-2">
          <span className="block mb-1 text-xs text-white/55">备注</span>
          <textarea
            className={`${fieldClass} min-h-12 resize-y py-2.5`}
            name="note"
            placeholder="补充时间安排、联系方式或其他说明"
            maxLength={1000}
          />
        </div>

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={status === "pending"}
            className="inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-full border border-white/30 bg-[#edf8ff] px-5 py-2 text-sm font-semibold text-black/90 transition hover:bg-[#f6fcff] disabled:cursor-wait disabled:opacity-55"
          >
            <Send aria-hidden="true" className="h-4 w-4" />
            {status === "pending" ? "正在发送" : "发送消息"}
          </button>
          <p
            aria-live="polite"
            className={`mt-2 min-h-5 text-center text-xs ${
              status === "error"
                ? "text-red-300"
                : status === "success"
                  ? "text-emerald-300"
                  : "text-cyan/75"
            }`}
          >
            {status === "success" ? (
              <span className="inline-flex items-center gap-1">
                <CheckCircle aria-hidden="true" className="h-3 w-3" />
                {feedback}
              </span>
            ) : (
              feedback
            )}
          </p>
        </div>
      </form>
    </article>
  );
}
