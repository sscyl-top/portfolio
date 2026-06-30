"use client";

/**
 * 客户端组件：检测登录状态后通过 React Context 共享给子组件
 *
 * 为何不放在 SiteHeader 服务端组件中：
 * - supabase.auth.getUser() 需要访问 cookies，会让所有页面强制 dynamic
 * - 移到客户端后，前台页面可被 ISR 缓存，仅头像链接在水合后切换
 *
 * UX 影响：已登录用户初次加载会看到 "/resume" 链接，水合后切换为 "/admin"（毫秒级，几乎不可察觉）
 */
import { createContext, useContext, useEffect, useState } from "react";

type UserStatus = {
  href: string;
  label: string;
  userLoggedIn: boolean;
};

const UserStatusContext = createContext<UserStatus>({
  href: "/resume",
  label: "查看简历",
  userLoggedIn: false,
});

export function useUserStatus() {
  return useContext(UserStatusContext);
}

type Props = {
  defaultHref: string;
  adminHref: string;
  defaultLabel: string;
  adminLabel: string;
  children: React.ReactNode;
};

export function UserStatusSync({
  defaultHref,
  adminHref,
  defaultLabel,
  adminLabel,
  children,
}: Props) {
  const [status, setStatus] = useState<UserStatus>({
    href: defaultHref,
    label: defaultLabel,
    userLoggedIn: false,
  });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/check", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.isAdmin) {
          setStatus({
            href: adminHref,
            label: adminLabel,
            userLoggedIn: true,
          });
        }
      })
      .catch(() => {
        // 检测失败时保持默认值
      });
    return () => {
      cancelled = true;
    };
  }, [adminHref, adminLabel]);

  return (
    <UserStatusContext.Provider value={status}>
      {children}
    </UserStatusContext.Provider>
  );
}
