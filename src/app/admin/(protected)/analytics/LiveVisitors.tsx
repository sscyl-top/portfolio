"use client";

import { Activity } from "lucide-react";
import { useEffect, useState } from "react";

export function LiveVisitors({ initial }: { initial: number }) {
  const [count, setCount] = useState(initial);

  useEffect(() => {
    let mounted = true;

    const fetchLive = async () => {
      try {
        const response = await fetch("/api/admin/analytics/live");
        if (!response.ok) return;
        const data = (await response.json()) as { liveVisitors?: number };
        if (mounted && typeof data.liveVisitors === "number") {
          setCount(data.liveVisitors);
        }
      } catch {
        // 轮询失败保持旧值
      }
    };

    fetchLive();
    const interval = setInterval(fetchLive, 10000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="rounded-lg border border-cyan/25 bg-cyan/[0.04] p-4">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase text-white/36">当前在线</p>
        <Activity aria-hidden="true" className="h-3.5 w-3.5 text-cyan" />
      </div>
      <p className="mt-2 text-3xl font-semibold text-white">{count}</p>
    </div>
  );
}
