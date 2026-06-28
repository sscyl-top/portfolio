import { Info, AlertTriangle, CheckCircle, Lightbulb } from "lucide-react";
import type { ContentBlock } from "@/data/portfolio";

type CalloutBlockData = Extract<ContentBlock, { type: "callout" }>;

type Props = Omit<CalloutBlockData, "type" | "layout">;

/** icon 字段映射到 lucide 图标组件 */
const ICON_MAP = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle,
  tip: Lightbulb,
} as const;

/** tone 字段映射到配色方案 */
const TONE_MAP = {
  cyan: {
    container: "border-cyan/30 bg-cyan/5",
    icon: "text-cyan",
  },
  amber: {
    container: "border-amber-400/30 bg-amber-400/5",
    icon: "text-amber-400",
  },
  green: {
    container: "border-green-400/30 bg-green-400/5",
    icon: "text-green-400",
  },
  red: {
    container: "border-red-400/30 bg-red-400/5",
    icon: "text-red-400",
  },
} as const;

/** 重点提示框：根据 tone 选择颜色，根据 icon 选择 lucide 图标 */
export function CalloutBlock({ heading, text, icon, tone }: Props) {
  const Icon = ICON_MAP[icon];
  const toneStyles = TONE_MAP[tone];

  return (
    <div className={`rounded-lg border p-4 ${toneStyles.container}`}>
      <div className="flex gap-3">
        <Icon
          aria-hidden="true"
          className={`mt-0.5 h-5 w-5 shrink-0 ${toneStyles.icon}`}
        />
        <div className="space-y-1">
          {heading ? (
            <p className="font-semibold text-ink">{heading}</p>
          ) : null}
          <p className="text-sm leading-7 text-ink-2">{text}</p>
        </div>
      </div>
    </div>
  );
}
