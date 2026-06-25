"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type AdminLayoutContextValue = {
  rightPanel: ReactNode;
  setRightPanel: (panel: ReactNode | null) => void;
};

const AdminLayoutContext = createContext<AdminLayoutContextValue | null>(null);

export function AdminLayoutProvider({ children }: { children: ReactNode }) {
  const [rightPanel, setRightPanel] = useState<ReactNode>(null);

  return (
    <AdminLayoutContext.Provider value={{ rightPanel, setRightPanel }}>
      {children}
    </AdminLayoutContext.Provider>
  );
}

export function useAdminLayout() {
  const ctx = useContext(AdminLayoutContext);
  if (!ctx) {
    throw new Error("useAdminLayout must be used within AdminLayoutProvider");
  }
  return ctx;
}

export function AdminRightPanel({ children }: { children: ReactNode }) {
  const { setRightPanel } = useAdminLayout();

  useEffect(() => {
    setRightPanel(children);
    return () => setRightPanel(null);
  }, [children, setRightPanel]);

  return null;
}
