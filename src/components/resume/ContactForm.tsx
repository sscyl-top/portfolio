"use client";

import { Send } from "lucide-react";
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

const fieldClass =
  "mt-2 min-h-10 w-full rounded-lg border border-white/10 bg-black/25 px-3.5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-copper/65 focus:bg-black/40";

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("pending");
    setFeedback("");

    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form));

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) throw new Error(result.error || "消息提交失败");

      form.reset();
      setStatus("success");
      setFeedback("消息已发送，我会尽快回复。");
    } catch (error) {
      setStatus("error");
      setFeedback(error instanceof Error ? error.message : "消息提交失败");
    }
  }

  return (
    <article
      id={id}
      data-testid={`${type}-contact-card`}
      className="scroll-mt-24 rounded-lg border border-white/10 bg-white/[0.035] p-4 md:p-5"
    >
      <div className="border-b border-white/10 pb-4">
        <p className="font-mono text-[10px] uppercase text-copper">
          {type === "hiring" ? "Hiring enquiry" : "Commercial enquiry"}
        </p>
        <h3 className="mt-3 text-3xl font-semibold text-white">{title}</h3>
        <p className="mt-3 max-w-xl text-[15px] leading-7 text-white/58 md:text-base">
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

        <label className="text-sm text-white/68">
          姓名
          <input
            className={fieldClass}
            name="name"
            placeholder="您的姓名"
            autoComplete="name"
            maxLength={80}
          />
        </label>
        <label className="text-sm text-white/68">
          邮箱
          <input
            className={fieldClass}
            type="email"
            name="email"
            placeholder="your@email.com"
            autoComplete="email"
            maxLength={160}
          />
        </label>
        <label className="text-sm text-white/68 sm:col-span-2">
          公司
          <input
            className={fieldClass}
            name="company"
            placeholder="您的公司名称"
            autoComplete="organization"
            maxLength={120}
          />
        </label>
        <label className="text-sm text-white/68">
          {subjectLabel}
          <input
            className={fieldClass}
            name="subject"
            placeholder={subjectPlaceholder}
            maxLength={120}
          />
        </label>
        <label className="text-sm text-white/68">
          {rangeLabel}
          <input
            className={fieldClass}
            name="range"
            placeholder={rangePlaceholder}
            maxLength={80}
          />
        </label>
        <label className="text-sm text-white/68 sm:col-span-2">
          {messageLabel}
          <textarea
            className={`${fieldClass} min-h-20 resize-y py-2.5`}
            name="message"
            placeholder={messagePlaceholder}
            maxLength={3000}
          />
        </label>
        <label className="text-sm text-white/68 sm:col-span-2">
          备注
          <textarea
            className={`${fieldClass} min-h-16 resize-y py-2.5`}
            name="note"
            placeholder="补充时间安排、联系方式或其他说明"
            maxLength={1000}
          />
        </label>

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={status === "pending"}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-white/30 bg-[#edf8ff] px-6 text-sm font-semibold text-black/90 transition hover:bg-[#f6fcff] disabled:cursor-wait disabled:opacity-55"
          >
            <Send aria-hidden="true" className="h-4 w-4" />
            {status === "pending" ? "正在发送" : "发送消息"}
          </button>
          <p
            aria-live="polite"
            className={`mt-3 min-h-5 text-center text-xs ${
              status === "error" ? "text-red-300" : "text-cyan/75"
            }`}
          >
            {feedback}
          </p>
        </div>
      </form>
    </article>
  );
}
