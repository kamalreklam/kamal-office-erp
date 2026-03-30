"use client";

import { useState, useEffect } from "react";

const MOBILE_BREAKPOINT = 1024;

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    function check() {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return isMobile;
}
