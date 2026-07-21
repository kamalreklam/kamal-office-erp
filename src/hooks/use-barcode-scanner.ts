"use client";

import { useEffect, useRef } from "react";
import type { Product } from "@/lib/data";
import { toast } from "sonner";

// Listens for fast, uninterrupted keystrokes anywhere outside an input/textarea/select
// (the signature of a USB/Bluetooth barcode scanner acting as a keyboard) and resolves
// them against product SKUs. Ignores normal human typing by requiring <50ms between keys.
export function useBarcodeScanner(products: Product[], onScan: (product: Product) => void) {
  const productsRef = useRef(products);
  useEffect(() => { productsRef.current = products; }, [products]);

  const onScanRef = useRef(onScan);
  useEffect(() => { onScanRef.current = onScan; }, [onScan]);

  useEffect(() => {
    let buffer = "";
    let lastKeyTime = 0;

    function handleGlobalKeyDown(e: KeyboardEvent) {
      if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement).tagName)) return;

      const now = Date.now();
      if (now - lastKeyTime > 50) buffer = "";
      lastKeyTime = now;

      if (e.key === "Enter") {
        if (buffer.length >= 3) {
          e.preventDefault();
          const product = productsRef.current.find((p) => p.sku === buffer);
          if (product) onScanRef.current(product);
          else toast.error(`الباركود غير مسجل: ${buffer}`);
          buffer = "";
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        buffer += e.key;
      }
    }

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);
}
