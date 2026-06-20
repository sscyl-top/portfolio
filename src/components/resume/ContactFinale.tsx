import { Mail, MapPin, Phone, QrCode } from "lucide-react";
import Image from "next/image";

import { ContactForm } from "./ContactForm";

type ContactFinaleProps = {
  email: string;
  phone: string;
  location: string;
};

const wechatQrSrc = "/resume/wechat-qr.png";

const marqueeGroups = [0, 1, 2, 3];

export function ContactFinale({ email, phone, location }: ContactFinaleProps) {
  return (
    <section className="relative z-10 overflow-hidden border-t border-white/10 pb-10 pt-20">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div>
          <p className="font-mono text-xs uppercase text-copper">
            Design service / Contact
          </p>
          <h2 className="mt-4 text-4xl font-semibold text-white md:text-6xl">
            设计服务合作
          </h2>
        </div>

        <div className="mt-10 grid border-y border-white/10 sm:grid-cols-2 lg:grid-cols-[1fr_1.2fr_1fr_auto]">
          <a
            href={`tel:${phone}`}
            className="group flex min-h-28 flex-col items-center justify-center gap-3 border-b border-white/10 px-5 text-center transition hover:bg-white/[0.035] sm:border-r lg:border-b-0"
          >
            <Phone aria-hidden="true" className="h-5 w-5 text-copper" />
            <span>
              <span className="block font-mono text-[11px] uppercase text-white/38">
                Phone
              </span>
              <span className="mt-2 block text-base font-medium text-white/82 md:text-lg">{phone}</span>
            </span>
          </a>
          <a
            href={`mailto:${email}`}
            className="group flex min-h-28 flex-col items-center justify-center gap-3 border-b border-white/10 px-5 text-center transition hover:bg-white/[0.035] lg:border-b-0 lg:border-r"
          >
            <Mail aria-hidden="true" className="h-5 w-5 text-copper" />
            <span>
              <span className="block font-mono text-[11px] uppercase text-white/38">
                Email
              </span>
              <span className="mt-2 block break-all text-base font-medium text-white/82 md:text-lg">{email}</span>
            </span>
          </a>
          <div className="flex min-h-28 flex-col items-center justify-center gap-3 border-b border-white/10 px-5 text-center sm:border-r sm:border-b-0">
            <MapPin aria-hidden="true" className="h-5 w-5 text-copper" />
            <span>
              <span className="block font-mono text-[11px] uppercase text-white/38">
                Location
              </span>
              <span className="mt-2 block text-base font-medium text-white/82 md:text-lg">
                {location}
              </span>
            </span>
          </div>
          <div className="flex min-h-28 flex-col items-center justify-center gap-3 px-5 text-center">
            {wechatQrSrc ? (
              <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-white/12 bg-white">
                <Image
                  src={wechatQrSrc}
                  alt="微信二维码"
                  fill
                  sizes="64px"
                  className="object-contain"
                />
              </div>
            ) : (
              <div className="grid h-16 w-16 place-items-center rounded-lg border border-dashed border-white/18 bg-white/[0.025]">
                <QrCode aria-hidden="true" className="h-7 w-7 text-white/35" />
              </div>
            )}
            <span>
              <span className="block font-mono text-[11px] uppercase text-white/38">
                WeChat
              </span>
              <span className="mt-2 block text-sm font-medium text-white/58 md:text-base">
                {wechatQrSrc ? "扫码添加微信" : "微信二维码占位图"}
              </span>
            </span>
          </div>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          <ContactForm
            type="hiring"
            title="聘用联系"
            description="如果您觉得我的履历和作品符合贵司审美或者用人部门要求，请及时与我联系，期待一起共事。"
            subjectLabel="岗位名称"
            subjectPlaceholder="如：品牌视觉设计师"
            rangeLabel="薪资范围"
            rangePlaceholder="如：20k - 30k"
            messageLabel="岗位描述"
            messagePlaceholder="请描述岗位职责与团队需求..."
          />
          <ContactForm
            type="commercial"
            title="商业咨询"
            description="如果您正在筹备一个对视觉有要求的项目，或者想聊聊 AIGC 与品牌设计的可能性，欢迎随时联系。"
            subjectLabel="项目类型"
            subjectPlaceholder="如：品牌设计、UI 设计"
            rangeLabel="预算范围"
            rangePlaceholder="如：5万 - 10万"
            messageLabel="项目需求"
            messagePlaceholder="请描述您的项目需求..."
          />
        </div>
      </div>

      <div
        data-testid="contact-marquee"
        aria-label="聊聊设计 · BRAND & AI · LET'S TALK ·"
        className="mt-20 overflow-hidden border-y border-white/10 py-6"
      >
        <div className="resume-contact-marquee-track flex w-max min-w-[200%] items-center">
          {marqueeGroups.map((group) => (
            <div
              key={group}
              className="flex shrink-0 items-center gap-6 whitespace-nowrap pr-6 text-[clamp(4rem,11vw,10rem)] leading-none"
            >
              <span className="font-sans font-semibold text-white">聊聊设计</span>
              <span className="text-copper">·</span>
              <span className="font-sans font-semibold text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.32)]">
                BRAND &amp; AI
              </span>
              <span className="text-copper">·</span>
              <span className="font-sans font-semibold text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.32)]">
                LET&apos;S TALK
              </span>
              <span className="text-copper">·</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
