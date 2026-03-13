import type { Metadata } from "next";
import { Almarai } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { StoreProvider } from "@/lib/store";
import "./globals.css";

const almarai = Almarai({
  subsets: ["arabic"],
  weight: ["300", "400", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "كمال للتجهيزات المكتبية | نظام الإدارة",
  description: "نظام إدارة المخزون والفواتير - كمال للتجهيزات المكتبية - حلب",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${almarai.variable} font-sans antialiased`}>
        <StoreProvider>
          {children}
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
