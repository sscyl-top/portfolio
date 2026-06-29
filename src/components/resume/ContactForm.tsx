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
  "min-h-9 w-full rounded-lg border border-edge-2 bg-surface px-3 py-1.5 text-sm text-ink outline-none transition placeholder:text-ink-4 focus:border-copper/65 focus:bg-surface-2";

const errorFieldClass =
  "min-h-9 w-full rounded-lg border border-red-400/40 bg-surface px-3 py-1.5 text-sm text-ink outline-none transition placeholder:text-ink-4 focus:border-copper/65 focus:bg-surface-2";

const errorTextClass = "mt-1 flex items-center gap-1 text-xs text-red-500 [.light_&]:text-red-600";

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
      className="scroll-mt-24 rounded-lg border border-edge-2 bg-surface-3 p-4 md:p-5"
    >
      <div className="border-b border-edge-2 pb-4">
        <p className="font-mono text-[10px] uppercase text-copper">
          {type === "hiring" ? "Hiring enquiry" : "Commercial enquiry"}
        </p>
        <h3 className="mt-3 text-3xl font-semibold text-ink">{title}</h3>
        <p className="mt-3 max-w-xl text-[15px] leading-7 text-ink-2">
          {description}
        </p>
      </div>

      <form
        data-testid={`${type}-contact-form`}
        className="mt-4 grid gap-4 sm:grid-cols-2"
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

        {/* 姓名 */}
        <div className="flex items-center gap-2 sm:flex-col sm:items-start sm:gap-1">
          <label
            htmlFor={`${type}-name`}
            className="shrink-0 text-xs font-medium text-ink-2 sm:text-sm"
          >
            姓名
          </label>
          <div className="min-w-0 flex-1 sm:w-full sm:flex-none">
            <input
              id={`${type}-name`}
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
          </div>
        </div>

        {/* 邮箱 */}
        <div className="flex items-center gap-2 sm:flex-col sm:items-start sm:gap-1">
          <label
            htmlFor={`${type}-email`}
            className="shrink-0 text-xs font-medium text-ink-2 sm:text-sm"
          >
            邮箱
          </label>
          <div className="min-w-0 flex-1 sm:w-full sm:flex-none">
            <input
              id={`${type}-email`}
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
          </div>
        </div>

        {/* 公司 */}
        <div className="sm:col-span-2">
          <div className="flex items-center gap-2 sm:flex-col sm:items-start sm:gap-1">
            <label
              htmlFor={`${type}-company`}
              className="shrink-0 text-xs font-medium text-ink-2 sm:text-sm"
            >
              公司
            </label>
            <div className="min-w-0 flex-1 sm:w-full sm:flex-none">
              <input
                id={`${type}-company`}
                className={fieldClass}
                name="company"
                placeholder="您的公司名称"
                autoComplete="organization"
                maxLength={120}
              />
            </div>
          </div>
        </div>

        {/* subject */}
        <div className="flex items-center gap-2 sm:flex-col sm:items-start sm:gap-1">
          <label
            htmlFor={`${type}-subject`}
            className="shrink-0 text-xs font-medium text-ink-2 sm:text-sm"
          >
            {subjectLabel}
          </label>
          <div className="min-w-0 flex-1 sm:w-full sm:flex-none">
            <input
              id={`${type}-subject`}
              className={fieldClass}
              name="subject"
              placeholder={subjectPlaceholder}
              maxLength={120}
            />
          </div>
        </div>

        {/* range */}
        <div className="flex items-center gap-2 sm:flex-col sm:items-start sm:gap-1">
          <label
            htmlFor={`${type}-range`}
            className="shrink-0 text-xs font-medium text-ink-2 sm:text-sm"
          >
            {rangeLabel}
          </label>
          <div className="min-w-0 flex-1 sm:w-full sm:flex-none">
            <input
              id={`${type}-range`}
              className={fieldClass}
              name="range"
              placeholder={rangePlaceholder}
              maxLength={80}
            />
          </div>
        </div>

        {/* message */}
        <div className="sm:col-span-2">
          <div className="flex items-start gap-2 sm:flex-col sm:items-start sm:gap-1">
            <label
              htmlFor={`${type}-message`}
              className="shrink-0 text-xs font-medium text-ink-2 sm:text-sm"
            >
              {messageLabel}
            </label>
            <div className="min-w-0 flex-1 sm:w-full sm:flex-none">
              <textarea
                id={`${type}-message`}
                className={`${fieldErrors.message ? errorFieldClass : fieldClass} min-h-16 resize-y py-2.5 sm:min-h-20`}
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
          </div>
        </div>

        {/* 备注 */}
        <div className="sm:col-span-2">
          <div className="flex items-start gap-2 sm:flex-col sm:items-start sm:gap-1">
            <label
              htmlFor={`${type}-note`}
              className="shrink-0 text-xs font-medium text-ink-2 sm:text-sm"
            >
              备注
            </label>
            <div className="min-w-0 flex-1 sm:w-full sm:flex-none">
              <textarea
                id={`${type}-note`}
                className={`${fieldClass} min-h-12 resize-y py-2.5 sm:min-h-16`}
                name="note"
                placeholder="补充时间安排、联系方式或其他说明"
                maxLength={1000}
              />
            </div>
          </div>
        </div>

        {/* 提交按钮 */}
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={status === "pending"}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-edge bg-surface px-6 text-sm font-semibold text-ink transition hover:bg-surface-2 [.light_&]:bg-cyan/15 [.light_&]:hover:bg-cyan/20 disabled:cursor-wait disabled:opacity-55"
          >
            <Send aria-hidden="true" className="h-4 w-4" />
            {status === "pending" ? "正在发送" : "发送消息"}
          </button>
          <p
            aria-live="polite"
            className={`mt-3 min-h-5 text-center text-xs ${
              status === "error"
                ? "text-red-400 [.light_&]:text-red-600"
                : status === "success"
                  ? "text-emerald-300 [.light_&]:text-emerald-600"
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
