import { z } from "zod/v4";

export const clientSchema = z.object({
  name: z.string().min(1, "يرجى إدخال اسم العميل").max(200),
  phone: z.string().max(30).optional().default(""),
  address: z.string().max(500).optional().default(""),
  notes: z.string().max(1000).optional().default(""),
});

export const productSchema = z.object({
  name: z.string().min(1, "يرجى إدخال اسم المنتج").max(200),
  category: z.string().min(1).max(100),
  sku: z.string().max(50).optional().default(""),
  description: z.string().max(500).optional().default(""),
  price: z.number().min(0, "السعر يجب أن يكون 0 أو أكثر"),
  stock: z.number().int().min(0, "الكمية يجب أن تكون 0 أو أكثر"),
  minStock: z.number().int().min(0).optional().default(0),
  unit: z.string().min(1).max(50),
});

export const invoiceItemSchema = z.object({
  id: z.string(),
  productId: z.string(),
  productName: z.string(),
  description: z.string().optional().default(""),
  quantity: z.number().int().min(1, "الكمية يجب أن تكون 1 على الأقل"),
  unitPrice: z.number().min(0),
  discount: z.number().min(0).max(100),
  total: z.number().min(0),
});

export const invoiceSchema = z.object({
  clientId: z.string().min(1, "يرجى اختيار العميل"),
  clientName: z.string().min(1),
  items: z.array(invoiceItemSchema).min(1, "يجب إضافة منتج واحد على الأقل"),
  subtotal: z.number().min(0),
  discountType: z.enum(["fixed", "percentage"]),
  discountValue: z.number().min(0),
  discountAmount: z.number().min(0),
  total: z.number().min(0),
  status: z.enum(["مدفوعة", "غير مدفوعة", "مسودة", "ملغاة"]),
  notes: z.string().max(1000).optional().default(""),
});

export const orderSchema = z.object({
  clientId: z.string().min(1, "يرجى اختيار العميل"),
  clientName: z.string().min(1),
  description: z.string().max(500).optional().default(""),
  status: z.enum(["قيد الانتظار", "قيد التنفيذ", "جاهز للاستلام", "مكتمل"]),
});

export const bundleSchema = z.object({
  name: z.string().min(1, "يرجى إدخال اسم المجموعة").max(200),
  description: z.string().max(500).optional().default(""),
  items: z.array(z.object({
    productId: z.string(),
    productName: z.string(),
    quantity: z.number().int().min(1),
  })).min(1, "يجب إضافة منتج واحد على الأقل"),
  discount: z.number().min(0).max(100),
});

export const settingsSchema = z.object({
  businessName: z.string().min(1).max(200),
  businessNameEn: z.string().max(200).optional().default(""),
  phone: z.string().max(30).optional().default(""),
  address: z.string().max(500).optional().default(""),
  currency: z.string().min(1).max(10),
  currencySymbol: z.string().min(1).max(5),
  taxRate: z.number().min(0).max(100),
  taxEnabled: z.boolean(),
  invoicePrefix: z.string().min(1).max(20),
  invoiceNotes: z.string().max(1000).optional().default(""),
  lowStockWarning: z.boolean(),
  primaryColor: z.string().max(20).optional().default("#0D9488"),
  customInvoiceHtml: z.string().max(50000).optional().default(""),
});

// Helper to validate and return errors
export function validate<T>(schema: z.ZodType<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) return { success: true, data: result.data };
  const firstError = result.error.issues[0];
  return { success: false, error: firstError?.message || "بيانات غير صالحة" };
}
