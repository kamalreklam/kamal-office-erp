"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { ArrowRight, Users, CheckCircle, Phone, MapPin, AlignLeft, User } from "lucide-react";

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
    <div className="pb-32 bg-gradient-to-br from-indigo-50/50 via-white to-blue-50/30 min-h-screen" dir="rtl">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.push("/clients")}
            className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 hover:border-slate-300 transition-all shadow-sm flex items-center justify-center active:scale-95"
            title="رجوع للعملاء"
          >
            <ArrowRight className="size-5" />
          </button>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm shrink-0">
            <Users className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">إضافة عميل جديد</h1>
            <p className="text-sm font-bold text-slate-500 mt-0.5">أدخل تفاصيل العميل لإضافته إلى قاعدة البيانات</p>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-[2rem] p-6 md:p-10 border border-slate-100 shadow-sm">
          <div className="space-y-6">
            
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                اسم العميل <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                  <User className="size-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="مثال: شركة الأفق للتجارة، أحمد محمد..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pr-12 pl-4 text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">رقم الهاتف</label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                    <Phone className="size-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="09XXXXXXXX"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pr-12 pl-4 text-sm font-bold text-slate-800 font-mono placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-sm text-right"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">العنوان</label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                    <MapPin className="size-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="المدينة - المنطقة - الشارع..."
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pr-12 pl-4 text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">ملاحظات إضافية</label>
              <div className="relative">
                <div className="absolute top-3.5 right-0 flex items-start pr-4 pointer-events-none">
                  <AlignLeft className="size-5 text-slate-400" />
                </div>
                <textarea
                  placeholder="ملاحظات حول العميل، تفضيلات، شروط التعامل..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pr-12 pl-4 text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-sm min-h-[120px]"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 mt-10 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={() => router.push("/clients")}
              className="w-full sm:w-auto h-14 px-8 rounded-2xl bg-amber-500 border border-amber-600 text-white font-bold hover:bg-amber-600 active:scale-95 transition-all shadow-md"
            >
              إلغاء الأمر
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="w-full sm:w-auto h-14 px-8 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 active:scale-95 transition-all shadow-[0_8px_20px_-6px_rgba(79,70,229,0.4)] flex items-center justify-center gap-2"
            >
              <CheckCircle className="size-5" />
              <span>حفظ العميل</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
