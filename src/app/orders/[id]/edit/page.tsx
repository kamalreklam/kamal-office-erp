"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { type OrderStatus } from "@/lib/data";
import { toast } from "sonner";

const statusOptions: OrderStatus[] = ["قيد الانتظار", "قيد التنفيذ", "جاهز للاستلام", "مكتمل"];

export default function EditOrderPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { orders, clients, updateOrder } = useStore();

  const order = orders.find((o) => o.id === id);

  const [formData, setFormData] = useState({ clientId: "", description: "", status: "قيد الانتظار" as OrderStatus });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (order && !loaded) {
      setFormData({ clientId: order.clientId, description: order.description, status: order.status });
      setLoaded(true);
    }
  }, [order, loaded]);

  if (!order) {
    return (
      <div className="flex min-h-screen items-center justify-center" dir="rtl">
        <div className="text-center">
          <p className="text-muted-foreground">الطلب غير موجود</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push("/orders")}>العودة للطلبات</Button>
        </div>
      </div>
    );
  }

  function handleSave() {
    if (!formData.clientId || !formData.description.trim()) { toast.error("يرجى ملء جميع الحقول"); return; }
    const client = clients.find((c) => c.id === formData.clientId);
    if (!client) return;
    updateOrder(id, { clientId: formData.clientId, clientName: client.name, description: formData.description, status: formData.status });
    toast.success("تم تحديث الطلب");
    router.push("/orders");
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="mb-8 flex items-center gap-3">
          <Link href="/orders" className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--glass-border)] bg-[var(--surface-1)] text-muted-foreground transition-colors hover:bg-[var(--surface-2)]">
            <ArrowRight className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">تعديل الطلب</h1>
          </div>
          <span className="font-mono text-sm text-muted-foreground">{order.trackingId}</span>
        </div>

        <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--surface-1)] p-6 shadow-sm">
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">العميل</label>
              <Select value={formData.clientId} onValueChange={(v) => v && setFormData({ ...formData, clientId: v })}>
                <SelectTrigger><SelectValue placeholder="اختر عميل..." /></SelectTrigger>
                <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">وصف الطلب</label>
              <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="مثال: صيانة طابعة HP" />
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">الحالة</label>
              <Select value={formData.status} onValueChange={(v) => v && setFormData({ ...formData, status: v as OrderStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{statusOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-end gap-3 border-t border-[var(--glass-border)] pt-6">
            <Button variant="outline" onClick={() => router.push("/orders")}>إلغاء</Button>
            <Button onClick={handleSave}>حفظ التعديلات</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
