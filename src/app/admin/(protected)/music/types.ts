export const DEFAULT_TIP_MESSAGES = [
  "来点音乐放松一下？",
  "确定不来点音乐吗？",
  "来两首，就两首！",
  "听听动感节拍，恢复活力。",
];

export type MusicSettings = {
  hide_frontend: boolean;
  hide_backend: boolean;
  hide_mobile: boolean;
  tip_messages: string[];
  playing_label: string;
};

export const DEFAULT_MUSIC_SETTINGS: MusicSettings = {
  hide_frontend: false,
  hide_backend: false,
  hide_mobile: false,
  tip_messages: DEFAULT_TIP_MESSAGES,
  playing_label: "正在播放",
};
