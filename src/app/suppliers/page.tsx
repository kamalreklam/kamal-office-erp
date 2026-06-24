"use client";

import React, { useState, useMemo } from "react";
import { ResponsiveShell } from "@/components/responsive-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Search,
  Truck,
  Plus,
  Pencil,
  Trash2,
  Phone,
  MapPin,
  DollarSign,
  Download,
  X,
  AlertTriangle,
} from "lucide-react";
import { useStore } from "@/lib/store";
import type { Supplier } from "@/lib/store";
import { formatCurrency } from "@/lib/data";
import { toast } from "sonner";
import { exportCSV } from "@/lib/export";
import { useDebounce } from "@/lib/use-debounce";
import { CardGridSkeleton } from "@/components/skeletons";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { AppShell } from "@/components/app-shell";

// ── Mobile placeholder ─────────────────────────────────────────────────────
function MobileSuppliers() {
  return <DesktopSuppliers />;
}

// ── Avatar colors (same palette as clients) ────────────────────────────────
const avatarColors = [
  "bg-sky-100 text-sky-700",
  "bg-emerald-100 text-emerald-700",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-teal-100 text-teal-700",
  "bg-indigo-100 text-indigo-700",
  "bg-orange-100 text-orange-700",
];

function getAvatarColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

// ── Blank form ─────────────────────────────────────────────────────────────
const blankForm = { name: "", phone: "", address: "", notes: "" };

// ── Page entry ─────────────────────────────────────────────────────────────
export default function SuppliersPage() {
  const isMobile = useIsMobile();
  const { connectionStatus } = useStore();

  if (connectionStatus === "loading") {
    return <ResponsiveShell><CardGridSkeleton /></ResponsiveShell>;
  }

  if (isMobile) {
    return <AppShell><MobileSuppliers /></AppShell>;
  }

  return <DesktopSuppliers />;
}

