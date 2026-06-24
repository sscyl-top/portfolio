import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";

import { ContactForm } from "./ContactForm";

type ContactFinaleProps = {
  email: string;
  phone: string;
  location: string;
};

const wechatId = "CTT522423";

const marqueeGroups = [0, 1, 2, 3];

export function ContactFinale({ email, phone, location }: ContactFinaleProps) {
  return (
    <section className="relative z-10 overflow-hidden border-t border-white/10 pb-8 pt-14 md:pt-20 md:pb-10">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div>
          <p className="font-mono text-xs uppercase text-copper">
            Design service / Contact
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-white md:text-6xl">
            设计服务合作
          </h2>
        </div>

        <div className="mt-8 grid grid-cols-2 border-y border-white/10 lg:grid-cols-4 md:mt-10">
          <div className="group flex min-h-[5.5rem] md:min-h-28 flex-col items-center justify-center gap-3 border-b border-white/10 px-5 text-center sm:border-r lg:border-b-0">
            <Phone aria-hidden="true" className="h-5 w-5 text-copper" />
            <span>
              <span className="block font-mono text-[11px] uppercase text-white/38">
                Phone
              </span>
              <span className="mt-1.5 block text-sm font-medium text-white/82 md:text-lg">{phone}</span>
            </span>
          </div>
          <div className="group flex min-h-[5.5rem] md:min-h-28 flex-col items-center justify-center gap-3 border-b border-white/10 px-5 text-center lg:border-b-0 lg:border-r">
            <Mail aria-hidden="true" className="h-5 w-5 text-copper" />
            <span>
              <span className="block font-mono text-[11px] uppercase text-white/38">
                Email
              </span>
              <span className="mt-1.5 block break-all text-sm font-medium text-white/82 md:text-lg">{email}</span>
            </span>
          </div>
          <div className="flex min-h-[5.5rem] md:min-h-28 flex-col items-center justify-center gap-3 border-b border-white/10 px-5 text-center sm:border-r sm:border-b-0">
            <MapPin aria-hidden="true" className="h-5 w-5 text-copper" />
            <span>
              <span className="block font-mono text-[11px] uppercase text-white/38">
                Location
              </span>
              <span className="mt-1.5 block text-sm font-medium text-white/82 md:text-lg">
                {location}
              </span>
            </span>
          </div>
          <div className="flex min-h-[5.5rem] md:min-h-28 flex-col items-center justify-center gap-3 px-5 text-center">
            <MessageCircle aria-hidden="true" className="h-5 w-5 text-copper" />
            <span>
              <span className="block font-mono text-[11px] uppercase text-white/38">
                WeChat
              </span>
              <span className="mt-1.5 block text-sm font-medium text-white/82 md:text-lg">
                {wechatId}
              </span>
            </span>
          </div>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-2 md:mt-10 md:gap-5">
          <ContactForm
            id="hiring-contact"
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
            id="commercial-contact"
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
        className="mt-14 overflow-hidden border-y border-white/10 py-5 md:mt-20 md:py-6"
      >
        <div className="resume-contact-marquee-track flex w-max min-w-[200%] items-center">
          {marqueeGroups.map((group) => (
            <div
              key={group}
              className="flex shrink-0 items-center gap-6 whitespace-nowrap pr-6 text-[clamp(2.8rem,8.5vw,10rem)] leading-none"
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
