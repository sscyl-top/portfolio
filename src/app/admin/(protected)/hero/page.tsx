import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { SaveButton } from "@/components/admin/SaveButton";
import { buildPublicMediaUrl } from "@/lib/cms/media-url";

import { getHeroVideoConfig, saveHeroVideos } from "./actions";

type MediaAssetRow = {
  id: string;
  storage_key: string;
  mime_type: string;
  original_name: string;
  alt_text: string;
};

type VideoSlotConfig = {
  label: string;
  description: string;
  fieldName: string;
  currentMediaId: string | null;
  preview: "main" | "side-1" | "side-2" | "side-3";
};

export default async function AdminHeroPage({ searchParams }: { searchParams: Promise<{ toast?: string }> }) {
  const { toast } = await searchParams;
  const [config, supabase] = await Promise.all([
    getHeroVideoConfig(),
    createSupabaseServerClient(),
  ]);

  const { data: rawMedia } = await supabase
    .from("media_assets")
    .select("id,storage_key,mime_type,original_name,alt_text")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  // Only show video assets in the picker
  const videoAssets = ((rawMedia ?? []) as MediaAssetRow[]).filter((a) =>
    a.mime_type.startsWith("video/"),
  );

  const slots: VideoSlotConfig[] = [
    {
      label: "主卡片视频",
      description: "首页第一屏大卡片背景视频，建议 16:9 比例",
      fieldName: "mainVideoMediaId",
      currentMediaId: config?.mainVideoMediaId ?? null,
      preview: "main",
    },
    {
      label: "小卡片 1（左上）",
      description: "浮动小卡片，建议 1:1 比例",
      fieldName: "sideCard1MediaId",
      currentMediaId: config?.sideCard1MediaId ?? null,
      preview: "side-1",
    },
    {
      label: "小卡片 2（左侧）",
      description: "浮动小卡片，建议 1:1 比例",
      fieldName: "sideCard2MediaId",
      currentMediaId: config?.sideCard2MediaId ?? null,
      preview: "side-2",
    },
    {
      label: "小卡片 3（右下）",
      description: "浮动宽卡片，建议 2:1 比例",
      fieldName: "sideCard3MediaId",
      currentMediaId: config?.sideCard3MediaId ?? null,
      preview: "side-3",
    },
  ];

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan">
        Hero videos
      </p>
      <h2 className="mt-3 text-3xl font-semibold">首页 Hero 视频</h2>
      <p className="mt-3 text-sm text-white/48">
        管理首页第一屏大卡片和浮动小卡片的背景视频。视频会以自动播放、静音、循环方式渲染。不选择则显示渐变占位色。
      </p>

      {videoAssets.length === 0 ? (
        <p className="mt-6 rounded-md border border-yellow-300/20 bg-yellow-300/10 p-4 text-sm text-yellow-200">
          媒体库暂无视频素材。请先到「媒体库」上传视频文件，再回到此页面选择。
        </p>
      ) : null}

      <form action={saveHeroVideos} className="mt-6 grid gap-6">
        {slots.map((slot) => {
          const selectedAsset = videoAssets.find(
            (a) => a.id === slot.currentMediaId,
          );

          return (
            <section
              key={slot.fieldName}
              className="rounded-md border border-white/10 bg-white/[0.035] p-5"
            >
              <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold">{slot.label}</h3>
                  <p className="mt-1 text-xs text-white/42">
                    {slot.description}
                  </p>
                </div>
                {selectedAsset ? (
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] text-white/36">
                      当前: {selectedAsset.original_name}
                    </span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <video
                      src={buildPublicMediaUrl(selectedAsset.storage_key)}
                      muted
                      playsInline
                      autoPlay
                      loop
                      className="h-12 rounded border border-white/10 object-cover"
                    />
                  </div>
                ) : (
                  <span className="rounded-md border border-dashed border-white/15 px-3 py-1.5 text-xs text-white/30">
                    未选择（渐变占位）
                  </span>
                )}
              </div>

              <MediaPicker
                assets={videoAssets}
                mode="single"
                fieldName={slot.fieldName}
                defaultValue={
                  slot.currentMediaId ? [slot.currentMediaId] : []
                }
              />
            </section>
          );
        })}

        <div className="flex items-center justify-end gap-2">
          <SaveButton saved={toast === "Hero配置保存成功"}>保存 Hero 配置</SaveButton>
        </div>
      </form>
    </div>
  );
}
