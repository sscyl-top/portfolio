import type { Metadata } from "next";

import { PrintToolbar } from "@/components/resume/PrintToolbar";
import { getResumeData } from "@/lib/cms/resume";

export const metadata: Metadata = {
  title: "打印简历 | 陈涛涛作品集",
  description: "打印或导出 PDF 版本的个人简历",
};

const PRINT_CSS = `
/* 打印页面：覆盖站点暗色背景，隐藏站点头部 */
body { background: #e5e7eb !important; }
body > header { display: none !important; }

/* 打印提示工具栏（仅屏幕显示） */
.rp-toolbar {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 12px 20px;
  padding: 12px 20px;
  background: #111111;
  color: #ffffff;
  font-size: 13px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.15);
}
.rp-toolbar-hint { color: rgba(255,255,255,0.72); }
.rp-print-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #ffffff;
  color: #111111;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}
.rp-print-btn:hover { background: #c9a27f; color: #ffffff; }
.rp-back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  color: #ffffff;
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 8px;
  padding: 7px 16px;
  font-size: 13px;
  text-decoration: none;
  transition: border-color 0.15s ease;
}
.rp-back-btn:hover { border-color: #ffffff; }

/* 简历纸张 */
.rp-page {
  max-width: 820px;
  margin: 0 auto;
  padding: 40px 48px 64px;
  background: #ffffff;
  color: #111111;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  line-height: 1.65;
  min-height: calc(100vh - 50px);
  box-shadow: 0 1px 24px rgba(0,0,0,0.08);
}

/* 顶部信息 */
.rp-header { border-bottom: 2px solid #111111; padding-bottom: 16px; margin-bottom: 8px; }
.rp-name { font-size: 30px; font-weight: 700; margin: 0; letter-spacing: 0.02em; }
.rp-role { font-size: 15px; color: #333333; margin: 4px 0 0; font-weight: 500; }
.rp-positioning { font-size: 13px; color: #555555; margin: 8px 0 0; }
.rp-contact { display: flex; flex-wrap: wrap; gap: 6px 18px; margin-top: 10px; font-size: 12px; color: #333333; }
.rp-contact span { white-space: nowrap; }
.rp-highlights { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
.rp-tag { border: 1px solid #888888; border-radius: 999px; padding: 2px 10px; font-size: 11px; color: #333333; }

/* 通用章节 */
.rp-section { margin-top: 22px; }
.rp-section-title {
  font-size: 15px;
  font-weight: 700;
  border-bottom: 1px solid #cccccc;
  padding-bottom: 4px;
  margin: 0 0 10px;
  letter-spacing: 0.04em;
}

/* 核心优势列表 */
.rp-list { list-style: none; padding: 0; margin: 0; }
.rp-list li {
  position: relative;
  padding-left: 14px;
  margin-bottom: 6px;
  font-size: 13px;
  line-height: 1.7;
}
.rp-list li::before { content: "•"; position: absolute; left: 0; color: #555555; }

/* 经历卡片 */
.rp-exp { margin-bottom: 14px; }
.rp-exp:last-child { margin-bottom: 0; }
.rp-exp-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
.rp-exp-company { font-size: 14px; font-weight: 600; margin: 0; }
.rp-exp-period { font-size: 12px; color: #555555; white-space: nowrap; }
.rp-exp-title { font-size: 13px; color: #333333; margin: 2px 0 6px; font-weight: 500; }
.rp-exp-points { list-style: none; padding: 0; margin: 0; }
.rp-exp-points li {
  position: relative;
  padding-left: 14px;
  margin-bottom: 4px;
  font-size: 12.5px;
  line-height: 1.65;
  color: #222222;
}
.rp-exp-points li::before { content: "–"; position: absolute; left: 0; color: #777777; }

/* 专业能力 */
.rp-expertise-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px 24px; }
.rp-expertise-title {
  font-size: 12px;
  font-weight: 600;
  color: #444444;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 4px;
}
.rp-expertise-items { font-size: 13px; color: #222222; margin: 0; }

/* 教育背景 */
.rp-edu-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
.rp-edu-school { font-size: 14px; font-weight: 600; margin: 0; }
.rp-edu-period { font-size: 12px; color: #555555; white-space: nowrap; }
.rp-edu-major { font-size: 13px; color: #333333; margin: 2px 0 0; }
.rp-edu-note { font-size: 12px; color: #555555; margin: 8px 0 0; line-height: 1.7; }
.rp-achievements { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px 20px; margin-top: 10px; }
.rp-achievement { font-size: 12px; color: #222222; margin: 0; }
.rp-achievement-label {
  color: #888888;
  margin-right: 6px;
  font-size: 11px;
  text-transform: uppercase;
}
.rp-activities { margin-top: 12px; }
.rp-activity {
  display: grid;
  grid-template-columns: 90px 1fr;
  gap: 10px;
  font-size: 12px;
  padding: 4px 0;
  border-bottom: 1px dotted #dddddd;
}
.rp-activity:last-child { border-bottom: none; }
.rp-activity-period { color: #555555; }
.rp-activity-content { color: #222222; line-height: 1.6; }
.rp-activity-content strong { font-weight: 600; }

/* 服务模块 */
.rp-services { display: flex; flex-wrap: wrap; gap: 6px 16px; }
.rp-service { font-size: 13px; color: #222222; }
.rp-service::before { content: "◆ "; color: #999999; font-size: 10px; }

/* 打印样式 */
@media print {
  .no-print { display: none !important; }
  body > header { display: none !important; }
  body { background: #ffffff !important; }
  .rp-page {
    padding: 0 !important;
    max-width: none !important;
    margin: 0 !important;
    box-shadow: none !important;
    min-height: auto !important;
  }
  a { color: #000000 !important; text-decoration: none !important; }
  .rp-section { break-inside: avoid; }
  .rp-exp { break-inside: avoid; }
  .rp-activity { break-inside: avoid; }
  @page { margin: 1.5cm; }
}
`;

