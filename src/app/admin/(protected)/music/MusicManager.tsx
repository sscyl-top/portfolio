"use client";

import { useRef, useState } from "react";
import { Music, Pause, Play, Plus, Save, Trash2, Upload } from "lucide-react";

import { buildPublicMediaUrl } from "@/lib/cms/media-url";

import {
  deleteMusicTrack,
  updateTrackTitle,
  uploadMusicTrack,
} from "./actions";

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

function getPublicUrl(storageKey: string) {
  return buildPublicMediaUrl(storageKey);
}

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

  const handlePlay = (trackId: string, storageKey: string) => {
    if (playingId === trackId) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(getPublicUrl(storageKey));
    audioRef.current = audio;
    audio.play();
    audio.onended = () => setPlayingId(null);
    setPlayingId(trackId);
  };

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
  const [isUploading, setIsUploading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [titleValue, setTitleValue] = useState("");

  const handleUpload = async (formData: FormData) => {
    setIsUploading(true);
    try {
      const result = await uploadMusicTrack(formData);
      if ("error" in result && result.error) {
        alert(result.error);
      } else {
        formRef.current?.reset();
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (trackId: string) => {
    if (!confirm("确定删除这首音乐吗？")) return;
    const formData = new FormData();
    formData.append("trackId", trackId);
    await deleteMusicTrack(formData);
  };

  const handleSaveTitle = async (trackId: string) => {
    if (!titleValue.trim()) return;
    const formData = new FormData();
    formData.append("trackId", trackId);
    formData.append("title", titleValue.trim());
    await updateTrackTitle(formData);
    setEditingTitle(null);
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

      <form ref={formRef} action={handleUpload} className="mt-4">
        <input type="hidden" name="categoryId" value={category.id} />
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            name="file"
            accept="audio/*"
            className="hidden"
            onChange={() => {
              if (fileInputRef.current?.files?.[0]) {
                formRef.current?.requestSubmit();
              }
            }}
          />
          <input
            type="text"
            name="title"
            placeholder="音乐标题（可选）"
            className="h-10 min-w-0 flex-1 rounded-md border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-cyan"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="inline-flex h-10 items-center gap-1.5 rounded-md border border-cyan/35 bg-cyan/10 px-4 text-sm text-cyan transition hover:bg-cyan/20 disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            {isUploading ? "上传中..." : "上传音乐"}
          </button>
        </div>
      </form>

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

                <span className="shrink-0 font-mono text-[10px] text-white/30">
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
