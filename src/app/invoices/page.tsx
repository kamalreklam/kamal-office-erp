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
import { Search, Plus, FileText, Eye, Trash2, DollarSign, CalendarDays, X, ArrowUpDown, ChevronLeft, ChevronRight, Download, MessageCircle } from "lucide-react";
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
  const { invoices, deleteInvoice, settings, connectionStatus } = useStore();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [statusFilter, setStatusFilter] = useState("الكل");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("date-desc");
  const [page, setPage] = useState(1);
  const perPage = 10;
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);

  const filtered = useMemo(() => {
    const list = invoices.filter((inv) => {
      const matchSearch = debouncedSearch === "" || inv.invoiceNumber.toLowerCase().includes(debouncedSearch.toLowerCase()) || inv.clientName.includes(debouncedSearch);
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

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  // Reset page when filters change
  const filterKey = `${search}|${statusFilter}|${dateFrom}|${dateTo}|${sortBy}`;
  useEffect(() => { setPage(1); }, [filterKey]);

  const statuses = ["الكل", "مدفوعة", "غير مدفوعة", "مسودة", "ملغاة"];

  const totalRevenue = invoices.filter((i) => i.status === "مدفوعة").reduce((s, i) => s + i.total, 0);

  function confirmDelete(inv: Invoice) {
    setDeletingInvoice(inv);
    setDeleteDialogOpen(true);
  }

  function handleDelete() {
    if (!deletingInvoice) return;
    deleteInvoice(deletingInvoice.id);
    toast.success("تم حذف الفاتورة");
    setDeleteDialogOpen(false);
  }

  function handleExport() {
    exportCSV("invoices", ["رقم الفاتورة", "العميل", "التاريخ", "المنتجات", "الإجمالي", "الحالة"],
      filtered.map((inv) => [inv.invoiceNumber, inv.clientName, inv.createdAt, String(inv.items.length), String(inv.total), inv.status])
    );
    toast.success("تم تصدير الفواتير");
  }

  function shareWhatsApp() {
    const paid = filtered.filter(inv => inv.status === "مدفوعة");
    const unpaid = filtered.filter(inv => inv.status === "غير مدفوعة");
    const draft = filtered.filter(inv => inv.status === "مسودة");
    const lines = [
      `🧾 *تقرير الفواتير - ${settings.businessName}*`,
      `📅 التاريخ: ${new Date().toLocaleDateString("ar-SY")}`,
      "",
      `📊 *الملخص:*`,
      `  • عدد الفواتير: ${filtered.length}`,
      `  • إجمالي الإيرادات: ${settings.currencySymbol}${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      `  • ✅ مدفوعة: ${paid.length} (${settings.currencySymbol}${paid.reduce((s, i) => s + i.total, 0).toLocaleString("en-US", { minimumFractionDigits: 2 })})`,
      `  • ⏳ غير مدفوعة: ${unpaid.length} (${settings.currencySymbol}${unpaid.reduce((s, i) => s + i.total, 0).toLocaleString("en-US", { minimumFractionDigits: 2 })})`,
    ];
    if (draft.length > 0) {
      lines.push(`  • 📝 مسودة: ${draft.length} (${settings.currencySymbol}${draft.reduce((s, i) => s + i.total, 0).toLocaleString("en-US", { minimumFractionDigits: 2 })})`);
    }
    lines.push("", `📋 *آخر 10 فواتير:*`);
    filtered.slice(0, 10).forEach((inv, i) => {
      const emoji = inv.status === "مدفوعة" ? "✅" : inv.status === "غير مدفوعة" ? "🔴" : "🔶";
      lines.push(`${i + 1}. ${inv.invoiceNumber} | ${inv.clientName} | ${emoji} ${settings.currencySymbol}${inv.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}`);
    });
    if (filtered.length > 10) lines.push(`... و ${filtered.length - 10} فاتورة أخرى`);
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`, "_blank");
  }

  return (
    <ResponsiveShell>
      <div className="space-y-8">
        <div className="animate-fade-in-up text-center">
          <h1 className="text-2xl font-extrabold text-foreground sm:text-3xl">الفواتير</h1>
          <p className="mt-1.5 text-sm text-muted-foreground sm:mt-2 sm:text-base">
            {invoices.length} فاتورة · إجمالي الإيرادات: {formatCurrency(totalRevenue)}
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">تصدير CSV</span>
            </Button>
            <DateRangeExportButton
              label="تصدير تقرير PDF"
              onExport={async (range: DateRange) => {
                try {
                  const { exportSalesReportPDF } = await import("@/lib/pdf");
                  await exportSalesReportPDF(invoices, range, settings);
                  toast.success("تم تصدير تقرير الفواتير");
                } catch {
                  toast.error("فشل تصدير التقرير");
                }
              }}
            />
            <Button variant="outline" size="sm" className="gap-1.5" onClick={shareWhatsApp}>
              <MessageCircle className="h-5 w-5 text-green-600" />
              <span className="hidden sm:inline">مشاركة واتساب</span>
            </Button>
            <Link href="/invoices/new">
              <Button size="sm" className="gap-1.5">
                <Plus className="h-5 w-5" />
                فاتورة جديدة
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="بحث برقم الفاتورة أو اسم العميل..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
          </div>
          <Select value={sortBy} onValueChange={(v) => v && setSortBy(v)}>
            <SelectTrigger className="w-[160px] gap-1.5">
              <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">الأحدث أولاً</SelectItem>
              <SelectItem value="date-asc">الأقدم أولاً</SelectItem>
              <SelectItem value="amount-desc">المبلغ: الأعلى</SelectItem>
              <SelectItem value="amount-asc">المبلغ: الأقل</SelectItem>
              <SelectItem value="client">العميل (أ-ي)</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 w-[140px] text-sm" />
            <span className="text-sm text-muted-foreground">إلى</span>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 w-[140px] text-sm" />
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(""); setDateTo(""); }} className="rounded-lg p-1.5 text-muted-foreground hover:bg-[var(--surface-2)]">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {statuses.map((s) => {
            const isActive = statusFilter === s;
            const count = s === "الكل" ? invoices.length : invoices.filter((i) => i.status === s).length;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all ${
                  isActive ? "bg-primary text-primary-foreground shadow-sm" : "border border-border bg-[var(--surface-1)] text-muted-foreground hover:bg-[var(--surface-2)]"
                }`}
              >
                {s}
                <span className={`mr-1 rounded-full px-1.5 py-0.5 text-xs ${isActive ? "bg-[var(--surface-1)]/20" : "bg-muted text-muted-foreground"}`}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Desktop */}
        <Card className="hidden border border-[var(--glass-border)] shadow-sm md:block">
          <Table>
            <TableHeader>
              <TableRow className="bg-[var(--surface-2)]">
                <TableHead className="text-right font-bold">رقم الفاتورة</TableHead>
                <TableHead className="text-right font-bold">العميل</TableHead>
                <TableHead className="text-right font-bold">التاريخ</TableHead>
                <TableHead className="text-right font-bold">المنتجات</TableHead>
                <TableHead className="text-right font-bold">الإجمالي</TableHead>
                <TableHead className="text-right font-bold">الحالة</TableHead>
                <TableHead className="text-right font-bold">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-16 text-center text-muted-foreground">
                    <FileText className="mx-auto mb-3 h-10 w-10 opacity-30" />
                    <p>لا توجد فواتير مطابقة</p>
                    <Link href="/invoices/new" className="mt-4 inline-block">
                      <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" />فاتورة جديدة</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ) : (
                paged.map((inv) => (
                  <TableRow key={inv.id} className="transition-colors hover:bg-[var(--surface-2)]/30">
                    <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                    <TableCell>{inv.clientName}</TableCell>
                    <TableCell className="text-muted-foreground">{inv.createdAt}</TableCell>
                    <TableCell>{inv.items.length} عناصر</TableCell>
                    <TableCell className="font-bold">{formatCurrency(inv.total)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${getStatusColor(inv.status)}`}>{inv.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <button onClick={() => setPreviewInvoice(inv)} className="rounded-xl p-2.5 text-muted-foreground transition-colors hover:bg-[var(--surface-2)] hover:text-foreground" title="معاينة سريعة">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button onClick={() => confirmDelete(inv)} className="rounded-xl p-2.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Mobile */}
        <div className="flex flex-col gap-4 md:hidden stagger-list">
          {paged.length === 0 ? (
            <Card className="border border-[var(--glass-border)] shadow-sm">
              <CardContent className="flex flex-col items-center py-16 text-muted-foreground">
                <FileText className="mb-3 h-10 w-10 opacity-30" />
                لا توجد فواتير مطابقة
                <Link href="/invoices/new" className="mt-4 inline-block">
                  <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" />فاتورة جديدة</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            paged.map((inv) => (
              <Link key={inv.id} href={`/invoices/${inv.id}`} className="block">
                <Card className="border border-[var(--glass-border)] shadow-sm hover-lift">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-base font-bold text-foreground">{inv.invoiceNumber}</p>
                        <p className="mt-1.5 text-sm text-muted-foreground">{inv.clientName}</p>
                      </div>
                      <Badge variant="outline" className={`text-xs ${getStatusColor(inv.status)}`}>{inv.status}</Badge>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-[var(--glass-border)] pt-4">
                      <span className="text-sm text-muted-foreground">{inv.createdAt} · {inv.items.length} عناصر</span>
                      <span className="text-base font-bold text-foreground">{formatCurrency(inv.total)}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--glass-border)] text-muted-foreground transition-colors hover:bg-[var(--surface-2)] disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <span className="text-sm text-muted-foreground">
              صفحة {page} من {totalPages} ({filtered.length} نتيجة)
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--glass-border)] text-muted-foreground transition-colors hover:bg-[var(--surface-2)] disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

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

      {/* Invoice Preview Sidesheet */}
      <Sidesheet
        open={!!previewInvoice}
        onClose={() => setPreviewInvoice(null)}
        title={previewInvoice?.invoiceNumber || ""}
      >
        {previewInvoice && (
          <div className="space-y-5" dir="rtl">
            {/* Status + Client */}
            <div className="flex items-center justify-between">
              <Badge variant="outline" className={`text-sm ${getStatusColor(previewInvoice.status)}`}>
                {previewInvoice.status}
              </Badge>
              <span className="text-sm" style={{ color: "var(--text-muted)" }}>{previewInvoice.createdAt}</span>
            </div>

            <div className="rounded-xl p-4" style={{ background: "var(--surface-2)" }}>
              <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>العميل</p>
              <p className="text-base font-bold mt-0.5" style={{ color: "var(--text-primary)" }}>{previewInvoice.clientName}</p>
            </div>

            {/* Items */}
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>المنتجات ({previewInvoice.items.length})</p>
              <div className="space-y-2">
                {previewInvoice.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-lg p-3 text-sm"
                    style={{ border: "1px solid var(--border-subtle)" }}>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate" style={{ color: "var(--text-primary)" }}>{item.productName}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {item.quantity} × {formatCurrency(item.unitPrice)}
                      </p>
                    </div>
                    <p className="font-bold shrink-0" style={{ color: "var(--text-primary)" }}>
                      {formatCurrency(item.quantity * item.unitPrice)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="rounded-xl p-4 space-y-2" style={{ background: "var(--surface-2)" }}>
              <div className="flex justify-between text-sm">
                <span style={{ color: "var(--text-muted)" }}>المجموع الفرعي</span>
                <span style={{ color: "var(--text-primary)" }}>{formatCurrency(previewInvoice.subtotal)}</span>
              </div>
              {previewInvoice.discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span style={{ color: "var(--text-muted)" }}>الخصم</span>
                  <span style={{ color: "var(--red-500)" }}>-{formatCurrency(previewInvoice.discountAmount)}</span>
                </div>
              )}
              {previewInvoice.taxAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span style={{ color: "var(--text-muted)" }}>الضريبة</span>
                  <span style={{ color: "var(--text-primary)" }}>{formatCurrency(previewInvoice.taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold pt-2" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                <span style={{ color: "var(--text-primary)" }}>الإجمالي</span>
                <span style={{ color: "var(--primary)" }}>{formatCurrency(previewInvoice.total)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Link href={`/invoices/${previewInvoice.id}`} className="flex-1">
                <Button className="w-full gap-1.5" size="sm">
                  <Eye className="h-4 w-4" />
                  عرض التفاصيل الكاملة
                </Button>
              </Link>
            </div>
          </div>
        )}
      </Sidesheet>
    </ResponsiveShell>
  );
}
