"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

export default function NewOrderPage() {
  const router = useRouter();
  const { clients, addOrder } = useStore();
  const [formData, setFormData] = useState({ clientId: "", description: "", status: "قيد الانتظار" as OrderStatus });

  function handleSave() {
    if (!formData.clientId || !formData.description.trim()) { toast.error("يرجى ملء جميع الحقول"); return; }
    const client = clients.find((c) => c.id === formData.clientId);
    if (!client) return;
    addOrder({ clientId: formData.clientId, clientName: client.name, description: formData.description, status: formData.status });
    toast.success("تم إنشاء الطلب بنجاح");
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
            <h1 className="text-xl font-bold text-foreground">طلب جديد</h1>
          </div>
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
            <Button variant="outline" asChild><Link href="/orders">إلغاء</Link></Button>
            <Button onClick={handleSave}>إنشاء الطلب</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
