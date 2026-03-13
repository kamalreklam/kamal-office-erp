import type { Metadata, Viewport } from "next";
import { Almarai } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { StoreProvider } from "@/lib/store";
import { PWARegister } from "@/components/pwa-register";
import "./globals.css";

const almarai = Almarai({
  subsets: ["arabic"],
  weight: ["300", "400", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0284c7",
};

export const metadata: Metadata = {
  title: "كمال للتجهيزات المكتبية | نظام الإدارة",
  description: "نظام إدارة المخزون والفواتير - كمال للتجهيزات المكتبية - حلب",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "كمال ERP",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png" />
      </head>
      <body className={`${almarai.variable} font-sans antialiased`}>
        <StoreProvider>
          {children}
          <PWARegister />
          <Toaster
            position="bottom-left"
            dir="rtl"
            richColors
            closeButton
            toastOptions={{
              style: { fontFamily: "var(--font-sans)" },
            }}
          />
        </StoreProvider>
      </body>
    </html>
  );
}
