"use client";

import { useState, useEffect } from "react";
import { loadInvoiceTemplate, saveInvoiceTemplate, resetInvoiceTemplate, DEFAULT_TEMPLATE, TEMPLATE_VARIABLES } from "@/lib/invoice-settings";
import { ImageUpload } from "@/components/image-upload";
import { useStore, type AppSettings, type OdooImportData } from "@/lib/store";
import { toast } from "sonner";
import {
  Settings as SettingsIcon,
  Save,
  Building2,
  FileText,
  Bell,
  Package,
  Code2,
  AlertTriangle,
  RefreshCw,
  Plus,
  X,
  ChevronDown,
  Download
} from "lucide-react";

export default function SettingsPage() {
  const { settings, updateSettings, importOdooData, connectionStatus } = useStore();
  const [form, setForm] = useState<AppSettings>({ ...settings });
  const [hasChanges, setHasChanges] = useState(false);
  const [importResult, setImportResult] = useState<{ clients: number; products: number; invoices: number; orders: number } | null>(null);
  const [importing, setImporting] = useState(false);
  const [resetWarningOpen, setResetWarningOpen] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [invoiceHtml, setInvoiceHtml] = useState(DEFAULT_TEMPLATE);
  const [variablesOpen, setVariablesOpen] = useState(false);

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

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length > 4 && val.length <= 7) val = val.slice(0, 4) + " " + val.slice(4);
    else if (val.length > 7) val = val.slice(0, 4) + " " + val.slice(4, 7) + " " + val.slice(7, 10);
    handleChange("phone", val);
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

  if (connectionStatus === 'loading') {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-32 bg-gradient-to-br from-indigo-50/50 via-white to-blue-50/30 min-h-screen" dir="rtl">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <div className="w-16 h-16 rounded-3xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20 mb-6">
              <SettingsIcon className="size-8" />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900">الإعدادات</h1>
            <p className="mt-2 text-base font-medium text-slate-500 max-w-lg leading-relaxed">
              تخصيص إعدادات النظام ومعلومات المنشأة وقوالب الفواتير الخاصة بك.
            </p>
          </div>
          
          {hasChanges && (
            <button
              onClick={handleSave}
              className="h-14 px-8 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 active:scale-95 transition-all shadow-[0_8px_20px_-6px_rgba(79,70,229,0.4)] flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <Save className="size-5" />
              <span>حفظ التغييرات</span>
            </button>
          )}
        </div>

        {/* Business Info Card */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="p-6 sm:p-8 border-b border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Building2 className="size-6" />
            </div>
            <h2 className="text-xl font-black text-slate-900">معلومات المنشأة</h2>
          </div>
          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row gap-8 items-start">
              <div className="shrink-0 w-full sm:w-auto flex justify-center">
                <ImageUpload
                  value={form.logo}
                  onChange={(img) => handleChange("logo", img)}
                  size="lg"
                  label="شعار المنشأة"
                />
              </div>
              <div className="flex-1 w-full space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">اسم المنشأة (عربي)</label>
                    <input
                      type="text"
                      value={form.businessName}
                      onChange={(e) => handleChange("businessName", e.target.value)}
                      placeholder="شركة كمال للتجارة"
                      className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">اسم المنشأة (إنجليزي)</label>
                    <input
                      type="text"
                      dir="ltr"
                      value={form.businessNameEn}
                      onChange={(e) => handleChange("businessNameEn", e.target.value)}
                      placeholder="Kamal Trading Co"
                      className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-bold text-slate-900"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">رقم الهاتف</label>
                    <input
                      type="text"
                      dir="ltr"
                      value={form.phone}
                      onChange={handlePhoneChange}
                      placeholder="0912 345 678"
                      className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-bold font-mono text-slate-900 text-left"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">العنوان</label>
                    <input
                      type="text"
                      value={form.address}
                      onChange={(e) => handleChange("address", e.target.value)}
                      placeholder="المدينة، الشارع..."
                      className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-bold text-slate-900"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Settings Card */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="p-6 sm:p-8 border-b border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <FileText className="size-6" />
            </div>
            <h2 className="text-xl font-black text-slate-900">إعدادات الفواتير</h2>
          </div>
          <div className="p-6 sm:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">بادئة الفاتورة</label>
                <input
                  type="text"
                  dir="ltr"
                  value={form.invoicePrefix}
                  onChange={(e) => handleChange("invoicePrefix", e.target.value)}
                  placeholder="INV"
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-bold text-slate-900 font-mono uppercase"
                />
                <p className="text-xs font-bold text-slate-400 mt-2">مثال: {form.invoicePrefix}-2025-001</p>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">العملة الأساسية</label>
                <input
                  type="text"
                  dir="ltr"
                  value={form.currency}
                  onChange={(e) => handleChange("currency", e.target.value)}
                  placeholder="USD"
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-bold text-slate-900 uppercase"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">رمز العملة</label>
                <input
                  type="text"
                  dir="ltr"
                  value={form.currencySymbol}
                  onChange={(e) => handleChange("currencySymbol", e.target.value)}
                  placeholder="$"
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-bold text-slate-900 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">ملاحظات أسفل الفاتورة (افتراضية)</label>
              <textarea
                value={form.invoiceNotes}
                onChange={(e) => handleChange("invoiceNotes", e.target.value)}
                placeholder="شكراً لتعاملكم معنا..."
                rows={2}
                className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium text-slate-900 resize-none leading-relaxed"
              />
            </div>

            <div className="h-px bg-slate-100 my-6" />

            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-slate-900">تفعيل نظام الضريبة</h3>
                <p className="text-sm font-medium text-slate-500 mt-1">تطبيق ضريبة القيمة المضافة أو غيرها على الفواتير</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={form.taxEnabled}
                  onChange={(e) => handleChange("taxEnabled", e.target.checked)}
                />
                <div className="w-14 h-8 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600 shadow-inner"></div>
              </label>
            </div>

            {form.taxEnabled && (
              <div className="w-full sm:w-1/3 mt-4">
                <label className="block text-sm font-bold text-slate-700 mb-2">نسبة الضريبة (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    dir="ltr"
                    min="0"
                    max="100"
                    value={form.taxRate}
                    onChange={(e) => handleChange("taxRate", parseFloat(e.target.value) || 0)}
                    className="w-full h-12 pl-12 pr-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-black font-mono text-slate-900"
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Notifications Card */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="p-6 sm:p-8 border-b border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Bell className="size-6" />
            </div>
            <h2 className="text-xl font-black text-slate-900">التنبيهات</h2>
          </div>
          <div className="p-6 sm:p-8">
            <div className="flex justify-between items-center bg-slate-50 rounded-2xl p-6 border border-slate-200">
              <div>
                <h3 className="font-bold text-slate-900">تنبيه المخزون المنخفض</h3>
                <p className="text-sm font-medium text-slate-500 mt-1">إظهار إشعارات عندما ينخفض مخزون منتج عن الحد الأدنى المحدد له</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={form.lowStockWarning}
                  onChange={(e) => handleChange("lowStockWarning", e.target.checked)}
                />
                <div className="w-14 h-8 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-amber-500 shadow-inner"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Product Categories */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="p-6 sm:p-8 border-b border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Package className="size-6" />
            </div>
            <h2 className="text-xl font-black text-slate-900">فئات المنتجات</h2>
          </div>
          <div className="p-6 sm:p-8">
            <p className="text-sm font-bold text-slate-500 mb-6">
              إدارة فئات وتصنيفات المنتجات المتاحة في المخزون
            </p>
            <div className="flex flex-wrap gap-2 mb-6">
              {form.productCategories.map((cat) => (
                <div key={cat} className="flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-xl border border-slate-200 font-bold text-sm">
                  <span>{cat}</span>
                  <button 
                    onClick={() => handleChange("productCategories", form.productCategories.filter((c) => c !== cat))}
                    className="p-1 rounded-md hover:bg-slate-200 text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 w-full sm:w-2/3">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="اسم الفئة الجديدة..."
                className="flex-1 h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-bold text-slate-900"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newCategory.trim() && !form.productCategories.includes(newCategory.trim())) {
                    handleChange("productCategories", [...form.productCategories, newCategory.trim()]);
                    setNewCategory("");
                  }
                }}
              />
              <button
                onClick={() => {
                  if (newCategory.trim() && !form.productCategories.includes(newCategory.trim())) {
                    handleChange("productCategories", [...form.productCategories, newCategory.trim()]);
                    setNewCategory("");
                  }
                }}
                className="h-12 px-6 rounded-xl bg-indigo-50 text-indigo-700 font-bold border border-indigo-100 hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2 shrink-0"
              >
                <Plus className="size-5" />
                <span>إضافة</span>
              </button>
            </div>
          </div>
        </div>

        {/* HTML Template Editor Card */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="p-6 sm:p-8 border-b border-slate-100 flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-fuchsia-50 flex items-center justify-center text-fuchsia-600 shrink-0">
                <Code2 className="size-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">محرر قالب الفاتورة (HTML)</h2>
                <p className="text-xs font-bold text-slate-500 mt-1">تعديل كود HTML للفاتورة الخاصة بالطباعة أو الـ PDF</p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleResetTemplate}
                className="flex-1 sm:flex-none h-10 px-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 font-bold hover:bg-slate-100 transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <RefreshCw className="size-4" />
                <span>إعادة تعيين</span>
              </button>
              <button
                onClick={handleSaveTemplate}
                className="flex-1 sm:flex-none h-10 px-4 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <Save className="size-4" />
                <span>حفظ القالب</span>
              </button>
            </div>
          </div>
          <div className="p-6 sm:p-8">
            
            <div className="mb-6 border border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
              <button 
                onClick={() => setVariablesOpen(!variablesOpen)}
                className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors"
              >
                <span className="font-bold text-slate-700 text-sm">المتغيرات المتاحة للاستخدام</span>
                <ChevronDown className={`size-5 text-slate-400 transition-transform ${variablesOpen ? 'rotate-180' : ''}`} />
              </button>
              {variablesOpen && (
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 border-t border-slate-200">
                  {Object.entries(TEMPLATE_VARIABLES).map(([key, label]) => (
                    <div key={key} className="flex flex-col gap-1 p-3 bg-white border border-slate-100 rounded-xl">
                      <code className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded w-fit" dir="ltr">{key}</code>
                      <span className="text-xs font-bold text-slate-500">{label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <textarea
              value={invoiceHtml}
              onChange={(e) => setInvoiceHtml(e.target.value)}
              dir="ltr"
              spellCheck={false}
              className="w-full h-[400px] p-6 bg-slate-900 text-emerald-400 font-mono text-sm rounded-2xl border-4 border-slate-800 focus:outline-none focus:border-indigo-500 transition-colors resize-y leading-relaxed mb-6"
            />

            <button
              onClick={async () => {
                try {
                  const { exportInvoicePDF } = await import("@/lib/pdf");
                  const sampleInvoice = {
                    id: "preview", invoiceNumber: "S00023", clientId: "", clientName: "شركة تجريبية",
                    items: [
                      { id: "1", productId: "", productName: "منتج تجريبي 1", description: "", quantity: 10, unitPrice: 50, total: 500 },
                      { id: "2", productId: "", productName: "منتج تجريبي 2", description: "", quantity: 5, unitPrice: 20, total: 100 },
                    ],
                    subtotal: 600, discountType: "fixed" as const, discountValue: 0, discountAmount: 0, taxAmount: 0,
                    total: 600, status: "مدفوعة" as const, notes: "ملاحظة تجريبية", createdAt: "2025-12-30",
                  };
                  await exportInvoicePDF(sampleInvoice, settings, { phone: "0912345678", address: "تجربة" });
                  toast.success("تم تصدير فاتورة تجريبية");
                } catch (e) { toast.error("فشل تصدير الفاتورة: " + (e as Error).message); }
              }}
              className="w-full h-14 rounded-2xl bg-slate-100 text-slate-700 font-bold border border-slate-200 hover:bg-slate-200 hover:text-indigo-700 hover:border-indigo-200 transition-all flex items-center justify-center gap-2"
            >
              <Download className="size-5" />
              <span>تصدير فاتورة تجريبية (PDF)</span>
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-[2.5rem] border-2 border-rose-100 shadow-sm overflow-hidden mt-12">
          <div className="p-6 sm:p-8 bg-rose-50/50 border-b border-rose-100 flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <AlertTriangle className="size-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-rose-700">منطقة الخطر</h2>
                <p className="text-xs font-bold text-rose-500 mt-1">حذف جميع البيانات المحلية والعودة للإعدادات الافتراضية</p>
              </div>
            </div>
            {!resetWarningOpen && (
              <button
                onClick={() => setResetWarningOpen(true)}
                className="w-full sm:w-auto h-12 px-6 rounded-2xl bg-rose-600 text-white font-bold hover:bg-rose-700 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="size-4" />
                <span>إعادة تعيين المصنع</span>
              </button>
            )}
          </div>
          {resetWarningOpen && (
            <div className="p-6 sm:p-8 bg-rose-50/30">
              <div className="bg-rose-100 border border-rose-200 rounded-2xl p-6 mb-6 text-center sm:text-right">
                <h3 className="font-black text-rose-800 text-lg mb-2">هل أنت متأكد تماماً؟</h3>
                <p className="text-rose-700 font-bold text-sm">
                  سيتم مسح جميع الفواتير، العملاء، المنتجات، والإعدادات المحفوظة على هذا الجهاز نهائياً. لا يمكن التراجع عن هذا الإجراء أبداً.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-end">
                <button
                  onClick={() => setResetWarningOpen(false)}
                  className="h-12 px-8 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors"
                >
                  إلغاء التراجع
                </button>
                <button
                  onClick={handleReset}
                  className="h-12 px-8 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 shadow-[0_8px_20px_-6px_rgba(225,29,72,0.4)] transition-all"
                >
                  نعم، احذف جميع البيانات
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Save Button (Mobile) */}
        {hasChanges && (
          <div className="sm:hidden fixed bottom-6 left-4 right-4 z-50">
            <button
              onClick={handleSave}
              className="w-full h-14 rounded-2xl bg-indigo-600 text-white font-black text-lg shadow-[0_10px_40px_-10px_rgba(79,70,229,0.8)] active:scale-95 transition-transform flex items-center justify-center gap-2"
            >
              <Save className="size-5" />
              <span>حفظ جميع التغييرات</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
