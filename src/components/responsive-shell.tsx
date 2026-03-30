"use client";

import { useIsMobile } from "@/hooks/use-is-mobile";
import { AppShell } from "./app-shell";
import { MobileShell } from "./mobile/mobile-shell";

export function ResponsiveShell({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileShell>{children}</MobileShell>;
  }

  return <AppShell>{children}</AppShell>;
}