export default async function PrintResumePage() {
  const resume = await getResumeData();

  return (
    <main>
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
      <PrintToolbar />
      <article className="rp-page">
        <header className="rp-header">
          <h1 className="rp-name">{resume.name}</h1>
          <p className="rp-role">{resume.role}</p>
          <p className="rp-positioning">{resume.positioning}</p>
          <div className="rp-contact">
            <span>{resume.contact.email}</span>
            <span>{resume.contact.phone}</span>
            <span>{resume.location}</span>
          </div>
          <div className="rp-highlights">
            {resume.highlights.map((item) => (
              <span key={item} className="rp-tag">
                {item}
              </span>
            ))}
          </div>
        </header>

        <section className="rp-section">
          <h2 className="rp-section-title">核心优势 / Core Strengths</h2>
          <ul className="rp-list">
            {resume.strengths.map((strength) => (
              <li key={strength}>{strength}</li>
            ))}
          </ul>
        </section>

        <section className="rp-section">
          <h2 className="rp-section-title">专业能力 / Expertise</h2>
          <div className="rp-expertise-grid">
            {resume.expertise.map((group) => (
              <div key={group.title}>
                <p className="rp-expertise-title">{group.title}</p>
                <p className="rp-expertise-items">{group.items.join("、")}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rp-section">
          <h2 className="rp-section-title">工作经验 / Experience</h2>
          {resume.experience.map((item) => (
            <div key={item.company} className="rp-exp">
              <div className="rp-exp-head">
                <h3 className="rp-exp-company">{item.company}</h3>
                <span className="rp-exp-period">{item.period}</span>
              </div>
              <p className="rp-exp-title">{item.title}</p>
              <ul className="rp-exp-points">
                {item.points.map((point, index) => (
                  <li key={index}>{point}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section className="rp-section">
          <h2 className="rp-section-title">校园经历 / Campus Experience</h2>
          {resume.campus.map((item) => (
            <div key={item.company} className="rp-exp">
              <div className="rp-exp-head">
                <h3 className="rp-exp-company">
                  {item.company} / {item.title}
                </h3>
                <span className="rp-exp-period">{item.period}</span>
              </div>
              <p className="rp-exp-title">{item.description}</p>
            </div>
          ))}
        </section>

        <section className="rp-section">
          <h2 className="rp-section-title">教育背景 / Education</h2>
          <div className="rp-edu-head">
            <div>
              <h3 className="rp-edu-school">{resume.education.school}</h3>
              <p className="rp-edu-major">{resume.education.major}</p>
            </div>
            <span className="rp-edu-period">{resume.education.period}</span>
          </div>
          <p className="rp-edu-note">{resume.education.note}</p>
          <div className="rp-achievements">
            {resume.education.achievements.map((achievement, index) => (
              <p key={index} className="rp-achievement">
                <span className="rp-achievement-label">{achievement.label}</span>
                {achievement.value}
                {achievement.detail ? `（${achievement.detail}）` : ""}
              </p>
            ))}
          </div>
          <div className="rp-activities">
            {resume.education.activities.map((activity, index) => (
              <div key={index} className="rp-activity">
                <span className="rp-activity-period">{activity.period}</span>
                <span className="rp-activity-content">
                  <strong>{activity.title}</strong> — {activity.description}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="rp-section">
          <h2 className="rp-section-title">服务模块 / Services</h2>
          <div className="rp-services">
            {resume.services.map((service) => (
              <span key={service} className="rp-service">
                {service}
              </span>
            ))}
          </div>
        </section>
      </article>
    </main>
  );
}
