"use client";

import { useState, useMemo, useEffect } from "react";
import { useDebounce } from "@/lib/use-debounce";
import Link from "next/link";
import { ResponsiveShell } from "@/components/responsive-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, Plus, FileText, Eye, Trash2, DollarSign, CalendarDays, X, ArrowUpDown, Download, MessageCircle, RotateCcw, CheckCircle2, Clock, Pencil, Share2, ImageIcon } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import { formatCurrency, getStatusColor, type Invoice } from "@/lib/data";
import { toast } from "sonner";
import { exportCSV } from "@/lib/export";
import { DateRangeExportButton, type DateRange } from "@/components/date-range-picker";
import { TablePageSkeleton } from "@/components/skeletons";
import { Sidesheet } from "@/components/sidesheet";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { MobileInvoices } from "@/components/mobile/mobile-invoices";
import { MobileShell } from "@/components/mobile/mobile-shell";
import { shareAsImage, formatInvoiceWhatsAppText, shareViaWhatsApp } from "@/lib/share";
import { PaymentLedger } from "@/components/payment-ledger";

export default function InvoicesPage() {
  const isMobile = useIsMobile();
  const { connectionStatus } = useStore();

  if (connectionStatus === "loading") {
    return <ResponsiveShell><TablePageSkeleton /></ResponsiveShell>;
  }

  if (isMobile) {
    return <MobileShell><MobileInvoices /></MobileShell>;
  }

  return <DesktopInvoices />;
}

