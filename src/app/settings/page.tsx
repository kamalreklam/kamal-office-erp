"use client";

import { useState, useEffect } from "react";
import { loadInvoiceTemplate, saveInvoiceTemplate, resetInvoiceTemplate, DEFAULT_TEMPLATE, TEMPLATE_VARIABLES } from "@/lib/invoice-settings";
import { ResponsiveShell } from "@/components/responsive-shell";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { MobileSettings } from "@/components/mobile/mobile-settings";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog as ResetDialog, DialogContent as ResetDialogContent, DialogHeader as ResetDialogHeader,
  DialogTitle as ResetDialogTitle, DialogFooter as ResetDialogFooter,
} from "@/components/ui/dialog";
import {
  Settings, Building2, FileText, Bell, Palette, RotateCcw, Download,
  Save, Upload, Trash2, DollarSign, Code, Eye, EyeOff, Database, FileUp, CheckCircle2, AlertTriangle, Plus, X, Package, ChevronDown,
} from "lucide-react";
import { ImageUpload } from "@/components/image-upload";
import { useStore, type AppSettings, type OdooImportData } from "@/lib/store";
import { toast } from "sonner";

export default function SettingsPage() {
  const isMobile = useIsMobile();
  if (isMobile) return <AppShell><MobileSettings /></AppShell>;
  return <DesktopSettings />;
}

