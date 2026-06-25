"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { Music, Pause, Play, Plus, Save, Settings as SettingsIcon, Trash2, Upload, X, PlusCircle, Eye, EyeOff, Check } from "lucide-react";

import { buildPublicMediaUrl } from "@/lib/cms/media-url";

import {
  addMusicTrack,
  deleteMusicTrack,
  saveMusicSettings,
  updateCategory,
  updateTrackTitle,
} from "./actions";
import type { MusicSettings } from "./types";

type Category = {
  id: string;
  key: string;
  label: string;
  emoji?: string;
  sort_order: number;
};

type Track = {
  id: string;
  category_id: string;
  title: string;
  sort_order: number;
  media: {
    id: string;
    storage_key: string;
    mime_type: string;
    original_name: string;
  } | null;
};

export function MusicManager({
  categories,
  tracks,
  settings,
}: {
  categories: Category[];
  tracks: Track[];
  settings: MusicSettings;
}) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const sortedCategories = [...categories].sort(
    (a, b) => a.sort_order - b.sort_order,
  );

  const handlePlay = useCallback(
    (trackId: string, storageKey: string) => {
      if (playingId === trackId) {
        audioRef.current?.pause();
        setPlayingId(null);
        return;
      }
      if (audioRef.current) audioRef.current.pause();
      const audio = new Audio(buildPublicMediaUrl(storageKey));
      audioRef.current = audio;
      audio.play();
      audio.onended = () => setPlayingId(null);
      setPlayingId(trackId);
    },
    [playingId],
  );

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan">
        Music Player
      </p>
      <h2 className="mt-2 text-2xl font-semibold">音乐播放器</h2>
      <p className="mt-1.5 text-xs text-white/48">
        为四个音乐分类上传背景音乐，访客点击右下角悬浮球后即可播放。支持MP3、WAV、OGG，单文件最大30MB。
      </p>

      <audio ref={audioRef} />

      <SettingsPanel initialSettings={settings} />

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {sortedCategories.map((category) => {
          const categoryTracks = tracks
            .filter((t) => t.category_id === category.id)
            .sort((a, b) => a.sort_order - b.sort_order);

          return (
            <CategorySection
              key={category.id}
              category={category}
              tracks={categoryTracks}
              playingId={playingId}
              onPlay={handlePlay}
            />
          );
        })}
      </div>
    </div>
  );
}

