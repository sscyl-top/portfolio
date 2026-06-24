export const FONT_FAMILIES = [
  { value: "", label: "默认字体" },
  { value: "font-sans", label: "无衬线 (系统默认)" },
  { value: "font-serif", label: "衬线体 (系统默认)" },
  { value: "font-mono", label: "等宽字体 (系统默认)" },
  { value: "'Microsoft YaHei', '微软雅黑', sans-serif", label: "微软雅黑" },
  { value: "'PingFang SC', '苹方', sans-serif", label: "苹方 (Mac)" },
  { value: "'Noto Sans SC', '思源黑体', sans-serif", label: "思源黑体" },
  { value: "'Source Han Sans', sans-serif", label: "思源黑体 (Source Han)" },
  { value: "'SimHei', '黑体', sans-serif", label: "黑体" },
  { value: "'SimSun', '宋体', serif", label: "宋体" },
  { value: "'KaiTi', '楷体', serif", label: "楷体" },
  { value: "Inter, sans-serif", label: "Inter (英文)" },
  { value: "'Helvetica Neue', Helvetica, Arial, sans-serif", label: "Helvetica" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "'Playfair Display', serif", label: "Playfair Display" },
  { value: "'Roboto', sans-serif", label: "Roboto" },
  { value: "'Open Sans', sans-serif", label: "Open Sans" },
];

export const FONT_SIZES = [
  { value: "", label: "默认" },
  { value: "text-xs", label: "特小 (xs)" },
  { value: "text-sm", label: "小 (sm)" },
  { value: "text-base", label: "正常 (base)" },
  { value: "text-lg", label: "大 (lg)" },
  { value: "text-xl", label: "特大 (xl)" },
  { value: "text-2xl", label: "2xl" },
  { value: "text-3xl", label: "3xl" },
  { value: "text-4xl", label: "4xl" },
  { value: "text-5xl", label: "5xl" },
  { value: "text-6xl", label: "6xl" },
  { value: "text-7xl", label: "7xl" },
  { value: "text-8xl", label: "8xl" },
];

export const FONT_WEIGHTS = [
  { value: "", label: "默认" },
  { value: "font-thin", label: "极细 (100)" },
  { value: "font-light", label: "细 (300)" },
  { value: "font-normal", label: "正常 (400)" },
  { value: "font-medium", label: "中等 (500)" },
  { value: "font-semibold", label: "半粗 (600)" },
  { value: "font-bold", label: "粗 (700)" },
  { value: "font-extrabold", label: "特粗 (800)" },
  { value: "font-black", label: "黑体 (900)" },
];

export function applyTextStyles(
  baseClass: string,
  styles?: Record<string, string>,
): string {
  if (!styles) return baseClass;
  const classes: string[] = [baseClass];
  if (styles.fontSize) classes.push(styles.fontSize);
  if (styles.fontWeight) classes.push(styles.fontWeight);
  return classes.join(" ");
}

export function getTextStyleObject(
  styles?: Record<string, string>,
): React.CSSProperties {
  if (!styles) return {};
  const result: React.CSSProperties = {};
  if (styles.fontFamily) result.fontFamily = styles.fontFamily;
  if (styles.color) result.color = styles.color;
  return result;
}
