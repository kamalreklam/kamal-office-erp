"use client";

import { MobileHeader } from "./mobile-header";
import { MobileTabBar } from "./mobile-tab-bar";
import { PageTransition } from "@/components/page-transition";

export function MobileShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: "var(--ground)" }}>
      <MobileHeader />
      <main className="px-4 py-4 pb-24">
        <PageTransition>{children}</PageTransition>
      </main>
      <MobileTabBar />
    </div>
  );
}
