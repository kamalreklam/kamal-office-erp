"use client";

import { useState, useEffect } from "react";
import { loadInvoiceTemplate, saveInvoiceTemplate, resetInvoiceTemplate, DEFAULT_TEMPLATE, TEMPLATE_VARIABLES } from "@/lib/invoice-settings";
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
  Save, Upload, Trash2, DollarSign, Code, Eye, EyeOff, Database, FileUp, CheckCircle2, AlertTriangle, Plus, X, Package,
} from "lucide-react";
import { ImageUpload } from "@/components/image-upload";
import { useStore, type AppSettings, type OdooImportData } from "@/lib/store";
import { toast } from "sonner";

export default function SettingsPage() {
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
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-8 page-enter">
        <div className="animate-fade-in-up text-center">
          <h1 className="text-2xl font-extrabold text-foreground sm:text-3xl">الإعدادات</h1>
          <p className="mt-1.5 text-sm text-muted-foreground sm:mt-2 sm:text-base">تخصيص إعدادات النظام والفواتير</p>
          {hasChanges && (
            <div className="mt-4 flex justify-center">
              <Button className="gap-1.5" onClick={handleSave}>
                <Save className="h-4 w-4" />
                حفظ التغييرات
              </Button>
            </div>
          )}
        </div>

        {/* Business Info */}
        <Card className="border border-[var(--glass-border)] shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <Building2 className="h-5 w-5 text-primary" />
              معلومات المنشأة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col gap-5 sm:flex-row">
              <ImageUpload
                value={form.logo}
                onChange={(img) => handleChange("logo", img)}
                size="lg"
                label="الشعار"
              />
              <div className="flex-1 space-y-4">
                <div className="grid gap-1.5">
                  <label className="text-base font-medium">اسم المنشأة (عربي)</label>
                  <Input
                    value={form.businessName}
                    onChange={(e) => handleChange("businessName", e.target.value)}
                    placeholder="كمال للتجهيزات المكتبية"
                  />
                </div>
                <div className="grid gap-1.5">
                  <label className="text-base font-medium">اسم المنشأة (إنجليزي)</label>
                  <Input
                    value={form.businessNameEn}
                    onChange={(e) => handleChange("businessNameEn", e.target.value)}
                    placeholder="Kamal Copy Center"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <label className="text-base font-medium">رقم الهاتف</label>
                <Input
                  value={form.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="0912345678"
                  dir="ltr"
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-base font-medium">العنوان</label>
                <Input
                  value={form.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="حلب - سوريا"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Settings */}
        <Card className="border border-[var(--glass-border)] shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <FileText className="h-5 w-5 text-primary" />
              إعدادات الفواتير
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="grid gap-1.5">
                <label className="text-base font-medium">بادئة الفاتورة</label>
                <Input
                  value={form.invoicePrefix}
                  onChange={(e) => handleChange("invoicePrefix", e.target.value)}
                  placeholder="INV"
                  dir="ltr"
                />
                <p className="text-xs text-muted-foreground">
                  مثال: {form.invoicePrefix}-2025-001
                </p>
              </div>
              <div className="grid gap-1.5">
                <label className="text-base font-medium">العملة</label>
                <Input
                  value={form.currency}
                  onChange={(e) => handleChange("currency", e.target.value)}
                  placeholder="USD"
                  dir="ltr"
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-base font-medium">رمز العملة</label>
                <Input
                  value={form.currencySymbol}
                  onChange={(e) => handleChange("currencySymbol", e.target.value)}
                  placeholder="$"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <label className="text-base font-medium">ملاحظة أسفل الفاتورة</label>
              <Textarea
                value={form.invoiceNotes}
                onChange={(e) => handleChange("invoiceNotes", e.target.value)}
                placeholder="شكراً لتعاملكم معنا"
                rows={2}
                className="resize-none"
              />
            </div>

            <Separator />

            {/* Tax */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-medium">تفعيل الضريبة</p>
                <p className="text-sm text-muted-foreground">إضافة ضريبة تلقائياً على الفواتير</p>
              </div>
              <button
                onClick={() => handleChange("taxEnabled", !form.taxEnabled)}
                className={`relative h-6 w-11 rounded-full transition-colors ${form.taxEnabled ? "bg-primary" : "bg-muted"}`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-[var(--surface-1)] shadow-sm transition-transform ${
                    form.taxEnabled ? "right-0.5" : "right-5"
                  }`}
                />
              </button>
            </div>

            {form.taxEnabled && (
              <div className="grid gap-1.5 sm:w-1/3">
                <label className="text-base font-medium">نسبة الضريبة (%)</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.taxRate}
                  onChange={(e) => handleChange("taxRate", parseFloat(e.target.value) || 0)}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="border border-[var(--glass-border)] shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <Bell className="h-5 w-5 text-primary" />
              التنبيهات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-medium">تنبيه المخزون المنخفض</p>
                <p className="text-sm text-muted-foreground">إظهار تنبيه عندما ينخفض مخزون منتج عن الحد الأدنى</p>
              </div>
              <button
                onClick={() => handleChange("lowStockWarning", !form.lowStockWarning)}
                className={`relative h-6 w-11 rounded-full transition-colors ${form.lowStockWarning ? "bg-primary" : "bg-muted"}`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-[var(--surface-1)] shadow-sm transition-transform ${
                    form.lowStockWarning ? "right-0.5" : "right-5"
                  }`}
                />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Product Categories */}
        <Card className="border border-[var(--glass-border)] shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <Package className="h-5 w-5 text-primary" />
              فئات المنتجات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              إدارة فئات المنتجات المتاحة في المخزون
            </p>
            <div className="flex flex-wrap gap-2">
              {form.productCategories.map((cat) => (
                <Badge key={cat} variant="secondary" className="gap-1.5 px-3 py-1.5 text-sm">
                  {cat}
                  <button
                    onClick={() => {
                      handleChange("productCategories", form.productCategories.filter((c) => c !== cat));
                    }}
                    className="rounded-full p-0.5 hover:bg-destructive/20 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="اسم الفئة الجديدة..."
                className="flex-1"
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
                className="gap-1.5"
                onClick={() => {
                  if (newCategory.trim() && !form.productCategories.includes(newCategory.trim())) {
                    handleChange("productCategories", [...form.productCategories, newCategory.trim()]);
                    setNewCategory("");
                  }
                }}
              >
                <Plus className="h-4 w-4" />
                إضافة
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* HTML Invoice Template Editor */}
        <Card className="border border-[var(--glass-border)] shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <Code className="h-5 w-5 text-primary" />
              محرر قالب الفاتورة (HTML)
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              عدّل كود HTML للفاتورة مباشرة مع معاينة حية. استخدم المتغيرات أدناه لإدراج البيانات.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Template Variables Reference */}
            <details className="rounded-xl border border-[var(--glass-border)] overflow-hidden">
              <summary className="px-4 py-3 cursor-pointer text-sm font-semibold bg-[var(--surface-2)] hover:bg-[var(--surface-3)] transition-colors">
                📋 المتغيرات المتاحة (اضغط للعرض)
              </summary>
              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(TEMPLATE_VARIABLES).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-2 rounded-lg bg-[var(--surface-2)] px-2.5 py-1.5">
                    <code className="text-[10px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">{key}</code>
                    <span className="text-[10px] text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>
            </details>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <div className="flex-1" />
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleResetTemplate}>
                <RotateCcw className="h-3 w-3" />
                إعادة تعيين
              </Button>
              <Button size="sm" className="gap-1.5 text-xs" onClick={handleSaveTemplate}>
                <Save className="h-3 w-3" />
                حفظ القالب
              </Button>
            </div>

            {/* Code Editor */}
            <textarea
              value={invoiceHtml}
              onChange={e => setInvoiceHtml(e.target.value)}
              dir="ltr"
              className="w-full rounded-xl border border-[var(--glass-border)] p-4 font-mono text-xs leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
              style={{
                minHeight: 500,
                background: "var(--surface-2)",
                color: "var(--text-primary)",
                tabSize: 2,
              }}
              spellCheck={false}
            />

            {/* Test Export */}
            <Button variant="outline" className="w-full gap-2" onClick={async () => {
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
                toast.success("تم تصدير فاتورة تجريبية");
              } catch (e) { toast.error("فشل تصدير الفاتورة: " + (e as Error).message); }
            }}>
              <Download className="h-4 w-4" />
              تصدير فاتورة تجريبية كـ PDF
            </Button>
          </CardContent>
        </Card>

        {/* Danger zone */}
        <Card className="border border-red-200/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-red-600">
              <Trash2 className="h-5 w-5" />
              منطقة الخطر
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-base font-medium">إعادة تعيين جميع البيانات</p>
                <p className="text-sm text-muted-foreground">حذف جميع البيانات المحلية والعودة للبيانات الافتراضية</p>
              </div>
              <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => setResetDialogOpen(true)}>
                <RotateCcw className="h-4 w-4" />
                إعادة تعيين
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Save button at bottom */}
        {hasChanges && (
          <div className="sticky bottom-4">
            <Button className="w-full gap-2 shadow-lg" size="lg" onClick={handleSave}>
              <Save className="h-4 w-4" />
              حفظ جميع التغييرات
            </Button>
          </div>
        )}
      </div>

      <ResetDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <ResetDialogContent className="max-w-sm" dir="rtl">
          <ResetDialogHeader>
            <ResetDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              إعادة تعيين جميع البيانات
            </ResetDialogTitle>
          </ResetDialogHeader>
          <p className="text-base text-muted-foreground">
            سيتم حذف جميع البيانات المحلية والعودة للبيانات الافتراضية. هذا الإجراء لا يمكن التراجع عنه.
          </p>
          <ResetDialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setResetDialogOpen(false)}>إلغاء</Button>
            <Button variant="destructive" onClick={handleReset}>حذف جميع البيانات</Button>
          </ResetDialogFooter>
        </ResetDialogContent>
      </ResetDialog>
    </AppShell>
  );
}
