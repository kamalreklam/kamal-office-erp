"use client";

import { useState, useEffect } from "react";
import { loadInvoiceSettings, saveInvoiceSettings, defaultInvoiceSettings, type InvoiceSettings } from "@/lib/invoice-settings";
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
  Settings, Building2, FileText, Bell, Palette, RotateCcw,
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
  const [invSettings, setInvSettings] = useState<InvoiceSettings>(defaultInvoiceSettings);

  // Load invoice settings on mount
  useEffect(() => {
    setInvSettings(loadInvoiceSettings());
  }, []);

  function handleInvChange<K extends keyof InvoiceSettings>(key: K, value: InvoiceSettings[K]) {
    setInvSettings(prev => {
      const updated = { ...prev, [key]: value };
      saveInvoiceSettings(updated);
      return updated;
    });
    toast.success("تم حفظ إعدادات الفاتورة");
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

        {/* Import from Odoo */}
        <Card className="border border-[var(--glass-border)] shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <Database className="h-5 w-5 text-primary" />
              استيراد من Odoo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              استيراد بيانات العملاء والمنتجات والفواتير والطلبات من ملف JSON المُصدَّر من نظام Odoo.
              يمكنك تصدير البيانات باستخدام الأمر:
            </p>
            <div className="rounded-lg bg-muted/50 p-3 font-mono text-xs" dir="ltr">
              node scripts/parse-odoo.js dump.sql output.json
            </div>
            <div className="flex items-center gap-3">
              <label className="flex-1">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportFile}
                  className="hidden"
                  disabled={importing}
                />
                <div className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[var(--glass-border)] px-4 py-6 text-base text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary">
                  {importing ? (
                    <span className="animate-spin">⏳</span>
                  ) : (
                    <FileUp className="h-5 w-5" />
                  )}
                  <span>{importing ? "جاري الاستيراد..." : "اختر ملف JSON للاستيراد"}</span>
                </div>
              </label>
            </div>

            {importResult && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 space-y-2">
                <div className="flex items-center gap-2 text-base font-bold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  تم الاستيراد بنجاح
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { label: "عملاء", count: importResult.clients },
                    { label: "منتجات", count: importResult.products },
                    { label: "فواتير", count: importResult.invoices },
                    { label: "طلبات", count: importResult.orders },
                  ].map((item) => (
                    <div key={item.label} className="rounded-lg bg-[var(--surface-1)] p-2.5 text-center">
                      <p className="text-lg font-bold text-emerald-700">{item.count}</p>
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              البيانات المُستوردة ستُضاف إلى البيانات الحالية دون حذف أي بيانات موجودة. لن يتم استيراد البيانات المكررة.
            </p>
          </CardContent>
        </Card>

        {/* Advanced Invoice Customizer */}
        <Card className="border border-[var(--glass-border)] shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <FileText className="h-5 w-5 text-primary" />
              تخصيص الفاتورة (PDF)
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">تخصيص شكل وبيانات الفاتورة عند التصدير — يُحفظ تلقائياً</p>
          </CardHeader>
          <CardContent className="space-y-6">

            {/* Invoice Branding */}
            <div className="rounded-xl border border-[var(--glass-border)] p-5 space-y-4">
              <h4 className="text-sm font-bold flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /> بيانات الشركة في الفاتورة</h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">اسم الشركة (عربي)</label>
                  <Input value={invSettings.companyName} onChange={e => handleInvChange("companyName", e.target.value)} placeholder="برينتكس للأحبار ولوازم الطباعة" />
                </div>
                <div className="grid gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">اسم الشركة (إنجليزي)</label>
                  <Input value={invSettings.companyNameEn} onChange={e => handleInvChange("companyNameEn", e.target.value)} placeholder="PRINTIX" dir="ltr" />
                </div>
                <div className="grid gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">العنوان</label>
                  <Input value={invSettings.companyAddress} onChange={e => handleInvChange("companyAddress", e.target.value)} placeholder="الجميلية - حلب - سوريا" />
                </div>
                <div className="grid gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">رقم الهاتف</label>
                  <Input value={invSettings.companyPhone} onChange={e => handleInvChange("companyPhone", e.target.value)} placeholder="00905465301000" dir="ltr" />
                </div>
                <div className="grid gap-1.5 sm:col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">البريد الإلكتروني</label>
                  <Input value={invSettings.companyEmail} onChange={e => handleInvChange("companyEmail", e.target.value)} placeholder="info@company.com" dir="ltr" />
                </div>
              </div>
              <div className="grid gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">رابط الشعار (في مجلد public)</label>
                <Input value={invSettings.logoUrl} onChange={e => handleInvChange("logoUrl", e.target.value)} placeholder="/logo.png" dir="ltr" />
                <p className="text-[10px] text-muted-foreground">ضع ملف الشعار في مجلد public ثم اكتب المسار مثل: /logo.png</p>
              </div>
            </div>

            {/* Layout Options */}
            <div className="rounded-xl border border-[var(--glass-border)] p-5 space-y-4">
              <h4 className="text-sm font-bold flex items-center gap-2"><Palette className="h-4 w-4 text-primary" /> التصميم والتخطيط</h4>

              {/* Header Style */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">نمط الترويسة</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: "minimal" as const, label: "بسيط", desc: "خط سفلي فقط" },
                    { value: "modern" as const, label: "عصري", desc: "تدرج لوني" },
                    { value: "classic" as const, label: "كلاسيكي", desc: "خلفية ملونة" },
                  ]).map(opt => (
                    <button key={opt.value} type="button" onClick={() => handleInvChange("headerStyle", opt.value)}
                      className="rounded-xl border p-3 text-center transition-all"
                      style={{
                        borderColor: invSettings.headerStyle === opt.value ? invSettings.accentColor : "var(--border-default)",
                        background: invSettings.headerStyle === opt.value ? "var(--accent-soft)" : "var(--surface-2)",
                      }}>
                      <p className="text-sm font-semibold" style={{ color: invSettings.headerStyle === opt.value ? invSettings.accentColor : "var(--text-primary)" }}>{opt.label}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Accent Color */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">لون الفاتورة</label>
                <div className="flex gap-2 flex-wrap">
                  {["#2a7ab5", "#2563eb", "#7c3aed", "#0d9488", "#dc2626", "#d97706", "#059669", "#db2777", "#1e293b"].map(color => (
                    <button key={color} type="button" onClick={() => handleInvChange("accentColor", color)}
                      className="h-8 w-8 rounded-full transition-all"
                      style={{
                        backgroundColor: color,
                        outline: invSettings.accentColor === color ? `3px solid ${color}` : "none",
                        outlineOffset: "2px",
                      }} />
                  ))}
                </div>
              </div>
            </div>

            {/* Toggles */}
            <div className="rounded-xl border border-[var(--glass-border)] p-5 space-y-3">
              <h4 className="text-sm font-bold flex items-center gap-2"><Settings className="h-4 w-4 text-primary" /> خيارات العرض</h4>
              {([
                { key: "showStatusBadge" as const, label: "إظهار حالة الفاتورة", desc: "مدفوعة / غير مدفوعة" },
                { key: "showSalesperson" as const, label: "إظهار مندوب المبيعات", desc: "اسم المندوب في الترويسة" },
                { key: "showDiscount" as const, label: "إظهار سطر الخصم", desc: "حتى لو كان صفر" },
                { key: "showPageNumbers" as const, label: "إظهار أرقام الصفحات", desc: "في أسفل الفاتورة" },
              ]).map(opt => (
                <div key={opt.key} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
                  </div>
                  <button onClick={() => handleInvChange(opt.key, !invSettings[opt.key])}
                    className={`relative h-6 w-11 rounded-full transition-colors ${invSettings[opt.key] ? "bg-primary" : "bg-muted"}`}>
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-[var(--surface-1)] shadow-sm transition-transform ${invSettings[opt.key] ? "right-0.5" : "right-5"}`} />
                  </button>
                </div>
              ))}

              {invSettings.showSalesperson && (
                <div className="grid gap-1.5 pt-1">
                  <label className="text-xs font-medium text-muted-foreground">اسم المندوب</label>
                  <Input value={invSettings.salesperson} onChange={e => handleInvChange("salesperson", e.target.value)} placeholder="BILAL TARRAB" dir="ltr" />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="rounded-xl border border-[var(--glass-border)] p-5 space-y-3">
              <h4 className="text-sm font-bold">ملاحظة أسفل الفاتورة</h4>
              <Input value={invSettings.footerNote} onChange={e => handleInvChange("footerNote", e.target.value)} placeholder="شكراً لتعاملكم معنا" />
            </div>

            {/* Preview button */}
            <Button variant="outline" className="w-full gap-2" onClick={async () => {
              try {
                const { exportInvoicePDF } = await import("@/lib/pdf");
                const sampleInvoice = {
                  id: "preview", invoiceNumber: "S00001", clientId: "", clientName: "عميل تجريبي",
                  items: [
                    { id: "1", productId: "", productName: "Master Book Magic Black 1LT", description: "", quantity: 32, unitPrice: 6.25, total: 200 },
                    { id: "2", productId: "", productName: "Master Book Magic Cyan 1LT", description: "", quantity: 32, unitPrice: 6.25, total: 200 },
                  ],
                  subtotal: 400, discountType: "fixed" as const, discountValue: 0, discountAmount: 0, taxAmount: 0,
                  total: 400, status: "مدفوعة" as const, notes: "", createdAt: new Date().toISOString().split("T")[0],
                };
                await exportInvoicePDF(sampleInvoice, settings);
                toast.success("تم تصدير فاتورة تجريبية");
              } catch { toast.error("فشل تصدير الفاتورة التجريبية"); }
            }}>
              <Eye className="h-4 w-4" />
              معاينة فاتورة تجريبية
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
