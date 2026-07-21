import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { renameProductCascade } from "@/lib/server/product-rename";

export const maxDuration = 30;

const MODEL = "gemini-3.1-flash-lite";
const MAX_TOOL_ROUNDS = 5;
const MAX_MESSAGE_LEN = 4000;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

// ============================================================
// Tool implementations — server-side only, query real live data.
// Every number the assistant states must come from one of these,
// never invented. Writes are limited to creating DRAFT invoices
// (status "مسودة"), which never touch stock or client totals —
// same guarantee the app's own addInvoice() gives draft invoices.
// ============================================================

async function getFinancialSummary() {
  const [{ data: invoices }, { data: products }, { data: suppliers }, { data: purchaseOrders }] = await Promise.all([
    supabase.from("invoices").select("status,total,created_at"),
    supabase.from("products").select("stock,min_stock,cost_price,selling_price"),
    supabase.from("suppliers").select("total_owed"),
    supabase.from("purchase_orders").select("status"),
  ]);
  const inv = invoices || [];
  const revenue = inv.filter((i) => i.status === "مدفوعة").reduce((s, i) => s + Number(i.total || 0), 0);
  const unpaid = inv.filter((i) => i.status === "غير مدفوعة").reduce((s, i) => s + Number(i.total || 0), 0);
  const unpaidCount = inv.filter((i) => i.status === "غير مدفوعة").length;
  const lowStock = (products || []).filter((p) => Number(p.stock) <= Number(p.min_stock)).length;
  const supplierDebt = (suppliers || []).reduce((s, x) => s + Number(x.total_owed || 0), 0);
  const pendingPOs = (purchaseOrders || []).filter((po) => po.status === "ordered").length;
  return {
    total_paid_revenue: revenue,
    total_unpaid_amount: unpaid,
    unpaid_invoice_count: unpaidCount,
    total_invoices: inv.length,
    low_stock_product_count: lowStock,
    total_supplier_debt: supplierDebt,
    pending_purchase_orders: pendingPOs,
  };
}

async function searchClients(query: string) {
  const { data } = await supabase.from("clients").select("id,name,phone,total_spent").ilike("name", `%${query}%`).limit(8);
  return { clients: data || [] };
}

async function searchProducts(query: string) {
  const { data } = await supabase.from("products").select("id,name,selling_price,stock,category").ilike("name", `%${query}%`).limit(8);
  return { products: data || [] };
}

async function getRecentInvoices(limit: number) {
  const { data } = await supabase.from("invoices").select("invoice_number,client_name,total,status,created_at").order("created_at", { ascending: false }).limit(Math.min(limit || 8, 20));
  return { invoices: data || [] };
}

async function getClientInvoices(clientName: string) {
  const { data: clientMatches } = await supabase.from("clients").select("id,name").ilike("name", `%${clientName}%`).limit(1);
  const client = clientMatches?.[0];
  if (!client) return { error: `لم يتم العثور على عميل باسم "${clientName}".` };
  const { data } = await supabase
    .from("invoices")
    .select("invoice_number,total,status,created_at")
    .eq("client_id", client.id)
    .order("created_at", { ascending: false })
    .limit(50);
  return { client_name: client.name, invoice_count: data?.length || 0, invoices: data || [] };
}

async function getSystemSuggestions() {
  const [{ data: products }, { data: invoices }, { data: suppliers }] = await Promise.all([
    supabase.from("products").select("name,stock,min_stock,cost_price,selling_price"),
    supabase.from("invoices").select("status,total,created_at"),
    supabase.from("suppliers").select("name,total_owed"),
  ]);
  const zeroCostProducts = (products || []).filter((p) => Number(p.cost_price) === 0 && Number(p.selling_price) > 0).length;
  const lowStockNames = (products || []).filter((p) => Number(p.stock) <= Number(p.min_stock)).map((p) => p.name).slice(0, 10);
  const unpaidOld = (invoices || []).filter((i) => i.status === "غير مدفوعة").length;
  const debtSuppliers = (suppliers || []).filter((s) => Number(s.total_owed) > 0).map((s) => s.name).slice(0, 10);
  return {
    products_missing_cost_price: zeroCostProducts,
    low_stock_products: lowStockNames,
    unpaid_invoice_count: unpaidOld,
    suppliers_owed_money: debtSuppliers,
  };
}

