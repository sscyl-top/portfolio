"use client";

import { useCallback, useRef, useState } from "react";
import { Music, Pause, Play, Plus, Save, Trash2, Upload } from "lucide-react";

import { buildPublicMediaUrl } from "@/lib/cms/media-url";

import { addMusicTrack, deleteMusicTrack, updateTrackTitle } from "./actions";

type Category = {
  id: string;
  key: string;
  label: string;
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
}: {
  categories: Category[];
  tracks: Track[];
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
      <h2 className="mt-3 text-3xl font-semibold">音乐播放器</h2>
      <p className="mt-3 text-sm text-white/48">
        为四个音乐分类上传背景音乐，访客点击右下角悬浮球后即可播放。支持MP3、WAV、OGG格式，单文件最大30MB。
      </p>

      <audio ref={audioRef} />

      <div className="mt-8 space-y-6">
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
    <section className="rounded-lg border border-white/10 bg-white/[0.025] p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan/10">
          <Music className="h-5 w-5 text-cyan" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">{category.label}</h3>
          <p className="text-xs text-white/38">{tracks.length} 首音乐</p>
        </div>
      </div>

      <form onSubmit={handleUpload} className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
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
            placeholder="音乐标题（可选，默认使用文件名）"
            disabled={uploading}
            className="h-10 min-w-0 flex-1 rounded-md border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-cyan disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md border border-cyan/35 bg-cyan/10 px-4 text-sm text-cyan transition hover:bg-cyan/20 disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            选择文件
          </button>
          <button
            type="submit"
            disabled={uploading}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md bg-cyan px-4 text-sm font-medium text-black transition hover:bg-white disabled:opacity-50"
          >
            {uploading ? "上传中..." : "上传音乐"}
          </button>
        </div>
        {uploading ? (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-white/48">
              <span>正在上传...</span>
              <span>{progress}%</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
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
          className={`mt-3 rounded-md px-3 py-1.5 text-sm ${
            message.type === "ok"
              ? "bg-green-300/10 text-green-200"
              : "bg-red-300/10 text-red-200"
          }`}
        >
          {message.text}
        </p>
      ) : null}

      {tracks.length > 0 ? (
        <div className="mt-4 space-y-2">
          {tracks.map((track) => {
            const isPlaying = playingId === track.id;
            return (
              <div
                key={track.id}
                className="flex items-center gap-3 rounded-md border border-white/5 bg-white/[0.02] px-3 py-2.5"
              >
                <button
                  type="button"
                  onClick={() =>
                    track.media && onPlay(track.id, track.media.storage_key)
                  }
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan/10 text-cyan transition hover:bg-cyan/20"
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4 pl-0.5" />
                  )}
                </button>

                {editingTitle === track.id ? (
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <input
                      type="text"
                      value={titleValue}
                      onChange={(e) => setTitleValue(e.target.value)}
                      className="h-8 min-w-0 flex-1 rounded border border-white/10 bg-black/30 px-2 text-sm outline-none focus:border-cyan"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveTitle(track.id);
                        if (e.key === "Escape") setEditingTitle(null);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveTitle(track.id)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-cyan hover:bg-cyan/10"
                    >
                      <Save className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <p
                    className="min-w-0 flex-1 truncate text-sm text-white/80 cursor-text hover:text-white"
                    onDoubleClick={() => {
                      setEditingTitle(track.id);
                      setTitleValue(track.title);
                    }}
                  >
                    {track.title}
                  </p>
                )}

                <span className="hidden shrink-0 font-mono text-[10px] text-white/30 sm:inline">
                  {track.media?.original_name}
                </span>

                <button
                  type="button"
                  onClick={() => handleDelete(track.id)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-red-300/60 transition hover:bg-red-300/10 hover:text-red-300"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 grid place-items-center rounded-md border border-dashed border-white/10 py-8 text-sm text-white/30">
          <Plus className="mb-2 h-6 w-6 opacity-50" />
          暂无音乐，上传第一首吧
        </div>
      )}
    </section>
  );
}
