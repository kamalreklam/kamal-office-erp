"use client";

import { useState, useEffect } from "react";
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
        <Card className="border border-border/60 shadow-sm">
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
                    placeholder="Kamal Office Equipment"
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
        <Card className="border border-border/60 shadow-sm">
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
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
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
        <Card className="border border-border/60 shadow-sm">
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
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                    form.lowStockWarning ? "right-0.5" : "right-5"
                  }`}
                />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Product Categories */}
        <Card className="border border-border/60 shadow-sm">
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
        <Card className="border border-border/60 shadow-sm">
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
                <div className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border/60 px-4 py-6 text-base text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary">
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
                    <div key={item.label} className="rounded-lg bg-white p-2.5 text-center">
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

        {/* Custom Invoice HTML Template */}
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <Code className="h-5 w-5 text-primary" />
              قالب HTML مخصص للفاتورة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              يمكنك كتابة كود HTML مخصص لتصميم الفاتورة. استخدم المتغيرات التالية وسيتم استبدالها تلقائياً:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {[
                "{{businessName}}", "{{businessNameEn}}", "{{phone}}", "{{address}}", "{{logo}}",
                "{{invoiceNumber}}", "{{date}}", "{{status}}", "{{clientName}}", "{{clientPhone}}", "{{clientAddress}}",
                "{{items}}", "{{subtotal}}", "{{discount}}", "{{total}}", "{{notes}}", "{{currencySymbol}}",
              ].map((v) => (
                <Badge key={v} variant="secondary" className="font-mono text-xs cursor-pointer" onClick={() => {
                  navigator.clipboard.writeText(v);
                  toast.success(`تم نسخ ${v}`);
                }}>
                  {v}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              المتغير <code className="bg-muted px-1 rounded">{"{{items}}"}</code> يُستبدل بصفوف جدول HTML تحتوي على: رقم، اسم المنتج، الكمية، سعر الوحدة، الإجمالي.
              اضغط على أي متغير لنسخه.
            </p>
            <Textarea
              value={form.customInvoiceHtml}
              onChange={(e) => handleChange("customInvoiceHtml", e.target.value)}
              placeholder={'<div style="direction:rtl; font-family: Almarai, sans-serif;">\n  <h1>{{businessName}}</h1>\n  <p>فاتورة: {{invoiceNumber}}</p>\n  <table>\n    {{items}}\n  </table>\n  <p>الإجمالي: {{total}}</p>\n</div>'}
              rows={10}
              className="font-mono text-xs resize-y"
              dir="ltr"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setShowHtmlPreview(!showHtmlPreview)}
              >
                {showHtmlPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {showHtmlPreview ? "إخفاء المعاينة" : "معاينة"}
              </Button>
              {form.customInvoiceHtml && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-red-600 hover:bg-red-50"
                  onClick={() => handleChange("customInvoiceHtml", "")}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  مسح القالب
                </Button>
              )}
            </div>
            {showHtmlPreview && form.customInvoiceHtml && (
              <div className="rounded-xl border border-border/60 bg-white p-6 overflow-auto max-h-[500px]">
                <p className="text-sm text-muted-foreground mb-2">معاينة (بيانات تجريبية):</p>
                <div
                  dangerouslySetInnerHTML={{
                    __html: form.customInvoiceHtml
                      .replace(/\{\{businessName\}\}/g, form.businessName)
                      .replace(/\{\{businessNameEn\}\}/g, form.businessNameEn)
                      .replace(/\{\{phone\}\}/g, form.phone)
                      .replace(/\{\{address\}\}/g, form.address)
                      .replace(/\{\{logo\}\}/g, form.logo ? `<img src="${form.logo}" style="height:50px" />` : "")
                      .replace(/\{\{invoiceNumber\}\}/g, "INV-2025-001")
                      .replace(/\{\{date\}\}/g, new Date().toISOString().split("T")[0])
                      .replace(/\{\{status\}\}/g, "مدفوعة")
                      .replace(/\{\{clientName\}\}/g, "عميل تجريبي")
                      .replace(/\{\{clientPhone\}\}/g, "0912345678")
                      .replace(/\{\{clientAddress\}\}/g, "حلب - سوريا")
                      .replace(/\{\{subtotal\}\}/g, `${form.currencySymbol}500.00`)
                      .replace(/\{\{discount\}\}/g, `${form.currencySymbol}0.00`)
                      .replace(/\{\{total\}\}/g, `${form.currencySymbol}500.00`)
                      .replace(/\{\{notes\}\}/g, form.invoiceNotes)
                      .replace(/\{\{currencySymbol\}\}/g, form.currencySymbol)
                      .replace(/\{\{items\}\}/g, `<tr><td>1</td><td>منتج تجريبي</td><td>2</td><td>${form.currencySymbol}250.00</td><td>${form.currencySymbol}500.00</td></tr>`),
                  }}
                />
              </div>
            )}
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
