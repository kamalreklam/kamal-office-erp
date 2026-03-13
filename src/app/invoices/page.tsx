"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, Plus, FileText, Eye, Trash2, DollarSign } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import { formatCurrency, getStatusColor, type Invoice } from "@/lib/data";
import { toast } from "sonner";

export default function InvoicesPage() {
  const { invoices, deleteInvoice } = useStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("الكل");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null);

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      const matchSearch = search === "" || inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) || inv.clientName.includes(search);
      const matchStatus = statusFilter === "الكل" || inv.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [invoices, search, statusFilter]);

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

  return (
    <AppShell>
      <div className="space-y-6 page-enter">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-fade-in-up">
          <div>
            <h1 className="text-2xl font-bold text-foreground">الفواتير</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {invoices.length} فاتورة · إجمالي الإيرادات: {formatCurrency(totalRevenue)}
            </p>
          </div>
          <Link href="/invoices/new">
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              فاتورة جديدة
            </Button>
          </Link>
        </div>

        <div className="relative">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="بحث برقم الفاتورة أو اسم العميل..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
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
                  isActive ? "bg-primary text-primary-foreground shadow-sm" : "border border-border bg-white text-muted-foreground hover:bg-accent"
                }`}
              >
                {s}
                <span className={`mr-1 rounded-full px-1.5 py-0.5 text-[11px] ${isActive ? "bg-white/20" : "bg-muted text-muted-foreground"}`}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Desktop */}
        <Card className="hidden border shadow-sm md:block">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
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
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-16 text-center text-muted-foreground">
                    <FileText className="mx-auto mb-3 h-10 w-10 opacity-30" />
                    <p>لا توجد فواتير مطابقة</p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((inv) => (
                  <TableRow key={inv.id} className="transition-colors hover:bg-accent/30">
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
                        <Link href={`/invoices/${inv.id}`}>
                          <button className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                            <Eye className="h-4 w-4" />
                          </button>
                        </Link>
                        <button onClick={() => confirmDelete(inv)} className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600">
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
        <div className="space-y-3 md:hidden stagger-list">
          {filtered.length === 0 ? (
            <Card className="border shadow-sm">
              <CardContent className="flex flex-col items-center py-16 text-muted-foreground">
                <FileText className="mb-3 h-10 w-10 opacity-30" />
                لا توجد فواتير مطابقة
              </CardContent>
            </Card>
          ) : (
            filtered.map((inv) => (
              <Link key={inv.id} href={`/invoices/${inv.id}`}>
                <Card className="border shadow-sm hover-lift">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-bold text-foreground">{inv.invoiceNumber}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{inv.clientName}</p>
                      </div>
                      <Badge variant="outline" className={`text-[11px] ${getStatusColor(inv.status)}`}>{inv.status}</Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                      <span className="text-xs text-muted-foreground">{inv.createdAt} · {inv.items.length} عناصر</span>
                      <span className="font-bold text-foreground">{formatCurrency(inv.total)}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader><DialogTitle className="text-red-600">حذف الفاتورة</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">هل أنت متأكد من حذف الفاتورة &quot;{deletingInvoice?.invoiceNumber}&quot;؟</p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>إلغاء</Button>
            <Button variant="destructive" onClick={handleDelete}>حذف</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
