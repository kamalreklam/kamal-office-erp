"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { type Product } from "@/lib/data";
import { toast } from "sonner";
import { ArrowRight, Package, Camera, X, ChevronDown } from "lucide-react";

function ImageUploadField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("حجم الصورة يجب أن يكون أقل من 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        title="رفع صورة المنتج"
        onChange={handleFile}
        className="hidden"
      />
      {value ? (
        <div className="relative size-28 rounded-2xl overflow-hidden border border-mist shadow-sm group">
          <img src={value} alt="product" className="size-full object-cover" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-1.5 right-1.5 size-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="size-28 rounded-2xl border-2 border-dashed border-mist bg-white flex flex-col items-center justify-center gap-1.5 text-slate-400 hover:border-primary hover:bg-primary/5 hover:text-primary transition-all duration-300"
        >
          <Camera className="size-6" />
          <span className="text-[11px] font-bold">صورة المنتج</span>
        </button>
      )}
    </div>
  );
}

export default function EditProductPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { products, updateProduct, getProductImage, settings } = useStore();
  const product = products.find((p) => p.id === id);

  const [formData, setFormData] = useState({
    name: "", category: "Printers", sku: "", description: "",
    sellingPrice: 0, costPrice: 0, stock: 0, minStock: 0, unit: "عبوة", image: "",
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (product && !loaded) {
      setFormData({
        name: product.name, category: product.category, sku: product.sku,
        description: product.description, sellingPrice: product.sellingPrice, costPrice: product.costPrice || 0, stock: product.stock,
        minStock: product.minStock, unit: product.unit, image: getProductImage(product.id),
      });
      setLoaded(true);
    }
  }, [product, loaded, getProductImage]);

  if (!product) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4" dir="rtl">
        <Package className="mx-auto size-16 text-muted-foreground opacity-35" />
        <h3 className="text-lg font-bold">المنتج غير موجود</h3>
        <button
          type="button"
          onClick={() => router.push("/inventory")}
          className="h-12 px-8 rounded-2xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition-all shadow-sm"
        >
          العودة للمخزون
        </button>
      </div>
    );
  }

  function handleSave() {
    if (!formData.name.trim()) {
      toast.error("يرجى إدخال اسم المنتج");
      return;
    }
    const { image, ...productData } = formData;
    updateProduct(id, { ...productData, image } as Partial<Product> & { image?: string });
    toast.success("تم تحديث المنتج بنجاح");
    router.push("/inventory");
  }

  return (
    <div className="pb-32 bg-gradient-to-br from-indigo-50/50 via-white to-blue-50/30 min-h-screen" dir="rtl">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.push("/inventory")}
            className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 hover:border-slate-300 transition-all shadow-sm flex items-center justify-center active:scale-95"
            title="رجوع للمخزون"
          >
            <ArrowRight className="size-5" />
          </button>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
            <Package className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">تعديل تفاصيل الصنف</h1>
            <p className="text-sm font-bold text-slate-500 mt-0.5">تعديل {product.name} في المستودع</p>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-[2rem] p-6 md:p-8 border border-slate-100 shadow-sm">
        <div className="space-y-5">
          {/* Image Upload + Title and SKU Inputs */}
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            <ImageUploadField
              value={formData.image}
              onChange={(img) => setFormData({ ...formData, image: img })}
            />
            <div className="flex-1 w-full space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">
                  اسم المنتج <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="مثال: HP LaserJet Pro M404dn"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 text-sm font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">الكود (SKU)</label>
                <input
                  type="text"
                  placeholder="HP-LJ-M404"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 text-sm font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-sm font-mono"
                />
              </div>
            </div>
          </div>

          {/* Category + Unit Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">الفئة</label>
              <div className="relative">
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 text-sm font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-sm appearance-none pe-12"
                >
                  {settings.productCategories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <ChevronDown className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">الوحدة</label>
              <div className="relative">
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 text-sm font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-sm appearance-none pe-12"
                >
                  {["قطعة", "عبوة", "مجموعة", "رزمة", "خرطوشة"].map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
                <ChevronDown className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">الوصف</label>
            <textarea
              placeholder="وصف مختصر للمنتج..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 text-sm font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-sm min-h-[120px]"
            />
          </div>

          {/* Pricing & Stock Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">سعر التكلفة</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={formData.costPrice}
                onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 text-sm font-black text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">سعر المبيع</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={formData.sellingPrice}
                onChange={(e) => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 text-sm font-black text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">الكمية المتوفرة</label>
              <input
                type="number"
                min="0"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 text-sm font-black text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">الحد الأدنى</label>
              <input
                type="number"
                min="0"
                value={formData.minStock}
                onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 text-sm font-black text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-sm font-mono"
              />
            </div>
          </div>
        </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 mt-10 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={() => router.push("/inventory")}
              className="w-full sm:w-auto h-14 px-8 rounded-2xl bg-amber-500 border border-amber-600 text-white font-bold hover:bg-amber-600 active:scale-95 transition-all shadow-md"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="w-full sm:w-auto h-14 px-8 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 active:scale-95 transition-all shadow-[0_8px_20px_-6px_rgba(79,70,229,0.4)]"
            >
              حفظ التعديلات
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