// ── Desktop component ──────────────────────────────────────────────────────
function DesktopSuppliers() {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier } = useStore();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);

  // Add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(blankForm);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editForm, setEditForm] = useState(blankForm);

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);

  // Detail panel
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.phone.includes(q) ||
        s.address.toLowerCase().includes(q)
    );
  }, [suppliers, debouncedSearch]);

  // ── Add ────────────────────────────────────────────────────────────────
  function handleAdd() {
    if (!addForm.name.trim()) {
      toast.error("الرجاء إدخال اسم المورد");
      return;
    }
    addSupplier(addForm);
    toast.success("تمت إضافة المورد");
    setAddOpen(false);
    setAddForm(blankForm);
  }

  // ── Edit ───────────────────────────────────────────────────────────────
  function openEdit(supplier: Supplier, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingSupplier(supplier);
    setEditForm({
      name: supplier.name,
      phone: supplier.phone,
      address: supplier.address,
      notes: supplier.notes,
    });
    setEditOpen(true);
  }

  function handleEdit() {
    if (!editingSupplier) return;
    if (!editForm.name.trim()) {
      toast.error("الرجاء إدخال اسم المورد");
      return;
    }
    updateSupplier(editingSupplier.id, editForm);
    toast.success("تم تحديث بيانات المورد");
    setEditOpen(false);
    // Refresh selectedSupplier if it was the edited one
    if (selectedSupplier?.id === editingSupplier.id) {
      setSelectedSupplier({ ...editingSupplier, ...editForm });
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────
  function confirmDelete(supplier: Supplier, e: React.MouseEvent) {
    e.stopPropagation();
    setDeletingSupplier(supplier);
    setDeleteOpen(true);
  }

  function handleDelete() {
    if (!deletingSupplier) return;
    deleteSupplier(deletingSupplier.id);
    toast.success("تم حذف المورد");
    setDeleteOpen(false);
    if (selectedSupplier?.id === deletingSupplier.id) setSelectedSupplier(null);
  }

  return (
    <ResponsiveShell>
      <div className="space-y-6">
        {/* Header Hero Card */}
        <div className="relative overflow-hidden rounded-[28px] border border-[var(--glass-border)] bg-white p-8 shadow-sm">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 border border-indigo-100">
                🚚 دليل الموردين
              </span>
              <h1 className="mt-3 text-3xl font-black text-[var(--text-primary)]">إدارة الموردين</h1>
              <p className="mt-1.5 text-sm text-[var(--text-muted)] max-w-xl">
                تصفح قائمة الموردين، تتبع مديونياتهم، وأدر بيانات التواصل بسهولة.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="gap-2 rounded-xl h-11 px-4 text-xs font-bold"
                onClick={() => {
                  exportCSV(
                    "suppliers",
                    ["الاسم", "الهاتف", "العنوان", "المديونية", "تاريخ الإضافة"],
                    filtered.map((s) => [s.name, s.phone, s.address, String(s.totalOwed), s.createdAt])
                  );
                  toast.success("تم التصدير");
                }}
              >
                <Download className="h-4 w-4" /> تصدير CSV
              </Button>
              <Button
                className="gap-2 rounded-xl h-11 px-5 text-xs font-bold"
                onClick={() => setAddOpen(true)}
              >
                <Plus className="h-4 w-4" /> إضافة مورد جديد
              </Button>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-[var(--glass-border)] bg-white p-5 shadow-sm">
            <span className="text-[11px] font-bold text-[var(--text-muted)] block">إجمالي الموردين</span>
            <span className="text-2xl font-black text-[var(--text-primary)] mt-1 block">{suppliers.length}</span>
          </div>
          <div className="rounded-2xl border border-[var(--glass-border)] bg-white p-5 shadow-sm">
            <span className="text-[11px] font-bold text-[var(--text-muted)] block">إجمالي المديونيات</span>
            <span className="text-2xl font-black text-indigo-600 mt-1 block font-mono">
              {formatCurrency(suppliers.reduce((sum, s) => sum + s.totalOwed, 0))}
            </span>
          </div>
          <div className="rounded-2xl border border-[var(--glass-border)] bg-white p-5 shadow-sm md:col-span-1 col-span-2">
            <span className="text-[11px] font-bold text-[var(--text-muted)] block">موردون بمديونية</span>
            <span className="text-2xl font-black text-amber-600 mt-1 block">
              {suppliers.filter((s) => s.totalOwed > 0).length}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 md:w-64 w-full">
            <Search className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <Input
              placeholder="بحث بالاسم أو الهاتف أو العنوان..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9 rounded-xl h-10 border-[var(--glass-border)]"
            />
          </div>
        </div>

        {/* Directory Split View */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* List */}
          <div className={`space-y-3 ${selectedSupplier ? "lg:col-span-7" : "lg:col-span-12"} transition-all duration-300`}>
            {filtered.length === 0 ? (
              <div className="m3-card text-center py-16 bg-white border border-[var(--glass-border)] rounded-2xl">
                <Truck className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                <p className="text-sm text-[var(--text-muted)]">لا يوجد موردون يطابقون خيارات البحث الحالية.</p>
              </div>
            ) : (
              filtered.map((supplier) => {
                const isActive = selectedSupplier?.id === supplier.id;
                return (
                  <div
                    key={supplier.id}
                    onClick={() => setSelectedSupplier(supplier)}
                    className={`rounded-2xl border p-4 transition-all duration-200 cursor-pointer flex items-center justify-between gap-4 ${
                      isActive
                        ? "border-indigo-400 bg-indigo-50/20 shadow-sm"
                        : "border-[var(--glass-border)] bg-white hover:bg-gray-50/40"
                    }`}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-bold ${getAvatarColor(supplier.id)}`}>
                        {supplier.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-[var(--text-primary)] truncate">{supplier.name}</h4>
                        <p className="text-xs text-[var(--text-muted)] mt-1 flex gap-2 flex-wrap">
                          {supplier.phone && <span>📞 {supplier.phone}</span>}
                          {supplier.address && <span>📍 {supplier.address}</span>}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-left hidden sm:block">
                        <span className="text-sm font-black text-indigo-600 block font-mono">
                          {formatCurrency(supplier.totalOwed)}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)]">المديونية</span>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={(e) => openEdit(supplier, e)}
                          className="h-8 w-8 rounded-lg bg-gray-50 hover:bg-gray-100 text-indigo-600 flex items-center justify-center transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => confirmDelete(supplier, e)}
                          className="h-8 w-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Detail panel */}
          {selectedSupplier && (
            <div className="lg:col-span-5 border border-[var(--glass-border)] bg-white rounded-[24px] p-6 shadow-sm space-y-6 animate-fade-in relative">
              <div className="flex justify-between items-start border-b border-gray-50 pb-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold ${getAvatarColor(selectedSupplier.id)}`}>
                    {selectedSupplier.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[var(--text-primary)]">{selectedSupplier.name}</h3>
                    <span className="text-xs text-[var(--text-muted)]">مضاف منذ {selectedSupplier.createdAt}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSupplier(null)}
                  className="h-8 w-8 rounded-full bg-gray-50 text-[var(--text-muted)] hover:bg-gray-100 flex items-center justify-center transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3.5">
                  <span className="text-[11px] text-[var(--text-muted)] font-bold block">المديونية</span>
                  <span className="text-base font-black text-indigo-600 block mt-0.5 font-mono">
                    {formatCurrency(selectedSupplier.totalOwed)}
                  </span>
                </div>
                <div className="bg-gray-50/50 border border-gray-100 rounded-xl p-3.5">
                  <span className="text-[11px] text-[var(--text-muted)] font-bold block">تاريخ الإضافة</span>
                  <span className="text-sm font-black text-[var(--text-primary)] block mt-0.5">
                    {selectedSupplier.createdAt}
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="space-y-2">
                {selectedSupplier.phone && (
                  <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <Phone className="h-4 w-4 text-[var(--text-muted)]" />
                    <span>{selectedSupplier.phone}</span>
                  </div>
                )}
                {selectedSupplier.address && (
                  <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <MapPin className="h-4 w-4 text-[var(--text-muted)]" />
                    <span>{selectedSupplier.address}</span>
                  </div>
                )}
                {selectedSupplier.notes && (
                  <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-xs text-[var(--text-secondary)]">
                    {selectedSupplier.notes}
                  </div>
                )}
              </div>

              {/* Quick actions */}
              <div className="flex gap-2 pt-4 border-t border-gray-50">
                <Button
                  className="flex-1 rounded-xl h-10 text-xs font-bold"
                  onClick={(e) => openEdit(selectedSupplier, e)}
                >
                  <Pencil className="h-4 w-4 ml-1" /> تعديل المورد
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl h-10 text-xs font-bold text-red-600 border-red-200 hover:bg-red-50/20"
                  onClick={(e) => confirmDelete(selectedSupplier, e)}
                >
                  <Trash2 className="h-4 w-4 ml-1" /> حذف
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-indigo-700">إضافة مورد جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="الاسم *"
              value={addForm.name}
              onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
              className="rounded-xl"
            />
            <Input
              placeholder="الهاتف"
              value={addForm.phone}
              onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
              className="rounded-xl"
            />
            <Input
              placeholder="العنوان"
              value={addForm.address}
              onChange={(e) => setAddForm({ ...addForm, address: e.target.value })}
              className="rounded-xl"
            />
            <Input
              placeholder="ملاحظات"
              value={addForm.notes}
              onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
              className="rounded-xl"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setAddOpen(false)}>إلغاء</Button>
            <Button onClick={handleAdd}>إضافة</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-indigo-700">تعديل بيانات المورد</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="الاسم *"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="rounded-xl"
            />
            <Input
              placeholder="الهاتف"
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              className="rounded-xl"
            />
            <Input
              placeholder="العنوان"
              value={editForm.address}
              onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
              className="rounded-xl"
            />
            <Input
              placeholder="ملاحظات"
              value={editForm.notes}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              className="rounded-xl"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditOpen(false)}>إلغاء</Button>
            <Button onClick={handleEdit}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-red-600">حذف المورد</DialogTitle>
          </DialogHeader>
          <p className="text-base text-muted-foreground">
            هل أنت متأكد من حذف المورد &quot;{deletingSupplier?.name}&quot;؟
          </p>
          {deletingSupplier && deletingSupplier.totalOwed > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
              <AlertTriangle className="inline h-4 w-4 ml-1" />
              هذا المورد لديه مديونية بقيمة {formatCurrency(deletingSupplier.totalOwed)}.
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>إلغاء</Button>
            <Button variant="destructive" onClick={handleDelete}>حذف</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ResponsiveShell>
  );
}
