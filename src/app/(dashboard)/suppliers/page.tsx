"use client";

import React, { useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useStore } from "@/lib/store";
import type { Supplier } from "@/lib/store";
import { formatCurrency } from "@/lib/data";
import { toast } from "sonner";
import { useDebounce } from "@/lib/use-debounce";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Truck, Search, Plus, Phone, MapPin, Pencil, Trash2, AlertTriangle, X,
} from "lucide-react";

const blankForm = { name: "", phone: "", address: "", notes: "" };

function avatarColor(id: string) {
  const colors = [
    "from-indigo-400 to-blue-600", "from-emerald-400 to-teal-600",
    "from-amber-400 to-orange-500", "from-rose-400 to-pink-600",
    "from-cyan-400 to-sky-600", "from-violet-400 to-purple-600",
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function SuppliersPage() {
  const { connectionStatus, suppliers, addSupplier, updateSupplier, deleteSupplier } = useStore();

  const [search, setSearch] = useState("");
  const debounced = useDebounce(search);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState(blankForm);
  const [deleting, setDeleting] = useState<Supplier | null>(null);

  const filtered = useMemo(() => {
    const q = debounced.toLowerCase().trim();
    if (!q) return suppliers;
    return suppliers.filter(
      (s) => s.name.toLowerCase().includes(q) || s.phone.includes(q) || s.address.toLowerCase().includes(q)
    );
  }, [suppliers, debounced]);

  const totalOwed = suppliers.reduce((s, x) => s + x.totalOwed, 0);

  if (connectionStatus === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  function openAdd() {
    if (formOpen && !editing) { setFormOpen(false); return; }
    setEditing(null); setForm(blankForm); setFormOpen(true);
  }
  function openEdit(s: Supplier) {
    setEditing(s);
    setForm({ name: s.name, phone: s.phone, address: s.address, notes: s.notes });
    setFormOpen(true);
  }
  function closeForm() { setFormOpen(false); setEditing(null); }
  function save() {
    if (!form.name.trim()) { toast.error("الرجاء إدخال اسم المورد"); return; }
    if (editing) { updateSupplier(editing.id, form); toast.success("تم تحديث المورد"); }
    else { addSupplier(form); toast.success("تمت إضافة المورد"); }
    closeForm();
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-5 sm:pt-8 pb-10 sm:pb-16 space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-indigo-600 to-blue-600 p-5 sm:p-6 md:p-8 text-white shadow-lg shadow-indigo-500/20">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 text-indigo-100 text-sm font-bold">
              <Truck className="h-4 w-4" /> الموردون
            </div>
            <h1 className="mt-2 text-2xl md:text-3xl font-black !text-white">إدارة الموردين</h1>
            <p className="mt-1 text-sm text-indigo-100/90">تابع مورديك والمبالغ المستحقة لهم.</p>
          </div>
          <Button onClick={openAdd} className="gap-2 rounded-xl h-11 px-5 bg-white text-indigo-700 hover:bg-indigo-50 font-bold shadow">
            {formOpen && !editing ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {formOpen && !editing ? "إغلاق" : "مورد جديد"}
          </Button>
        </div>
      </div>

      {/* Inline add/edit panel — slides open below the header instead of a modal popup */}
      <AnimatePresence initial={false}>
        {formOpen && (
          <motion.div
            key="supplier-form"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-black text-slate-800">{editing ? "تعديل المورد" : "مورد جديد"}</h2>
                <Button size="sm" variant="ghost" onClick={closeForm} className="text-slate-500 px-2"><X className="h-4 w-4" /></Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">اسم المورد</label>
                  <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="اسم المورد أو الشركة" className="bg-white" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">الهاتف</label>
                  <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="اختياري" className="bg-white" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">العنوان</label>
                  <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="اختياري" className="bg-white" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">ملاحظات</label>
                  <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="اختياري" rows={1} className="bg-white" />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-5">
                <Button variant="outline" onClick={closeForm} className="rounded-xl font-bold bg-white">إلغاء</Button>
                <Button onClick={save} className="rounded-xl font-bold">{editing ? "حفظ التغييرات" : "إضافة المورد"}</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-bold text-slate-500 block">إجمالي الموردين</span>
          <span className="mt-1 block text-2xl font-black text-slate-800">{suppliers.length}</span>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-bold text-slate-500 block">إجمالي المستحقات</span>
          <span className="mt-1 block text-2xl font-black text-rose-600">{formatCurrency(totalOwed, "$")}</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث عن مورد" className="pr-10 h-11 rounded-xl" />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <Truck className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-bold text-slate-700">لا يوجد موردون</p>
          <Button onClick={openAdd} className="mt-4 gap-2 rounded-xl font-bold"><Plus className="h-4 w-4" /> أضف مورداً</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <div key={s.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className={`h-12 w-12 shrink-0 rounded-xl bg-gradient-to-br ${avatarColor(s.id)} grid place-items-center text-white font-black text-lg`}>
                  {s.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-slate-800 break-words">{s.name}</h3>
                  {s.phone && <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500"><Phone className="h-3 w-3" /> {s.phone}</p>}
                  {s.address && <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3 w-3" /> {s.address}</p>}
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <span className={`text-sm font-black ${s.totalOwed > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                  {formatCurrency(s.totalOwed, "$")}
                </span>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(s)} className="text-indigo-600 px-2"><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleting(s)} className="text-rose-600 px-2"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation stays a modal — a deliberate extra step before a destructive action */}
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600"><AlertTriangle className="h-5 w-5" /> حذف المورد</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">هل أنت متأكد من حذف «{deleting?.name}»؟</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleting(null)} className="rounded-xl font-bold">إلغاء</Button>
            <Button onClick={() => { if (deleting) { deleteSupplier(deleting.id); toast.success("تم حذف المورد"); setDeleting(null); } }} className="rounded-xl font-bold bg-rose-600 hover:bg-rose-700">حذف</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