function DesktopInvoices() {
  const { invoices, deleteInvoice, updateInvoiceStatus, settings, clients, products } = useStore();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [statusFilter, setStatusFilter] = useState("الكل");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("date-desc");

  // Selected invoice for dynamic side-pane preview
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const filtered = useMemo(() => {
    const list = invoices.filter((inv) => {
      const q = debouncedSearch.toLowerCase();
      const matchSearch = debouncedSearch === "" || inv.invoiceNumber.toLowerCase().includes(q) || inv.clientName.toLowerCase().includes(q);
      const matchStatus = statusFilter === "الكل" || inv.status === statusFilter;
      const matchDateFrom = !dateFrom || inv.createdAt >= dateFrom;
      const matchDateTo = !dateTo || inv.createdAt <= dateTo;
      return matchSearch && matchStatus && matchDateFrom && matchDateTo;
    });
    switch (sortBy) {
      case "date-asc": return [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      case "date-desc": return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      case "amount-asc": return [...list].sort((a, b) => a.total - b.total);
      case "amount-desc": return [...list].sort((a, b) => b.total - a.total);
      case "client": return [...list].sort((a, b) => a.clientName.localeCompare(b.clientName, "ar"));
      default: return list;
    }
  }, [invoices, debouncedSearch, statusFilter, dateFrom, dateTo, sortBy]);

  const statuses = ["الكل", "مدفوعة", "مدفوعة جزئياً", "غير مدفوعة", "مسودة", "ملغاة"];

  const stats = useMemo(() => {
    const paid = invoices.filter(i => i.status === "مدفوعة").reduce((s, i) => s + i.total, 0);
    const unpaid = invoices.filter(i => i.status === "غير مدفوعة").reduce((s, i) => s + i.total, 0);
    const draft = invoices.filter(i => i.status === "مسودة").reduce((s, i) => s + i.total, 0);
    return { paid, unpaid, draft };
  }, [invoices]);

  function confirmDelete(inv: Invoice, e: React.MouseEvent) {
    e.stopPropagation();
    setDeletingInvoice(inv);
    setDeleteDialogOpen(true);
  }

  function handleDelete() {
    if (!deletingInvoice) return;
    deleteInvoice(deletingInvoice.id);
    toast.success("تم حذف الفاتورة");
    setDeleteDialogOpen(false);
    if (selectedInvoice?.id === deletingInvoice.id) {
      setSelectedInvoice(null);
    }
  }

  async function handleDownloadPDF(inv: Invoice, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      const { exportInvoicePDF } = await import("@/lib/pdf");
      const client = clients.find(c => c.id === inv.clientId);
      await exportInvoicePDF(inv, settings, { phone: client?.phone, address: client?.address });
      toast.success("تم تحميل الفاتورة");
    } catch {
      toast.error("فشل تحميل الفاتورة");
    }
  }

  function handleStatusChange(inv: Invoice, newStatus: "مدفوعة" | "غير مدفوعة" | "ملغاة", e: React.MouseEvent) {
    e.stopPropagation();
    updateInvoiceStatus(inv.id, newStatus);
    toast.success(`تم تحديث الحالة إلى: ${newStatus}`);
    if (selectedInvoice?.id === inv.id) {
      setSelectedInvoice(prev => prev ? { ...prev, status: newStatus } : null);
    }
  }

  return (
    <ResponsiveShell>
      <div className="space-y-6">
        {/* Header Hero Card */}
        <div className="relative overflow-hidden rounded-[28px] border border-[var(--glass-border)] bg-white p-8 shadow-sm">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-700 border border-cyan-100">
                🧾 إدارة الفواتير والمبيعات
              </span>
              <h1 className="mt-3 text-3xl font-black text-[var(--text-primary)]">سجل الفواتير</h1>
              <p className="mt-1.5 text-sm text-[var(--text-muted)] max-w-xl">
                إدارة وإصدار فواتير المبيعات لـ **{settings.businessName}**، تتبع الدفعات المستحقة، وتحليل هامش الأرباح.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2 rounded-xl h-11 px-4 text-xs font-bold" onClick={() => {
                exportCSV("invoices", ["رقم الفاتورة", "العميل", "التاريخ", "المنتجات", "الإجمالي", "الحالة"],
                  filtered.map((inv) => [inv.invoiceNumber, inv.clientName, inv.createdAt, String(inv.items.length), String(inv.total), inv.status])
                );
                toast.success("تم تصدير الفواتير");
              }}>
                <Download className="h-4 w-4" /> تصدير CSV
              </Button>
              <Link href="/invoices/new">
                <Button className="gap-2 rounded-xl h-11 px-5 text-xs font-bold">
                  <Plus className="h-4 w-4" /> إنشاء فاتورة جديدة
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Invoice Summary Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Paid */}
          <div className="m3-card relative overflow-hidden bg-white p-6 rounded-2xl border border-[var(--glass-border)] shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[140px]">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-[var(--text-muted)]">الفواتير المحصلة</span>
                <h3 className="text-2xl font-black text-emerald-600 mt-1 font-mono">
                  {formatCurrency(stats.paid)}
                </h3>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-50 flex justify-between items-center text-xs text-[var(--text-muted)]">
              <span>الفواتير المسددة بالكامل</span>
              <span className="font-bold text-emerald-600">{invoices.filter(i => i.status === "مدفوعة").length} فاتورة</span>
            </div>
          </div>

          {/* Card 2: Unpaid */}
          <div className="m3-card relative overflow-hidden bg-white p-6 rounded-2xl border border-[var(--glass-border)] shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[140px]">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-[var(--text-muted)]">المبالغ المستحقة</span>
                <h3 className="text-2xl font-black text-amber-600 mt-1 font-mono">
                  {formatCurrency(stats.unpaid)}
                </h3>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100 shadow-sm">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-50 flex justify-between items-center text-xs text-[var(--text-muted)]">
              <span>فواتير تنتظر التحصيل</span>
              <span className="font-bold text-amber-600">{invoices.filter(i => i.status === "غير مدفوعة").length} فاتورة</span>
            </div>
          </div>

          {/* Card 3: Drafts */}
          <div className="m3-card relative overflow-hidden bg-white p-6 rounded-2xl border border-[var(--glass-border)] shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[140px]">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-[var(--text-muted)]">المسودات المؤقتة</span>
                <h3 className="text-2xl font-black text-gray-600 mt-1 font-mono">
                  {formatCurrency(stats.draft)}
                </h3>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-50 text-gray-500 border border-gray-200 shadow-sm">
                <FileText className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-50 flex justify-between items-center text-xs text-[var(--text-muted)]">
              <span>مسودات غير مؤكدة</span>
              <span className="font-bold text-gray-600">{invoices.filter(i => i.status === "مسودة").length} مسودة</span>
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-full" style={{ scrollbarWidth: "none" }}>
            {statuses.map((s) => {
              const isActive = statusFilter === s;
              const count = s === "الكل" ? invoices.length : invoices.filter((i) => i.status === s).length;
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-xl px-4 py-2 text-xs font-bold border transition-all ${isActive ? "bg-primary text-white border-primary" : "bg-white text-[var(--text-secondary)] border-[var(--glass-border)] hover:bg-gray-50"}`}
                >
                  {s} <span className={`text-[10px] px-1.5 py-0.5 rounded-full mr-1 ${isActive ? "bg-white/20 text-white" : "bg-gray-100 text-[var(--text-muted)]"}`}>{count}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2.5 w-full md:w-auto shrink-0 justify-end">
            <div className="relative w-full sm:w-48">
              <Search className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <Input placeholder="بحث برقم الفاتورة أو العميل..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9 rounded-xl h-10 border-[var(--glass-border)] text-xs" />
            </div>
            <Select value={sortBy} onValueChange={(v) => v && setSortBy(v)}>
              <SelectTrigger className="w-[120px] rounded-xl h-10 border-[var(--glass-border)] text-xs">
                <SelectValue placeholder="ترتيب" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">الأحدث</SelectItem>
                <SelectItem value="date-asc">الأقدم</SelectItem>
                <SelectItem value="amount-desc">الأعلى قيمة</SelectItem>
                <SelectItem value="amount-asc">الأقل قيمة</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Invoices Split View Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Side: Invoice List */}
          <div className={`space-y-3 ${selectedInvoice ? "lg:col-span-7" : "lg:col-span-12"} transition-all duration-300`}>
            {filtered.length === 0 ? (
              <div className="m3-card text-center py-16 bg-white border border-[var(--glass-border)]">
                <FileText className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                <p className="text-sm text-[var(--text-muted)]">لا توجد فواتير تطابق خيارات البحث.</p>
              </div>
            ) : (
              filtered.map((inv) => {
                const isActive = selectedInvoice?.id === inv.id;
                const statusColors = inv.status === "مدفوعة"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                  : inv.status === "غير مدفوعة"
                  ? "bg-red-50 text-red-700 border-red-100"
                  : inv.status === "مسودة"
                  ? "bg-amber-50 text-amber-700 border-amber-100"
                  : "bg-gray-50 text-gray-600 border-gray-100";

                return (
                  <div
                    key={inv.id}
                    onClick={() => setSelectedInvoice(inv)}
                    className={`rounded-2xl border p-4 transition-all duration-200 cursor-pointer flex items-center justify-between gap-4 ${isActive ? "border-primary bg-indigo-50/10 shadow-sm" : "border-[var(--glass-border)] bg-white hover:bg-gray-50/40"}`}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-50 border border-gray-100 text-[var(--text-secondary)]">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-[var(--text-primary)] truncate">{inv.invoiceNumber}</h4>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColors}`}>{inv.status}</span>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] mt-1 flex gap-2">
                          <span>👤 {inv.clientName}</span>
                          <span>📅 {inv.createdAt}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-left hidden sm:block">
                        <span className="text-sm font-black text-[var(--text-primary)] block">{formatCurrency(inv.total)}</span>
                        <span className="text-[10px] text-[var(--text-muted)]">{inv.items.length} عناصر</span>
                      </div>
                      <div className="flex gap-1">
                        <Link href={`/invoices/new?edit=${inv.id}`} onClick={(e) => e.stopPropagation()}>
                          <button className="h-8 w-8 rounded-lg bg-gray-50 hover:bg-gray-100 text-indigo-600 flex items-center justify-center transition-colors">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </Link>
                        <button onClick={(e) => handleDownloadPDF(inv, e)} className="h-8 w-8 rounded-lg bg-gray-50 hover:bg-gray-100 text-[var(--text-secondary)] flex items-center justify-center transition-colors">
                          <Download className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={(e) => {
                          e.stopPropagation();
                          shareViaWhatsApp(formatInvoiceWhatsAppText(inv, settings));
                        }} className="h-8 w-8 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 flex items-center justify-center transition-colors">
                          <MessageCircle className="h-3.5 w-3.5" />
                        </button>
                        {inv.status !== "مدفوعة" && inv.status !== "ملغاة" && (
                          <button onClick={(e) => handleStatusChange(inv, "مدفوعة", e)} className="h-8 w-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center transition-colors">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button onClick={(e) => confirmDelete(inv, e)} className="h-8 w-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Side: Invoice Detail Preview Rail */}
          {selectedInvoice && (
            <div id="invoice-preview-card" className="lg:col-span-5 border border-[var(--glass-border)] bg-white rounded-[24px] p-6 shadow-sm space-y-6 animate-fade-in relative">
              <div className="flex justify-between items-start border-b border-gray-50 pb-4">
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">{selectedInvoice.invoiceNumber}</h3>
                  <span className="text-xs text-[var(--text-muted)]">تاريخ الفاتورة: {selectedInvoice.createdAt}</span>
                </div>
                <button onClick={() => setSelectedInvoice(null)} className="h-8 w-8 rounded-full bg-gray-50 text-[var(--text-muted)] hover:bg-gray-100 flex items-center justify-center transition-colors no-capture">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Client and Status Card */}
              <div className="rounded-xl p-4 bg-gray-50/50 border border-gray-100 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--text-muted)]">حالة الدفع:</span>
                  <span className={`font-bold px-2 py-0.5 rounded-full border ${selectedInvoice.status === "مدفوعة" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-red-50 text-red-700 border-red-100"}`}>
                    {selectedInvoice.status}
                  </span>
                </div>
                <div className="border-t border-gray-100 pt-3">
                  <span className="text-[11px] text-[var(--text-muted)] block">العميل المستهدف:</span>
                  <Link href={`/clients`} className="text-sm font-bold text-primary hover:underline mt-0.5 block">{selectedInvoice.clientName}</Link>
                </div>
              </div>

              {/* Items Summary Table */}
              <div>
                <h4 className="text-xs font-bold text-[var(--text-muted)] mb-3 border-b border-gray-50 pb-2">عناصر الفاتورة</h4>
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {selectedInvoice.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl text-xs bg-white">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-[var(--text-primary)] truncate">{item.productName}</p>
                        <p className="text-[10px] text-[var(--text-muted)] mt-1">
                          {item.quantity} × {formatCurrency(item.unitPrice)}
                        </p>
                      </div>
                      <span className="font-bold text-[var(--text-primary)] font-mono">{formatCurrency(item.quantity * item.unitPrice)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals Summary */}
              <div className="bg-gray-50/50 border border-gray-100 rounded-xl p-4 space-y-2.5">
                <div className="flex justify-between text-xs text-[var(--text-muted)]">
                  <span>المجموع الفرعي:</span>
                  <span className="font-semibold">{formatCurrency(selectedInvoice.subtotal)}</span>
                </div>
                {selectedInvoice.discountAmount > 0 && (
                  <div className="flex justify-between text-xs text-red-500">
                    <span>الخصم:</span>
                    <span className="font-semibold">-{formatCurrency(selectedInvoice.discountAmount)}</span>
                  </div>
                )}
                {selectedInvoice.taxAmount > 0 && (
                  <div className="flex justify-between text-xs text-[var(--text-muted)]">
                    <span>الضريبة:</span>
                    <span className="font-semibold">+{formatCurrency(selectedInvoice.taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold pt-2.5 border-t border-gray-100 text-[var(--text-primary)]">
                  <span>الإجمالي النهائي:</span>
                  <span className="text-base text-primary font-black">{formatCurrency(selectedInvoice.total)}</span>
                </div>
              </div>

              {/* Cost & Profit Margin Analysis (New premium business feature) */}
              {(() => {
                const totalCost = selectedInvoice.items.reduce((sum, item) => {
                  const basePrice = products.find(p => p.id === item.productId)?.price ?? item.unitPrice;
                  const itemCost = item.isTemporary ? (item.costPrice ?? 0) : basePrice * 0.65;
                  return sum + (itemCost * item.quantity);
                }, 0);
                const totalProfit = selectedInvoice.total - totalCost;
                const marginPercentage = selectedInvoice.total > 0 ? (totalProfit / selectedInvoice.total) * 100 : 0;

                return (
                  <div className="bg-indigo-50/20 border border-indigo-100/50 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-indigo-800 font-bold">التكلفة الإجمالية المقدرة:</span>
                      <span className="font-mono text-indigo-900">{formatCurrency(totalCost)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-indigo-800 font-bold">صافي الأرباح المتوقعة:</span>
                      <span className="font-mono text-emerald-600 font-bold">+{formatCurrency(totalProfit)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs border-t border-indigo-100/30 pt-2">
                      <span className="text-indigo-800 font-bold">هامش الربح:</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[10px] font-mono">
                        {marginPercentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Payment Ledger */}
              <div className="border-t border-gray-50 pt-4">
                <h4 className="text-xs font-bold text-[var(--text-muted)] mb-3">سجل الدفعات</h4>
                <PaymentLedger
                  invoiceId={selectedInvoice.id}
                  invoiceTotal={selectedInvoice.total}
                  invoiceNumber={selectedInvoice.invoiceNumber}
                />
              </div>

              {/* Preview Actions */}
              <div className="flex flex-col gap-2 pt-2 border-t border-gray-50 no-capture">
                <div className="flex gap-2">
                  <Link href={`/invoices/${selectedInvoice.id}`} className="flex-1">
                    <Button className="w-full rounded-xl h-10 text-xs font-bold keep-capture">
                      <Eye className="h-4 w-4 ml-1" /> تفاصيل الفاتورة
                    </Button>
                  </Link>
                  <Link href={`/invoices/new?edit=${selectedInvoice.id}`} className="flex-1">
                    <Button variant="outline" className="w-full rounded-xl h-10 text-xs font-bold text-indigo-700 border-indigo-200 bg-indigo-50/10 hover:bg-indigo-50/20 keep-capture">
                      <Pencil className="h-4 w-4 ml-1" /> تعديل الفاتورة
                    </Button>
                  </Link>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 rounded-xl h-10 text-xs font-bold keep-capture" onClick={(e) => handleDownloadPDF(selectedInvoice, e)}>
                    <Download className="h-4 w-4 ml-1" /> تحميل PDF
                  </Button>
                  <Button variant="outline" className="flex-1 rounded-xl h-10 text-xs font-bold text-green-700 border-green-200 hover:bg-green-50/20 keep-capture" onClick={() => shareViaWhatsApp(formatInvoiceWhatsAppText(selectedInvoice, settings))}>
                    <MessageCircle className="h-4 w-4 ml-1" /> مشاركة واتساب
                  </Button>
                </div>
                <Button variant="outline" className="w-full rounded-xl h-10 text-xs font-bold text-cyan-700 border-cyan-200 hover:bg-cyan-50/20 keep-capture" onClick={() => {
                  toast.promise(shareAsImage('invoice-preview-card', `فاتورة_${selectedInvoice.invoiceNumber}`), {
                    loading: 'جاري توليد الصورة...',
                    success: 'تم تصدير الصورة بنجاح',
                    error: 'فشل تصدير الصورة'
                  });
                }}>
                  <ImageIcon className="h-4 w-4 ml-1" /> تصدير كصورة PNG
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader><DialogTitle className="text-red-600">حذف الفاتورة</DialogTitle></DialogHeader>
          <p className="text-base text-muted-foreground">هل أنت متأكد من حذف الفاتورة &quot;{deletingInvoice?.invoiceNumber}&quot;؟</p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>إلغاء</Button>
            <Button variant="destructive" onClick={handleDelete}>حذف</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ResponsiveShell>
  );
}
