"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

export default function NewClientPage() {
  const router = useRouter();
  const { addClient } = useStore();
  const [formData, setFormData] = useState({ name: "", phone: "", address: "", notes: "" });

  function handleSave() {
    if (!formData.name.trim()) { toast.error("يرجى إدخال اسم العميل"); return; }
    addClient(formData);
    toast.success("تم إضافة العميل بنجاح");
    router.push("/clients");
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="mb-8 flex items-center gap-3">
          <Link href="/clients" className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--glass-border)] bg-[var(--surface-1)] text-muted-foreground transition-colors hover:bg-[var(--surface-2)]">
            <ArrowRight className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">إضافة عميل جديد</h1>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--surface-1)] p-6 shadow-sm">
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">الاسم</label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="اسم العميل" />
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">رقم الهاتف</label>
              <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="09XXXXXXXX" dir="ltr" />
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">العنوان</label>
              <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="حلب - الحي" />
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">ملاحظات</label>
              <Input value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="ملاحظات إضافية عن العميل..." />
            </div>
          </div>

          <div className="mt-8 flex items-center justify-end gap-3 border-t border-[var(--glass-border)] pt-6">
            <Button variant="outline" asChild><Link href="/clients">إلغاء</Link></Button>
            <Button onClick={handleSave}>إضافة العميل</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