function DesktopSettings() {
  const { settings, updateSettings, importOdooData } = useStore();
  const [form, setForm] = useState<AppSettings>({ ...settings });
  const [hasChanges, setHasChanges] = useState(false);
  const [showHtmlPreview, setShowHtmlPreview] = useState(false);
  const [importResult, setImportResult] = useState<{ clients: number; products: number; invoices: number; orders: number } | null>(null);
  const [importing, setImporting] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [invoiceHtml, setInvoiceHtml] = useState(DEFAULT_TEMPLATE);
  const [showPreview, setShowPreview] = useState(true);
  const [editorTab, setEditorTab] = useState<"code" | "preview">("code");

  // Load invoice template on mount
  useEffect(() => {
    setInvoiceHtml(loadInvoiceTemplate());
  }, []);

  function handleSaveTemplate() {
    saveInvoiceTemplate(invoiceHtml);
    toast.success("تم حفظ قالب الفاتورة");
  }

  function handleResetTemplate() {
    resetInvoiceTemplate();
    setInvoiceHtml(DEFAULT_TEMPLATE);
    toast.success("تم إعادة تعيين القالب للافتراضي");
  }

  // Generate preview HTML with sample data
  function getPreviewHtml(): string {
    return invoiceHtml
      .replace(/\{\{companyName\}\}/g, "برينتكس للأحبار ولوازم الطباعة")
      .replace(/\{\{companyNameEn\}\}/g, "PRINTIX")
      .replace(/\{\{companyAddress\}\}/g, "الجميلية - حلب - سوريا")
      .replace(/\{\{companyPhone\}\}/g, "00905465301000")
      .replace(/\{\{companyEmail\}\}/g, "kamalreklam.ist@gmail.com")
      .replace(/\{\{logoUrl\}\}/g, "/logo.png")
      .replace(/\{\{invoiceNumber\}\}/g, "S00023")
      .replace(/\{\{clientName\}\}/g, "مركز خلدان")
      .replace(/\{\{date\}\}/g, "30/12/2025")
      .replace(/\{\{status\}\}/g, "مدفوعة")
      .replace(/\{\{salesperson\}\}/g, "BILAL TARRAB")
      .replace(/\{\{itemsRows\}\}/g, `
        <tr><td class="t-bold">Master Book Magic Black 1LT</td><td class="t-center">32.00 الوحدات</td><td class="t-center">$6.25</td><td class="t-left t-bold">$200.00</td></tr>
        <tr><td class="t-bold">Master Book Magic Cyan 1LT</td><td class="t-center">32.00 الوحدات</td><td class="t-center">$6.25</td><td class="t-left t-bold">$200.00</td></tr>
        <tr><td class="t-bold">Master Book Magic Magenta 1LT</td><td class="t-center">32.00 الوحدات</td><td class="t-center">$6.25</td><td class="t-left t-bold">$200.00</td></tr>
        <tr><td class="t-bold">Master Book Magic Yellow 1LT</td><td class="t-center">32.00 الوحدات</td><td class="t-center">$6.25</td><td class="t-left t-bold">$200.00</td></tr>
      `)
      .replace(/\{\{subtotal\}\}/g, "$800.00")
      .replace(/\{\{discountRow\}\}/g, "")
      .replace(/\{\{taxRow\}\}/g, "")
      .replace(/\{\{total\}\}/g, "$800.00")
      .replace(/\{\{currencySymbol\}\}/g, "$")
      .replace(/\{\{notes\}\}/g, "");
  }

  // Warn before leaving with unsaved changes
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (hasChanges) { e.preventDefault(); }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasChanges]);

  function handleChange<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  }

  function handleSave() {
    updateSettings(form);
    setHasChanges(false);
    toast.success("تم حفظ الإعدادات بنجاح");
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string) as OdooImportData;
        if (!data.clients && !data.products && !data.invoices && !data.orders) {
          toast.error("ملف غير صالح - لا يحتوي على بيانات قابلة للاستيراد");
          setImporting(false);
          return;
        }
        const counts = importOdooData(data);
        setImportResult(counts);
        toast.success(`تم استيراد البيانات بنجاح! ${counts.clients} عميل، ${counts.products} منتج، ${counts.invoices} فاتورة، ${counts.orders} طلب`);
      } catch {
        toast.error("خطأ في قراءة الملف - تأكد من أنه ملف JSON صالح");
      }
      setImporting(false);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function handleReset() {
    localStorage.clear();
    window.location.reload();
  }

  return (
    <ResponsiveShell>
      <div className="mx-auto max-w-3xl space-y-6">
        
        {/* Banner Header Widget */}
        <div className="relative overflow-hidden rounded-[28px] bg-white border border-[var(--glass-border)] p-6 shadow-sm">
          {/* Subtle CMYK theme glows in background */}
          <div className="absolute -left-20 -top-20 h-40 w-40 rounded-full bg-cyan-400/10 blur-[60px] pointer-events-none" />
          <div className="absolute left-10 -bottom-20 h-40 w-40 rounded-full bg-pink-400/10 blur-[60px] pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3.5 py-1 text-xs font-bold text-indigo-700 border border-indigo-100">
                ⚙️ الإعدادات العامة للنظام
              </span>
              <h1 className="text-2xl font-black text-[var(--text-primary)] mt-3">إعدادات النظام</h1>
              <p className="text-[13px] text-[var(--text-muted)] mt-1 font-medium">تخصيص معلومات المنشأة، الضرائب، التنبيهات، وفئات المنتجات</p>
            </div>
            
            <div>
              {hasChanges && (
                <Button className="gap-1.5 h-10 px-5 rounded-xl text-xs font-bold shadow-md hover-lift" onClick={handleSave}>
                  <Save className="h-4 w-4" />
                  حفظ الإعدادات
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Business Info */}
        <div className="m3-card relative overflow-hidden bg-white shadow-sm border border-[var(--glass-border)] rounded-[24px] p-6 hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-2 mb-6 border-b border-gray-50 pb-3">
            <Building2 className="h-5 w-5 text-[var(--brand-primary)]" />
            <h2 className="text-[16px] font-black text-[var(--text-primary)]">معلومات المنشأة</h2>
          </div>
          <div className="space-y-6">
            <div className="flex flex-col gap-5 sm:flex-row items-center sm:items-start">
              <ImageUpload
                value={form.logo}
                onChange={(img) => handleChange("logo", img)}
                size="lg"
                label="الشعار"
              />
              <div className="flex-1 w-full space-y-4">
                <div className="grid gap-1.5">
                  <label className="text-xs font-bold text-[var(--text-secondary)]">اسم المنشأة (عربي)</label>
                  <Input
                    value={form.businessName}
                    onChange={(e) => handleChange("businessName", e.target.value)}
                    placeholder="كمال للتجهيزات المكتبية"
                    className="rounded-xl h-11 border-[var(--border-default)] focus:border-[var(--brand-primary)] bg-[var(--surface-2)]/50 focus:bg-white transition-all shadow-sm text-sm"
                  />
                </div>
                <div className="grid gap-1.5">
                  <label className="text-xs font-bold text-[var(--text-secondary)]">اسم المنشأة (إنجليزي)</label>
                  <Input
                    value={form.businessNameEn}
                    onChange={(e) => handleChange("businessNameEn", e.target.value)}
                    placeholder="Kamal Copy Center"
                    dir="ltr"
                    className="rounded-xl h-11 border-[var(--border-default)] focus:border-[var(--brand-primary)] bg-[var(--surface-2)]/50 focus:bg-white transition-all shadow-sm text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <label className="text-xs font-bold text-[var(--text-secondary)]">رقم الهاتف</label>
                <Input
                  value={form.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="0912345678"
                  dir="ltr"
                  className="rounded-xl h-11 border-[var(--border-default)] focus:border-[var(--brand-primary)] bg-[var(--surface-2)]/50 focus:bg-white transition-all shadow-sm text-sm"
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-xs font-bold text-[var(--text-secondary)]">العنوان</label>
                <Input
                  value={form.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="حلب - سوريا"
                  className="rounded-xl h-11 border-[var(--border-default)] focus:border-[var(--brand-primary)] bg-[var(--surface-2)]/50 focus:bg-white transition-all shadow-sm text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Settings */}
        <div className="m3-card relative overflow-hidden bg-white shadow-sm border border-[var(--glass-border)] rounded-[24px] p-6 hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-2 mb-6 border-b border-gray-50 pb-3">
            <FileText className="h-5 w-5 text-[var(--brand-primary)]" />
            <h2 className="text-[16px] font-black text-[var(--text-primary)]">إعدادات الفواتير والعملة</h2>
          </div>
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="grid gap-1.5">
                <label className="text-xs font-bold text-[var(--text-secondary)]">بادئة الفاتورة</label>
                <Input
                  value={form.invoicePrefix}
                  onChange={(e) => handleChange("invoicePrefix", e.target.value)}
                  placeholder="INV"
                  dir="ltr"
                  className="rounded-xl h-11 border-[var(--border-default)] focus:border-[var(--brand-primary)] bg-[var(--surface-2)]/50 focus:bg-white transition-all shadow-sm text-sm"
                />
                <p className="text-[10px] text-[var(--text-muted)] font-medium">
                  مثال: {form.invoicePrefix}-2025-001
                </p>
              </div>
              <div className="grid gap-1.5">
                <label className="text-xs font-bold text-[var(--text-secondary)]">العملة</label>
                <Input
                  value={form.currency}
                  onChange={(e) => handleChange("currency", e.target.value)}
                  placeholder="USD"
                  dir="ltr"
                  className="rounded-xl h-11 border-[var(--border-default)] focus:border-[var(--brand-primary)] bg-[var(--surface-2)]/50 focus:bg-white transition-all shadow-sm text-sm"
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-xs font-bold text-[var(--text-secondary)]">رمز العملة</label>
                <Input
                  value={form.currencySymbol}
                  onChange={(e) => handleChange("currencySymbol", e.target.value)}
                  placeholder="$"
                  dir="ltr"
                  className="rounded-xl h-11 border-[var(--border-default)] focus:border-[var(--brand-primary)] bg-[var(--surface-2)]/50 focus:bg-white transition-all shadow-sm text-sm"
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <label className="text-xs font-bold text-[var(--text-secondary)]">ملاحظة أسفل الفاتورة</label>
              <Textarea
                value={form.invoiceNotes}
                onChange={(e) => handleChange("invoiceNotes", e.target.value)}
                placeholder="شكراً لتعاملكم معنا"
                rows={2}
                className="resize-none rounded-xl border-[var(--border-default)] focus:border-[var(--brand-primary)] bg-[var(--surface-2)]/50 focus:bg-white transition-all p-3 shadow-sm text-sm"
              />
            </div>

            <div className="h-px bg-gray-100 my-2" />

            {/* Tax Switch */}
            <div className="flex items-center justify-between rounded-xl bg-[var(--surface-2)] p-4 border border-[var(--border-default)]">
              <div>
                <p className="text-sm font-bold text-[var(--text-primary)]">تفعيل الضريبة</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">إضافة ضريبة تلقائياً على جميع الفواتير الجديدة</p>
              </div>
              <button
                onClick={() => handleChange("taxEnabled", !form.taxEnabled)}
                className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${form.taxEnabled ? "bg-[var(--brand-primary)]" : "bg-gray-200"}`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-200 ${
                    form.taxEnabled ? "right-0.5" : "right-[21px]"
                  }`}
                />
              </button>
            </div>

            {form.taxEnabled && (
              <div className="grid gap-1.5 sm:w-1/3 animate-fade-in">
                <label className="text-xs font-bold text-[var(--text-secondary)]">نسبة الضريبة (%)</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.taxRate}
                  onChange={(e) => handleChange("taxRate", parseFloat(e.target.value) || 0)}
                  className="rounded-xl h-11 border-[var(--border-default)] focus:border-[var(--brand-primary)] bg-[var(--surface-2)]/50 focus:bg-white transition-all shadow-sm text-sm"
                />
              </div>
            )}
          </div>
        </div>

        {/* Notifications */}
        <div className="m3-card relative overflow-hidden bg-white shadow-sm border border-[var(--glass-border)] rounded-[24px] p-6 hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-2 mb-6 border-b border-gray-50 pb-3">
            <Bell className="h-5 w-5 text-[var(--brand-primary)]" />
            <h2 className="text-[16px] font-black text-[var(--text-primary)]">التنبيهات والمخزون</h2>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-[var(--surface-2)] p-4 border border-[var(--border-default)]">
            <div>
              <p className="text-sm font-bold text-[var(--text-primary)]">تنبيه المخزون المنخفض</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">عرض إشعار تحذيري عند وصول مخزون المنتج إلى الحد الأدنى المحدد له</p>
            </div>
            <button
              onClick={() => handleChange("lowStockWarning", !form.lowStockWarning)}
              className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${form.lowStockWarning ? "bg-[var(--brand-primary)]" : "bg-gray-200"}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-200 ${
                  form.lowStockWarning ? "right-0.5" : "right-[21px]"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Product Categories */}
        <div className="m3-card relative overflow-hidden bg-white shadow-sm border border-[var(--glass-border)] rounded-[24px] p-6 hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-2 mb-6 border-b border-gray-50 pb-3">
            <Package className="h-5 w-5 text-[var(--brand-primary)]" />
            <h2 className="text-[16px] font-black text-[var(--text-primary)]">فئات المنتجات</h2>
          </div>
          <div className="space-y-4">
            <p className="text-xs text-[var(--text-muted)] font-medium">
              إدارة فئات المنتجات والأحبار المتاحة في النظام للفرز السريع.
            </p>
            <div className="flex flex-wrap gap-2">
              {form.productCategories.map((cat) => (
                <span key={cat} className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50/50 text-indigo-700 border border-indigo-100 px-3 py-1 text-xs font-bold">
                  {cat}
                  <button
                    onClick={() => {
                      handleChange("productCategories", form.productCategories.filter((c) => c !== cat));
                    }}
                    className="rounded-full p-0.5 hover:bg-red-100 hover:text-red-600 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            
            <div className="flex gap-2">
              <Input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="اسم الفئة الجديدة..."
                className="flex-1 rounded-xl h-10 border-[var(--border-default)] focus:border-[var(--brand-primary)] bg-[var(--surface-2)]/50 focus:bg-white transition-all text-xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newCategory.trim() && !form.productCategories.includes(newCategory.trim())) {
                    handleChange("productCategories", [...form.productCategories, newCategory.trim()]);
                    setNewCategory("");
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 rounded-xl h-10 border-[var(--border-default)] hover:bg-indigo-50 hover:text-indigo-600 px-4 text-xs font-bold"
                onClick={() => {
                  if (newCategory.trim() && !form.productCategories.includes(newCategory.trim())) {
                    handleChange("productCategories", [...form.productCategories, newCategory.trim()]);
                    setNewCategory("");
                  }
                }}
              >
                <Plus className="h-4 w-4" />
                إضافة فئة
              </Button>
            </div>
          </div>
        </div>

        {/* HTML Invoice Template Editor with Playground */}
        <div className="m3-card relative overflow-hidden bg-white shadow-sm border border-[var(--glass-border)] rounded-[24px] p-6 hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-2 mb-3">
            <Code className="h-5 w-5 text-[var(--brand-primary)]" />
            <h2 className="text-[16px] font-black text-[var(--text-primary)]">محرر قالب الفاتورة (HTML)</h2>
          </div>
          <p className="text-xs text-[var(--text-muted)] font-medium mb-4">
            قم بتخصيص كود HTML وتصميم الفواتير المصدرة كـ PDF مع توفر متغيرات حية للاستبدال.
          </p>

          <div className="space-y-4">
            {/* Template Variables Reference */}
            <details className="rounded-xl border border-[var(--border-default)] overflow-hidden transition-all bg-[var(--surface-2)]">
              <summary className="px-4 py-3 cursor-pointer text-xs font-bold hover:bg-gray-100/60 transition-colors flex items-center justify-between">
                <span>📋 المتغيرات المتاحة للاستخدام في القالب</span>
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </summary>
              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-2 border-t border-[var(--border-default)] bg-white">
                {Object.entries(TEMPLATE_VARIABLES).map(([key, label]) => (
                  <div key={key} className="flex flex-col gap-0.5 rounded-lg bg-[var(--surface-2)] p-2 border border-gray-100">
                    <code className="text-[10px] font-mono text-[var(--brand-primary)] bg-indigo-50 px-1 py-0.5 rounded-md self-start">{`{{${key}}}`}</code>
                    <span className="text-[10px] text-[var(--text-muted)] font-medium mt-1">{label}</span>
                  </div>
                ))}
              </div>
            </details>

            {/* Tab Switched Header */}
            <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-3 pt-1">
              <div className="flex rounded-xl border border-[var(--border-default)] overflow-hidden p-0.5 bg-[var(--surface-2)]">
                <button
                  onClick={() => setEditorTab("code")}
                  className={`flex h-8 px-4 items-center justify-center rounded-lg text-xs font-bold transition-all ${editorTab === "code" ? "bg-white text-[var(--brand-primary)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}
                >
                  📝 كود القالب
                </button>
                <button
                  onClick={() => setEditorTab("preview")}
                  className={`flex h-8 px-4 items-center justify-center rounded-lg text-xs font-bold transition-all ${editorTab === "preview" ? "bg-white text-[var(--brand-primary)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}
                >
                  👁️ معاينة حية للفاتورة
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" className="gap-1.5 h-8.5 rounded-xl border-[var(--border-default)] text-xs font-bold" onClick={handleResetTemplate}>
                  <RotateCcw className="h-3.5 w-3.5 text-gray-500" />
                  <span>الافتراضي</span>
                </Button>
                <Button size="sm" className="gap-1.5 h-8.5 rounded-xl text-xs font-bold" onClick={handleSaveTemplate}>
                  <Save className="h-3.5 w-3.5" />
                  <span>حفظ القالب</span>
                </Button>
              </div>
            </div>

            {/* Code / Preview Area */}
            {editorTab === "code" ? (
              <textarea
                value={invoiceHtml}
                onChange={e => setInvoiceHtml(e.target.value)}
                dir="ltr"
                className="w-full rounded-2xl border border-[var(--border-default)] p-4 font-mono text-xs leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary shadow-inner"
                style={{
                  minHeight: 500,
                  background: "#1E1E2E",
                  color: "#CDD6F4",
                  tabSize: 2,
                }}
                spellCheck={false}
              />
            ) : (
              <div className="rounded-2xl border border-[var(--border-default)] overflow-hidden bg-white shadow-inner min-h-[500px] flex flex-col">
                <iframe
                  srcDoc={getPreviewHtml()}
                  className="w-full flex-1 min-h-[500px] bg-white border-none"
                  title="Invoice Template Real-time Preview"
                />
              </div>
            )}

            {/* Test Export */}
            <Button variant="outline" className="w-full gap-2 rounded-xl h-11 border-[var(--border-default)] text-xs font-bold hover:bg-gray-50" onClick={async () => {
              try {
                const { exportInvoicePDF } = await import("@/lib/pdf");
                const sampleInvoice = {
                  id: "preview", invoiceNumber: "S00023", clientId: "", clientName: "مركز خلدان",
                  items: [
                    { id: "1", productId: "", productName: "Master Book Magic Black 1LT", description: "", quantity: 32, unitPrice: 6.25, total: 200 },
                    { id: "2", productId: "", productName: "Master Book Magic Cyan 1LT", description: "", quantity: 32, unitPrice: 6.25, total: 200 },
                    { id: "3", productId: "", productName: "Master Book Magic Magenta 1LT", description: "", quantity: 32, unitPrice: 6.25, total: 200 },
                    { id: "4", productId: "", productName: "Master Book Magic Yellow 1LT", description: "", quantity: 32, unitPrice: 6.25, total: 200 },
                  ],
                  subtotal: 800, discountType: "fixed" as const, discountValue: 0, discountAmount: 0, taxAmount: 0,
                  total: 800, status: "مدفوعة" as const, notes: "", createdAt: "2025-12-30",
                };
                await exportInvoicePDF(sampleInvoice, settings, { phone: "00905465301000", address: "حلب" });
                toast.success("تم تصدير فاتورة تجريبية كـ PDF");
              } catch (e) { toast.error("فشل تصدير الفاتورة: " + (e as Error).message); }
            }}>
              <Download className="h-4 w-4" />
              تصدير فاتورة تجريبية كـ PDF للتحقق من المخرجات
            </Button>
          </div>
        </div>

        {/* Danger zone */}
        <div className="m3-card relative overflow-hidden bg-red-50/10 shadow-sm border border-red-200 rounded-[24px] p-6 hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-2 mb-4 border-b border-red-100/60 pb-3">
            <Trash2 className="h-5 w-5 text-red-600" />
            <h2 className="text-[16px] font-black text-red-600">منطقة الخطر</h2>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-red-900">إعادة تعيين جميع بيانات النظام</p>
              <p className="text-xs text-red-600 mt-0.5">سيتم مسح جميع العملاء، المنتجات، الفواتير، والطلبات المخزنة والعودة للبيانات الافتراضية.</p>
            </div>
            <Button variant="destructive" size="sm" className="gap-1.5 rounded-xl h-10 px-4 text-xs font-bold" onClick={() => setResetDialogOpen(true)}>
              <RotateCcw className="h-4 w-4" />
              إعادة تعيين النظام
            </Button>
          </div>
        </div>

        {/* Save button at bottom */}
        {hasChanges && (
          <div className="sticky bottom-4 z-50 animate-fade-in-up">
            <Button className="w-full gap-2 shadow-lg h-12 rounded-xl text-sm font-black" onClick={handleSave}>
              <Save className="h-4 w-4" />
              حفظ جميع التغييرات المعلقة الإعدادات
            </Button>
          </div>
        )}
      </div>

      <ResetDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <ResetDialogContent className="max-w-sm rounded-2xl" dir="rtl">
          <ResetDialogHeader>
            <ResetDialogTitle className="flex items-center gap-2 text-red-600 text-base font-black">
              <AlertTriangle className="h-5 w-5" />
              تأكيد إعادة تعيين النظام بالكامل
            </ResetDialogTitle>
          </ResetDialogHeader>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            سيتم حذف جميع السجلات والمبيعات والمخزون المخزنة محلياً بشكل نهائي. هل تريد بالتأكيد الاستمرار؟
          </p>
          <ResetDialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="outline" className="rounded-xl text-xs font-bold" onClick={() => setResetDialogOpen(false)}>إلغاء</Button>
            <Button variant="destructive" className="rounded-xl text-xs font-bold" onClick={handleReset}>نعم، احذف كل البيانات</Button>
          </ResetDialogFooter>
        </ResetDialogContent>
      </ResetDialog>
    </ResponsiveShell>
  );
}
