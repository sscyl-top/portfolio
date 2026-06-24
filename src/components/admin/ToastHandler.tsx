"use client";

import { useCallback, useState } from "react";
import { Toast } from "./Toast";

export function ToastHandler({ message }: { message: string }) {
  const [show, setShow] = useState(true);

  const handleClose = useCallback(() => {
    setShow(false);
    // 清除 URL 中的 toast 参数
    const url = new URL(window.location.href);
    url.searchParams.delete("toast");
    window.history.replaceState(null, "", url.toString());
  }, []);

  if (!show) return null;

  return <Toast message={message} onClose={handleClose} />;
}
