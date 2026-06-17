import { Database, ImageUp, LockKeyhole, Rocket } from "lucide-react";

const adminModules = [
  {
    icon: ImageUp,
    title: "作品上传",
    text: "拖拽图片、GIF、短视频，保存封面、尺寸、alt 文案和排序。",
  },
  {
    icon: Database,
    title: "内容编排",
    text: "填写标题、分类、标签、工具、配色，并用内容块组织详情页。",
  },
  {
    icon: LockKeyhole,
    title: "发布状态",
    text: "支持草稿、公开发布、私密链接三种作品状态。",
  },
  {
    icon: Rocket,
    title: "上线联动",
    text: "第二阶段接入 Payload CMS、数据库与对象存储后启用。",
  },
];

export default function AdminPage() {
  return (
    <main className="px-5 pb-24 pt-32 md:px-8">
      <section className="mx-auto max-w-5xl">
        <p className="font-mono text-xs uppercase tracking-[0.26em] text-copper">
          Admin roadmap
        </p>
        <h1 className="mt-5 text-5xl font-semibold leading-tight text-white md:text-7xl">
          后台模块预留
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-white/58">
          第一阶段先完成前台可预览版本。这里保留后台入口和数据结构说明，第二阶段接入
          Payload CMS 后变成真实登录、上传和发布后台。
        </p>

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {adminModules.map((module) => (
            <div
              key={module.title}
              className="rounded-lg border border-white/10 bg-white/[0.035] p-6"
            >
              <module.icon className="h-6 w-6 text-copper" aria-hidden="true" />
              <h2 className="mt-6 text-2xl font-semibold text-white">
                {module.title}
              </h2>
              <p className="mt-3 leading-7 text-white/58">{module.text}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
