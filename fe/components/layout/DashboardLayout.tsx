import { ReactNode } from "react";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div data-theme="dark" className="fixed inset-0 flex h-screen w-screen overflow-hidden">
      {children}
    </div>
  );
}