function SettingsPanel({ initialSettings }: { initialSettings: MusicSettings }) {
  const [isPending, startTransition] = useTransition();
  const [hideFrontend, setHideFrontend] = useState(initialSettings.hide_frontend);
  const [hideBackend, setHideBackend] = useState(initialSettings.hide_backend);
  const [playingLabel, setPlayingLabel] = useState(initialSettings.playing_label);
  const [tipMessages, setTipMessages] = useState<string[]>(
    initialSettings.tip_messages.length > 0 ? initialSettings.tip_messages : ["", "", "", ""],
  );
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const updateTip = (idx: number, val: string) => {
    setTipMessages((prev) => prev.map((t, i) => (i === idx ? val : t)));
  };

  const addTip = () => {
    setTipMessages((prev) => [...prev, ""]);
  };

  const removeTip = (idx: number) => {
    setTipMessages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    setMessage(null);
    const formData = new FormData();
    if (hideFrontend) formData.append("hide_frontend", "on");
    if (hideBackend) formData.append("hide_backend", "on");
    formData.append("playing_label", playingLabel);
    tipMessages.forEach((t) => formData.append("tip_message", t));

    startTransition(async () => {
      const result = await saveMusicSettings(formData);
      if ("error" in result && result.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({ type: "ok", text: "设置已保存" });
        setTimeout(() => setMessage(null), 2000);
      }
    });
  };

  return (
    <section className="mt-5 rounded-lg border border-white/10 bg-white/[0.025] p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan/10">
          <SettingsIcon className="h-4 w-4 text-cyan" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-white">悬浮球设置</h3>
          <p className="text-xs text-white/38">控制悬浮球的显示和弹窗文案</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <div className="grid gap-2 grid-cols-2">
            <ToggleCard
              label="前台显示"
              description="访客视角可见"
              icon={hideFrontend ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              checked={!hideFrontend}
              onChange={(v) => setHideFrontend(!v)}
              compact
            />
            <ToggleCard
              label="后台显示"
              description="编辑时可试听"
              icon={hideBackend ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              checked={!hideBackend}
              onChange={(v) => setHideBackend(!v)}
              compact
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-white/60">
              播放状态标签
            </label>
            <input
              type="text"
              value={playingLabel}
              onChange={(e) => setPlayingLabel(e.target.value)}
              placeholder="正在播放"
              className="h-9 w-full rounded-md border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-cyan"
            />
          </div>

          {message ? (
            <p
              className={`rounded-md px-3 py-1.5 text-xs ${
                message.type === "ok"
                  ? "bg-green-300/10 text-green-200"
                  : "bg-red-300/10 text-red-200"
              }`}
            >
              {message.text}
            </p>
          ) : null}

          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-cyan px-4 text-sm font-medium text-black transition hover:bg-white disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            {isPending ? "保存中..." : "保存设置"}
          </button>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-medium text-white/60">
              吸引文案（气泡轮播）
            </label>
            <button
              type="button"
              onClick={addTip}
              className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              <PlusCircle className="h-3 w-3" />
              添加
            </button>
          </div>
          <div className="space-y-1.5">
            {tipMessages.map((tip, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span className="w-5 shrink-0 text-center font-mono text-[10px] text-white/30">
                  {idx + 1}
                </span>
                <input
                  type="text"
                  value={tip}
                  onChange={(e) => updateTip(idx, e.target.value)}
                  placeholder="输入提示文案..."
                  className="h-8 min-w-0 flex-1 rounded-md border border-white/10 bg-black/20 px-2.5 text-xs outline-none focus:border-cyan"
                />
                <button
                  type="button"
                  onClick={() => removeTip(idx)}
                  disabled={tipMessages.length <= 1}
                  className="flex h-8 w-7 shrink-0 items-center justify-center rounded-md text-white/30 transition hover:bg-red-300/10 hover:text-red-300 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-white/30"
                  title="删除此条文案"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ToggleCard({
  label,
  description,
  icon,
  checked,
  onChange,
  compact = false,
}: {
  label: string;
  description: string;
  icon: React.ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-2 rounded-lg border p-2.5 text-left transition ${
        checked
          ? "border-cyan/40 bg-cyan/10"
          : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/5"
      }`}
    >
      <div
        className={`flex ${compact ? "h-7 w-7" : "h-9 w-9"} shrink-0 items-center justify-center rounded-full ${
          checked ? "bg-cyan/20 text-cyan" : "bg-white/5 text-white/40"
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`${compact ? "text-xs" : "text-sm"} font-medium ${checked ? "text-white" : "text-white/70"}`}>
          {label}
        </p>
        <p className={`${compact ? "text-[10px]" : "text-xs"} text-white/38`}>{description}</p>
      </div>
      <div
        className={`relative ${compact ? "h-5 w-9" : "h-6 w-11"} shrink-0 rounded-full transition ${
          checked ? "bg-cyan" : "bg-white/15"
        }`}
      >
        <div
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
            checked ? "left-[18px]" : "left-0.5"
          }`}
        />
      </div>
    </button>
  );
}

function CategorySection({
  category,
  tracks,
  playingId,
  onPlay,
}: {
  category: Category;
  tracks: Track[];
  playingId: string | null;
  onPlay: (trackId: string, storageKey: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{
    type: "ok" | "error";
    text: string;
  } | null>(null);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [titleValue, setTitleValue] = useState("");
  const [isEditingCat, setIsEditingCat] = useState(false);
  const [catLabel, setCatLabel] = useState(category.label);
  const [catEmoji, setCatEmoji] = useState(category.emoji || "🎵");
  const [catSaving, setCatSaving] = useState(false);

  const startEditCat = () => {
    setCatLabel(category.label);
    setCatEmoji(category.emoji || "🎵");
    setIsEditingCat(true);
  };

  const cancelEditCat = () => {
    setIsEditingCat(false);
    setMessage(null);
  };

  const handleSaveCategory = async () => {
    const label = catLabel.trim();
    const emoji = catEmoji.trim() || "🎵";
    if (!label) {
      setMessage({ type: "error", text: "分类名称不能为空" });
      return;
    }
    if (label.length > 50) {
      setMessage({ type: "error", text: "分类名称最多50个字符" });
      return;
    }
    setCatSaving(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("categoryId", category.id);
      formData.append("categoryKey", category.key);
      formData.append("label", label);
      formData.append("emoji", emoji);
      const result = await updateCategory(formData);
      if ("error" in result && result.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({ type: "ok", text: "分类已更新" });
        setIsEditingCat(false);
        setTimeout(() => window.location.reload(), 800);
      }
    } finally {
      setCatSaving(false);
    }
  };

  const uploadSingle = useCallback(
    async (file: File, title: string) => {
      if (!file.type.startsWith("audio/")) {
        throw new Error("请上传音频文件");
      }
      if (file.size > 30 * 1024 * 1024) {
        throw new Error("文件不能超过30MB");
      }

      // Step 1: 获取签名URL
      const signRes = await fetch("/api/media/sign-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "audio/mpeg",
          fileSize: file.size,
        }),
      });
      const signData = await signRes.json();
      if (!signRes.ok) throw new Error(signData.error || "获取上传凭证失败");

      // Step 2: 直传Supabase Storage（绕过Vercel大小限制）
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`上传失败 (HTTP ${xhr.status})`));
        };
        xhr.onerror = () => reject(new Error("网络错误"));
        xhr.ontimeout = () => reject(new Error("上传超时"));
        xhr.timeout = 300000;
        xhr.open("PUT", signData.signedUrl);
        xhr.setRequestHeader(
          "Content-Type",
          file.type || "application/octet-stream",
        );
        xhr.send(file);
      });

      // Step 3: 注册media记录
      const regRes = await fetch("/api/media/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storage_key: signData.storageKey,
          original_name: file.name,
          mime_type: file.type || "audio/mpeg",
          byte_size: file.size,
          alt_text: title || file.name,
        }),
      });
      const regData = await regRes.json();
      if (!regRes.ok) throw new Error(regData.error || "注册失败");

      // Step 4: 关联到音乐分类
      const formData = new FormData();
      formData.append("categoryId", category.id);
      formData.append("mediaId", regData.id);
      formData.append("title", title || file.name.replace(/\.[^.]+$/, ""));
      const result = await addMusicTrack(formData);
      if ("error" in result && result.error) {
        throw new Error(result.error);
      }
    },
    [category.id],
  );

  const handleUpload = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setMessage(null);
      setProgress(0);

      const fileInput = fileInputRef.current;
      const file = fileInput?.files?.[0];
      if (!file) {
        setMessage({ type: "error", text: "请选择音频文件" });
        return;
      }

      const title = titleInputRef.current?.value.trim() || "";
      setUploading(true);
      try {
        await uploadSingle(file, title);
        setMessage({ type: "ok", text: "上传成功！" });
        if (fileInput) fileInput.value = "";
        if (titleInputRef.current) titleInputRef.current.value = "";
        setTimeout(() => window.location.reload(), 1200);
      } catch (err) {
        setMessage({ type: "error", text: (err as Error).message });
      } finally {
        setUploading(false);
        setProgress(0);
      }
    },
    [uploadSingle],
  );

  const handleDelete = async (trackId: string) => {
    if (!confirm("确定删除这首音乐吗？")) return;
    const formData = new FormData();
    formData.append("trackId", trackId);
    await deleteMusicTrack(formData);
    window.location.reload();
  };

  const handleSaveTitle = async (trackId: string) => {
    if (!titleValue.trim()) return;
    const formData = new FormData();
    formData.append("trackId", trackId);
    formData.append("title", titleValue.trim());
    await updateTrackTitle(formData);
    setEditingTitle(null);
    window.location.reload();
  };

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan/10">
          <Music className="h-4 w-4 text-cyan" />
        </div>
        {isEditingCat ? (
          <div className="flex flex-1 flex-wrap items-center gap-1.5">
            <input
              type="text"
              value={catEmoji}
              onChange={(e) => setCatEmoji(e.target.value)}
              maxLength={8}
              className="h-7 w-12 shrink-0 rounded-md border border-cyan/40 bg-black/30 px-1 text-center text-base outline-none focus:border-cyan"
              placeholder="🎵"
              title="输入emoji"
            />
            <input
              type="text"
              value={catLabel}
              onChange={(e) => setCatLabel(e.target.value)}
              maxLength={50}
              className="h-7 min-w-0 flex-1 rounded-md border border-cyan/40 bg-black/30 px-2 text-xs text-white outline-none focus:border-cyan"
              placeholder="分类名称"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveCategory();
                if (e.key === "Escape") cancelEditCat();
              }}
            />
            <button
              type="button"
              onClick={handleSaveCategory}
              disabled={catSaving}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-cyan text-black transition hover:bg-white disabled:opacity-50"
              title="保存"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={cancelEditCat}
              disabled={catSaving}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white/50 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
              title="取消"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onDoubleClick={startEditCat}
              className="flex h-7 w-7 items-center justify-center rounded-md text-lg transition hover:bg-white/10"
              title="双击编辑emoji和名称"
            >
              {category.emoji || "🎵"}
            </button>
            <div>
              <h3
                className="cursor-text text-sm font-semibold text-white transition hover:text-cyan"
                onDoubleClick={startEditCat}
                title="双击编辑分类名称和emoji"
              >
                {category.label}
              </h3>
              <p className="text-[10px] text-white/38">{tracks.length} 首 · 双击编辑</p>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleUpload} className="mt-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <input
            ref={fileInputRef}
            type="file"
            name="file"
            accept="audio/*"
            disabled={uploading}
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0] && !titleInputRef.current?.value) {
                const name = e.target.files[0].name.replace(/\.[^.]+$/, "");
                if (titleInputRef.current) titleInputRef.current.value = name;
              }
            }}
          />
          <input
            ref={titleInputRef}
            type="text"
            name="title"
            placeholder="标题（可选）"
            disabled={uploading}
            className="h-8 min-w-0 flex-1 rounded-md border border-white/10 bg-black/20 px-2.5 text-xs outline-none focus:border-cyan disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-cyan/35 bg-cyan/10 px-2.5 text-xs text-cyan transition hover:bg-cyan/20 disabled:opacity-50"
          >
            <Upload className="h-3 w-3" />
            选文件
          </button>
          <button
            type="submit"
            disabled={uploading}
            className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md bg-cyan px-2.5 text-xs font-medium text-black transition hover:bg-white disabled:opacity-50"
          >
            {uploading ? `${progress}%` : "上传"}
          </button>
        </div>
        {uploading ? (
          <div className="mt-2">
            <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-cyan transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : null}
      </form>

      {message ? (
        <p
          className={`mt-2 rounded-md px-2.5 py-1 text-xs ${
            message.type === "ok"
              ? "bg-green-300/10 text-green-200"
              : "bg-red-300/10 text-red-200"
          }`}
        >
          {message.text}
        </p>
      ) : null}

      {tracks.length > 0 ? (
        <div className="mt-3 space-y-1">
          {tracks.map((track) => {
            const isPlaying = playingId === track.id;
            return (
              <div
                key={track.id}
                className="flex items-center gap-2 rounded-md border border-white/5 bg-white/[0.02] px-2 py-1.5"
              >
                <button
                  type="button"
                  onClick={() =>
                    track.media && onPlay(track.id, track.media.storage_key)
                  }
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan/10 text-cyan transition hover:bg-cyan/20"
                >
                  {isPlaying ? (
                    <Pause className="h-3 w-3" />
                  ) : (
                    <Play className="h-3 w-3 pl-0.5" />
                  )}
                </button>

                {editingTitle === track.id ? (
                  <div className="flex min-w-0 flex-1 items-center gap-1">
                    <input
                      type="text"
                      value={titleValue}
                      onChange={(e) => setTitleValue(e.target.value)}
                      className="h-7 min-w-0 flex-1 rounded border border-white/10 bg-black/30 px-2 text-xs outline-none focus:border-cyan"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveTitle(track.id);
                        if (e.key === "Escape") setEditingTitle(null);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveTitle(track.id)}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-cyan hover:bg-cyan/10"
                    >
                      <Save className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <p
                    className="min-w-0 flex-1 truncate text-xs text-white/80 cursor-text hover:text-white"
                    onDoubleClick={() => {
                      setEditingTitle(track.id);
                      setTitleValue(track.title);
                    }}
                  >
                    {track.title}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => handleDelete(track.id)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-red-300/50 transition hover:bg-red-300/10 hover:text-red-300"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-3 grid place-items-center rounded-md border border-dashed border-white/10 py-5 text-xs text-white/30">
          <Plus className="mb-1 h-4 w-4 opacity-50" />
          暂无音乐
        </div>
      )}
    </section>
  );
}
