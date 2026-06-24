"use client";

import type { ReactNode } from "react";

// Thin passthrough — the shell is now provided by Vuexy's VerticalLayout.
export function ResponsiveShell({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
