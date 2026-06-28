"use client";

import { useFormStatus } from "react-dom";
import { Check, Loader2 } from "lucide-react";
import { useEffect, useRef, useState, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "cyan-outline";
type Size = "sm" | "md" | "lg";

type AdminButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> & {
  variant?: Variant;
  size?: Size;
  form?: string;
  loading?: boolean;
  showSuccess?: boolean;
  successText?: string;
  icon?: React.ReactNode;
  className?: string;
  fullWidth?: boolean;
};

const sizeMap: Record<Size, string> = {
  sm: "min-h-8 px-3 text-xs",
  md: "min-h-9 px-4 text-sm",
  lg: "min-h-10 px-5 text-sm",
};

const variantMap: Record<Variant, string> = {
  primary: "bg-cyan text-black hover:bg-white shadow-sm shadow-cyan/20",
  secondary: "border border-white/12 bg-white/[0.03] text-white/70 hover:border-white/30 hover:text-white hover:bg-white/[0.06]",
  danger: "border border-red-400/25 bg-red-400/5 text-red-300 hover:bg-red-400/10 hover:border-red-400/40",
  ghost: "text-white/50 hover:text-white hover:bg-white/5",
  "cyan-outline": "border border-cyan/30 text-cyan hover:bg-cyan/10 hover:border-cyan/50",
};

export function AdminButton({
  variant = "primary",
  size = "md",
  children,
  form,
  loading: externalLoading,
  showSuccess = false,
  successText = "已保存",
  icon,
  className = "",
  fullWidth = false,
  type = "button",
  disabled,
  ...rest
}: AdminButtonProps) {
  const { pending: formPending } = useFormStatus();
  const isFormSubmit = type === "submit" || Boolean(form);
  const pending = isFormSubmit ? formPending : externalLoading;

  const [showSuccessState, setShowSuccessState] = useState(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (showSuccess) {
      // 使用 requestAnimationFrame 延迟启动，避免在 effect 中直接调用 setState
      const frameId = requestAnimationFrame(() => {
        setShowSuccessState(true);
        if (successTimerRef.current) clearTimeout(successTimerRef.current);
        successTimerRef.current = setTimeout(() => setShowSuccessState(false), 2200);
      });
      return () => cancelAnimationFrame(frameId);
    }
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, [showSuccess]);

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type={type}
        form={form}
        disabled={disabled || pending || showSuccessState}
        className={`inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.97] ${
          sizeMap[size]
        } ${variantMap[variant]} ${fullWidth ? "w-full" : ""} ${className}`}
        {...rest}
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : showSuccessState ? (
          <Check className="h-3.5 w-3.5" />
        ) : icon ? (
          icon
        ) : null}
        {showSuccessState ? successText : children}
      </button>
    </span>
  );
}

export function SuccessHint({ children, show, variant = "success" }: { children: React.ReactNode; show: boolean; variant?: "success" | "error" }) {
  if (!show) return null;
  const colors = variant === "success" ? "text-emerald-400" : "text-red-400";
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${colors}`} style={{ animation: "fadeIn 0.2s ease-out" }}>
      {variant === "success" ? <Check className="h-3 w-3" /> : null}
      {children}
    </span>
  );
}