async function renameProductTool(args: { currentName: string; newName: string }) {
  const { currentName, newName } = args;
  if (!currentName || !newName) return { error: "currentName and newName are required" };
  const { data: matches } = await supabase.from("products").select("id,name").ilike("name", `%${currentName}%`).limit(1);
  const product = matches?.[0];
  if (!product) return { error: `لم يتم العثور على منتج باسم "${currentName}".` };
  return renameProductCascade(product.id, newName);
}

async function createDraftInvoice(args: { clientName: string; items: { productName: string; quantity: number }[]; notes?: string }) {
  const { clientName, items, notes } = args;
  if (!clientName || !items?.length) return { error: "clientName and items are required" };

  const { data: clientMatches } = await supabase.from("clients").select("id,name").ilike("name", `%${clientName}%`).limit(1);
  const client = clientMatches?.[0];
  if (!client) return { error: `لم يتم العثور على عميل باسم "${clientName}". تأكد من الاسم أو أضف العميل أولاً.` };

  const resolvedItems: { id: string; productId: string; productName: string; description: string; quantity: number; unitPrice: number; total: number }[] = [];
  const notFound: string[] = [];
  for (const item of items) {
    const { data: matches } = await supabase.from("products").select("id,name,selling_price,stock").ilike("name", `%${item.productName}%`).limit(1);
    const product = matches?.[0];
    if (!product) { notFound.push(item.productName); continue; }
    const qty = Math.max(1, Math.floor(item.quantity || 1));
    const unitPrice = Number(product.selling_price) || 0;
    resolvedItems.push({
      id: `it_${Math.random().toString(36).slice(2)}`,
      productId: product.id,
      productName: product.name,
      description: "",
      quantity: qty,
      unitPrice,
      total: unitPrice * qty,
    });
  }
  if (notFound.length > 0 && resolvedItems.length === 0) {
    return { error: `لم يتم العثور على أي من هذه المنتجات: ${notFound.join("، ")}` };
  }

  const subtotal = resolvedItems.reduce((s, it) => s + it.total, 0);

  const { data: settingsRow } = await supabase.from("app_settings").select("invoice_prefix").eq("id", "default").single();
  const prefix = settingsRow?.invoice_prefix || "INV";
  const year = new Date().getFullYear();
  const pattern = `${prefix}-${year}-`;
  const { data: existing } = await supabase.from("invoices").select("invoice_number").ilike("invoice_number", `${pattern}%`);
  const maxNum = (existing || []).reduce((max, row) => {
    const n = parseInt(String(row.invoice_number).replace(pattern, ""), 10);
    return isNaN(n) ? max : Math.max(max, n);
  }, 0);
  const invoiceNumber = `${pattern}${String(maxNum + 1).padStart(3, "0")}`;
  const id = `inv_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  const createdAt = new Date().toISOString().split("T")[0];

  const { error } = await supabase.from("invoices").insert({
    id,
    invoice_number: invoiceNumber,
    client_id: client.id,
    client_name: client.name,
    items: JSON.stringify({ _items: resolvedItems, _taxAmount: 0 }),
    subtotal,
    discount_type: "fixed",
    discount_value: 0,
    discount_amount: 0,
    total: subtotal,
    tax_amount: 0,
    status: "مسودة",
    notes: notes || "",
    created_at: createdAt,
  });
  if (error) return { error: `فشل إنشاء الفاتورة: ${error.message}` };

  return {
    success: true,
    invoice: {
      id, invoiceNumber, clientId: client.id, clientName: client.name,
      items: resolvedItems, subtotal, total: subtotal,
      discountType: "fixed", discountValue: 0, discountAmount: 0, taxAmount: 0,
      status: "مسودة", notes: notes || "", createdAt,
      skipped_products: notFound,
    },
  };
}

// ============================================================
// Tool schema (Gemini REST API format — uppercase JSON-schema types)
// ============================================================

const TOOLS = [
  {
    functionDeclarations: [
      {
        name: "get_financial_summary",
        description: "احصل على ملخص مالي حي للنظام: الإيرادات، المستحقات، المخزون المنخفض، ديون الموردين.",
        parameters: { type: "OBJECT", properties: {} },
      },
      {
        name: "search_clients",
        description: "ابحث عن عميل بالاسم للحصول على بياناته الحقيقية.",
        parameters: { type: "OBJECT", properties: { query: { type: "STRING" } }, required: ["query"] },
      },
      {
        name: "search_products",
        description: "ابحث عن منتج بالاسم للحصول على السعر والمخزون الحقيقيين.",
        parameters: { type: "OBJECT", properties: { query: { type: "STRING" } }, required: ["query"] },
      },
      {
        name: "get_recent_invoices",
        description: "احصل على آخر الفواتير الحقيقية في النظام.",
        parameters: { type: "OBJECT", properties: { limit: { type: "NUMBER" } } },
      },
      {
        name: "get_client_invoices",
        description: "احصل على كل الفواتير الحقيقية (قديمة وحديثة) لعميل محدد بالاسم. استخدمها دائماً عند السؤال عن فواتير عميل معين بدلاً من get_recent_invoices، لأن الأخيرة تعرض فقط آخر الفواتير في كامل النظام وقد لا تشمل فواتير هذا العميل.",
        parameters: { type: "OBJECT", properties: { clientName: { type: "STRING" } }, required: ["clientName"] },
      },
      {
        name: "get_system_suggestions",
        description: "تحليل استباقي للنظام: منتجات بدون سعر تكلفة، مخزون منخفض، فواتير غير مدفوعة، ديون موردين. استخدمها عند سؤال المستخدم عن اقتراحات أو تحسينات أو تدقيق.",
        parameters: { type: "OBJECT", properties: {} },
      },
      {
        name: "rename_product_everywhere",
        description: "غيّر اسم منتج موجود في كل مكان دفعة واحدة: بطاقة المنتج، وكل الفواتير وطلبات الشراء ومجموعات المنتجات السابقة التي تحتوي عليه (بما فيها الفواتير القديمة لأي عميل). استخدمها عند طلب المستخدم تصحيح أو إعادة تسمية اسم منتج بشكل شامل. أخبر المستخدم دائماً بعدد السجلات التي تم تحديثها.",
        parameters: {
          type: "OBJECT",
          properties: {
            currentName: { type: "STRING", description: "الاسم الحالي للمنتج كما هو مسجل، أو جزء مميز منه" },
            newName: { type: "STRING", description: "الاسم الجديد" },
          },
          required: ["currentName", "newName"],
        },
      },
      {
        name: "create_draft_invoice",
        description: "أنشئ فاتورة مسودة حقيقية في النظام لعميل موجود ومنتجات موجودة فعلياً. الأسعار تُؤخذ تلقائياً من سعر البيع الحقيقي للمنتج، لا تخترع سعراً أبداً. الفاتورة تُنشأ كمسودة فقط ولا تؤثر على المخزون حتى يراجعها المستخدم ويؤكدها من داخل النظام.",
        parameters: {
          type: "OBJECT",
          properties: {
            clientName: { type: "STRING", description: "اسم العميل كما هو مسجل في النظام" },
            items: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  productName: { type: "STRING" },
                  quantity: { type: "NUMBER" },
                },
                required: ["productName", "quantity"],
              },
            },
            notes: { type: "STRING" },
          },
          required: ["clientName", "items"],
        },
      },
    ],
  },
];

async function executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "get_financial_summary": return getFinancialSummary();
    case "search_clients": return searchClients(String(args.query || ""));
    case "search_products": return searchProducts(String(args.query || ""));
    case "get_recent_invoices": return getRecentInvoices(Number(args.limit) || 8);
    case "get_client_invoices": return getClientInvoices(String(args.clientName || ""));
    case "get_system_suggestions": return getSystemSuggestions();
    case "rename_product_everywhere": return renameProductTool(args as { currentName: string; newName: string });
    case "create_draft_invoice": return createDraftInvoice(args as { clientName: string; items: { productName: string; quantity: number }[]; notes?: string });
    default: return { error: `Unknown tool: ${name}` };
  }
}

const SYSTEM_PROMPT = `أنت المساعد الذكي لنظام "كمال للتجهيزات المكتبية" — نظام إدارة أعمال (فواتير، عملاء، مخزون، موردون).
دورك: مستشار مالي ومدقق حسابات وكاتب فواتير للمالك.

قواعد صارمة:
- استخدم الأدوات المتاحة دائماً للحصول على بيانات حقيقية. لا تخترع أي رقم أو اسم عميل أو منتج أو سعر أبداً.
- عند إنشاء فاتورة، استخدم create_draft_invoice فقط. الفاتورة تُنشأ كـ"مسودة" ولا تُنفَّذ إلا بعد مراجعة المستخدم لها داخل النظام. أخبر المستخدم دائماً أنها مسودة بانتظار المراجعة.
- إذا لم يُعثر على عميل أو منتج، أخبر المستخدم بوضوح ولا تخترع بديلاً.
- عند السؤال عن فواتير عميل معين بالاسم، استخدم get_client_invoices دائماً (تُرجع كل فواتيره). لا تستخدم get_recent_invoices لهذا الغرض أبداً، لأنها تعرض فقط آخر الفواتير في كامل النظام لكل العملاء وقد لا تشمل هذا العميل حتى لو كانت لديه فواتير كثيرة.
- استخدم rename_product_everywhere فقط عندما يطلب المستخدم صراحةً تغيير أو تصحيح اسم منتج. هذه العملية فورية وتعدّل سجلات حقيقية (فواتير وطلبات شراء ومجموعات سابقة) ولا تراجع تلقائياً، لذا لا تنفذها إلا بطلب واضح، وأخبر المستخدم دائماً بعدد الفواتير وطلبات الشراء والمجموعات التي تم تحديثها.
- أجب بالعربية دائماً، بإيجاز ووضوح، وبنبرة مهنية مباشرة تناسب صاحب عمل.
- عند تحليل الوضع المالي أو تقديم اقتراحات، استند فقط لما تُرجعه الأدوات، واذكر أرقاماً محددة.`;

interface GeminiPart {
  text?: string;
  functionCall?: { name: string; args?: Record<string, unknown> };
  functionResponse?: { name: string; response: { result: unknown } };
  // Gemini 3.x requires this to be echoed back unchanged on function-call parts,
  // or it rejects the follow-up request — never construct this ourselves.
  thoughtSignature?: string;
}
interface GeminiContent { role: string; parts: GeminiPart[]; }

async function callGemini(contents: GeminiContent[]) {
  const res = await fetch(`${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      tools: TOOLS,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errText.slice(0, 300)}`);
  }
  return res.json();
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Missing messages" }, { status: 400 });
    }
    const lastUserMsg = messages[messages.length - 1];
    if (typeof lastUserMsg?.text !== "string" || lastUserMsg.text.length > MAX_MESSAGE_LEN) {
      return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    }

    const contents: GeminiContent[] = messages
      .slice(-20) // cap history sent per request
      .map((m: { role: string; text: string }) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: String(m.text).slice(0, MAX_MESSAGE_LEN) }],
      }));

    let createdInvoice: unknown = null;
    let renamedProduct: unknown = null;

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const data = await callGemini(contents);
      const candidate = data.candidates?.[0];
      const parts: GeminiPart[] = candidate?.content?.parts || [];
      const functionCallParts = parts.filter((p) => p.functionCall);

      if (functionCallParts.length === 0) {
        const text = parts.filter((p) => p.text).map((p) => p.text).join("");
        return NextResponse.json({ text: text || "", invoice: createdInvoice, renamedProduct });
      }

      // Push back the ORIGINAL parts (unchanged) — Gemini 3.x attaches a thoughtSignature
      // sibling field to functionCall parts that must be echoed back verbatim, or the
      // next request is rejected with a 400.
      contents.push({ role: "model", parts: functionCallParts });

      const responseParts: GeminiPart[] = [];
      for (const part of functionCallParts) {
        const call = part.functionCall!;
        const name = call.name || "";
        const result = await executeTool(name, call.args || {});
        if (name === "create_draft_invoice" && result && typeof result === "object" && "invoice" in result) {
          createdInvoice = (result as { invoice: unknown }).invoice;
        }
        if (name === "rename_product_everywhere" && result && typeof result === "object" && "success" in result) {
          renamedProduct = result;
        }
        responseParts.push({ functionResponse: { name, response: { result } } });
      }
      contents.push({ role: "user", parts: responseParts });
    }

    return NextResponse.json({ text: "عذراً، لم أتمكن من إكمال الطلب — حاول صياغته بشكل أبسط.", invoice: createdInvoice, renamedProduct });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Assistant error:", message);
    return NextResponse.json({ error: "حدث خطأ في المساعد الذكي", details: message }, { status: 500 });
  }
}
