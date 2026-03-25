"use client";

export interface InvoiceSettings {
  // Branding
  companyName: string;
  companyNameEn: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  logoUrl: string; // path to logo in /public or base64

  // Layout
  headerStyle: "minimal" | "modern" | "classic";
  accentColor: string;
  showProductImages: boolean;
  showDiscount: boolean;
  showStatusBadge: boolean;
  showSalesperson: boolean;
  salesperson: string;

  // Footer
  footerNote: string;
  showPageNumbers: boolean;

  // Columns
  showDescription: boolean;
  showSKU: boolean;
}

const STORAGE_KEY = "invoice_settings";

export const defaultInvoiceSettings: InvoiceSettings = {
  companyName: "برينتكس للأحبار ولوازم الطباعة",
  companyNameEn: "PRINTIX",
  companyAddress: "الجميلية - حلب - سوريا",
  companyPhone: "00905465301000",
  companyEmail: "kamalreklam.ist@gmail.com",
  logoUrl: "/logo.png",

  headerStyle: "modern",
  accentColor: "#2a7ab5",
  showProductImages: false,
  showDiscount: true,
  showStatusBadge: true,
  showSalesperson: true,
  salesperson: "BILAL TARRAB",

  footerNote: "",
  showPageNumbers: true,

  showDescription: false,
  showSKU: false,
};

export function loadInvoiceSettings(): InvoiceSettings {
  if (typeof window === "undefined") return defaultInvoiceSettings;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...defaultInvoiceSettings, ...JSON.parse(stored) };
    }
  } catch { /* ignore */ }
  return defaultInvoiceSettings;
}

export function saveInvoiceSettings(settings: InvoiceSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
