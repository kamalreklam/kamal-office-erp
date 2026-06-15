"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { type OrderStatus } from "@/lib/data";
import { toast } from "sonner";
import {
  ArrowRight,
  ClipboardList,
  Save,
  User,
  FileText,
  Activity,
  ChevronDown
} from "lucide-react";

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
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4" dir="rtl">
        <p className="text-slate-500 font-bold text-lg">الطلب غير موجود</p>
        <button 
          onClick={() => router.push("/orders")}
          className="h-12 px-6 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors"
        >
          العودة للطلبات
        </button>
      </div>
    );
  }

  function handleSave() {
    if (!formData.clientId || !formData.description.trim()) { 
      toast.error("يرجى ملء جميع الحقول الإلزامية"); 
      return; 
    }
    const client = clients.find((c) => c.id === formData.clientId);
    if (!client) return;
    updateOrder(id, { clientId: formData.clientId, clientName: client.name, description: formData.description, status: formData.status });
    toast.success("تم تحديث الطلب بنجاح");
    router.push("/orders");
  }

  return (
    <div className="pb-32 bg-gradient-to-br from-indigo-50/50 via-white to-blue-50/30 min-h-screen" dir="rtl">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-8 space-y-8">
        
        {/* Header */}
        <div className="flex items-center gap-4">
          <button 
            className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm active:scale-95 shrink-0" 
            onClick={() => router.push("/orders")}
          >
            <ArrowRight className="size-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <ClipboardList className="size-6 text-indigo-600" />
              تعديل الطلب
            </h1>
            <p className="mt-1 text-sm font-bold text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded-lg w-fit">
              {order.trackingId}
            </p>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="p-6 sm:p-8 space-y-6">
            
            {/* Client Select */}
            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                <User className="size-4 text-indigo-500" />
                العميل
              </label>
              <div className="relative">
                <select
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  className="w-full h-14 pl-4 pr-12 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-bold text-slate-900 appearance-none"
                >
                  <option value="" disabled>اختر العميل...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                  <ChevronDown className="size-5 text-slate-400" />
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                <FileText className="size-4 text-indigo-500" />
                وصف الطلب
              </label>
              <input
                type="text"
                placeholder="مثال: صيانة طابعة HP"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full h-14 px-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-bold text-slate-900"
              />
            </div>

            {/* Status Select */}
            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                <Activity className="size-4 text-indigo-500" />
                الحالة
              </label>
              <div className="relative">
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as OrderStatus })}
                  className="w-full h-14 pl-4 pr-12 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-bold text-slate-900 appearance-none"
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                  <ChevronDown className="size-5 text-slate-400" />
                </div>
              </div>
            </div>

          </div>

          {/* Actions */}
          <div className="p-6 sm:p-8 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-end gap-3">
            <button 
              onClick={() => router.push("/orders")}
              className="h-14 px-8 rounded-2xl bg-amber-500 border border-amber-600 text-white font-bold hover:bg-amber-600 active:scale-95 transition-all w-full sm:w-auto shadow-md"
            >
              إلغاء
            </button>
            <button 
              onClick={handleSave}
              className="h-14 px-8 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 active:scale-95 transition-all shadow-[0_8px_20px_-6px_rgba(79,70,229,0.4)] flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <Save className="size-5" />
              <span>حفظ التعديلات</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
