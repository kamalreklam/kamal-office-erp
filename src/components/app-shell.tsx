"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { AppSidebar } from "./app-sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className="lg:mr-[260px]">
        {/* Top bar (mobile) */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-white/80 px-4 backdrop-blur-md lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-2 text-muted-foreground hover:bg-accent"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-sm font-bold text-foreground">
            كمال للتجهيزات المكتبية
          </h1>
        </header>

        <main className="p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
