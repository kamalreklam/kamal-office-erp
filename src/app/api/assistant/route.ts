import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { renameProductCascade } from "@/lib/server/product-rename";

export const maxDuration = 30;

// Primary model is the smartest available; fall back to the lite tier (much
// higher free-quota headroom) automatically if the primary is rate-limited,
// so the assistant degrades gracefully instead of just failing.
const MODEL = "gemini-3.6-flash";
const FALLBACK_MODEL = "gemini-3.1-flash-lite";
const MAX_TOOL_ROUNDS = 8;
const MAX_MESSAGE_LEN = 4000;
const geminiUrl = (model: string) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

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

// Generic Arabic descriptor words users tack onto a search term ("طابعة 5890",
// "طقم v58") that don't appear in the actual catalog/bundle names — stripping
// them before matching turns "طابعة 5890" into "5890", which does match
// "Epson C5890 WorkForce Pro Printer".
const GENERIC_DESCRIPTOR_WORDS = ["طابعة", "طقم", "جهاز", "علبة", "عبوة", "مجموعة", "قطعة", "حبر", "خزان"];
// These specifically signal "bundle/kit", not a single product — when present,
// the bundles table must be checked before individual products, or a single
// matching component (e.g. one ink color) wrongly wins over the actual kit.
const BUNDLE_SIGNAL_WORDS = ["طقم", "مجموعة"];
function stripGenericWords(query: string): string | null {
  const stripped = query
    .split(/\s+/)
    .filter((w) => !GENERIC_DESCRIPTOR_WORDS.includes(w))
    .join(" ")
    .trim();
  return stripped && stripped !== query ? stripped : null;
}

interface ResolvedProductMatch {
  type: "product";
  id: string; name: string; sellingPrice: number; costPrice: number;
}
interface ResolvedBundleMatch {
  type: "bundle";
  id: string; name: string; items: ResolvedBundleItem[]; discount: number;
}
async function findProductOrBundle(query: string): Promise<ResolvedProductMatch | ResolvedBundleMatch | null> {
  const candidates = [query, stripGenericWords(query)].filter((q): q is string => !!q);
  const isBundleIntent = query.split(/\s+/).some((w) => BUNDLE_SIGNAL_WORDS.includes(w));

  async function matchProduct(): Promise<ResolvedProductMatch | null> {
    for (const q of candidates) {
      const { data: products } = await supabase.from("products").select("id,name,selling_price,cost_price").ilike("name", `%${q}%`).limit(1);
      const product = products?.[0];
      if (product) return { type: "product", id: product.id, name: product.name, sellingPrice: Number(product.selling_price) || 0, costPrice: Number(product.cost_price) || 0 };
    }
    return null;
  }
  async function matchBundle(): Promise<ResolvedBundleMatch | null> {
    for (const q of candidates) {
      const { data: bundles } = await supabase.from("bundles").select("id,name,items,discount").ilike("name", `%${q}%`).limit(1);
      const bundle = bundles?.[0];
      if (bundle) {
        let items: ResolvedBundleItem[] = [];
        try { items = typeof bundle.items === "string" ? JSON.parse(bundle.items) : bundle.items || []; } catch { items = []; }
        return { type: "bundle", id: bundle.id, name: bundle.name, items, discount: Number(bundle.discount) || 0 };
      }
    }
    return null;
  }

  if (isBundleIntent) return (await matchBundle()) ?? (await matchProduct());
  return (await matchProduct()) ?? (await matchBundle());
}

async function createDraftInvoice(args: {
  clientName: string;
  items: { productName: string; quantity: number; unitPrice?: number }[];
  notes?: string;
}) {
  const { clientName, items, notes } = args;
  if (!clientName || !items?.length) return { error: "clientName and items are required" };

  let clientCreated = false;
  const { data: clientMatches } = await supabase.from("clients").select("id,name").ilike("name", `%${clientName}%`).limit(1);
  let client = clientMatches?.[0];
  if (!client) {
    // The client doesn't exist yet — create it now so the invoice can proceed in
    // one step. This only writes a name/contact record, never anything financial.
    const newClient = {
      id: `c_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
      name: clientName, phone: "", address: "", notes: "",
      total_spent: 0, created_at: new Date().toISOString().split("T")[0],
    };
    const { error: clientErr } = await supabase.from("clients").insert(newClient);
    if (clientErr) return { error: `فشل إنشاء العميل: ${clientErr.message}` };
    client = { id: newClient.id, name: newClient.name };
    clientCreated = true;
  }

  const resolvedItems: {
    id: string; productId: string; productName: string; description: string;
    quantity: number; unitPrice: number; total: number; isTemporary?: boolean; costPrice?: number;
    isBundle?: boolean; bundleComponents?: { productId: string; productName: string; quantity: number }[];
  }[] = [];
  const notFound: string[] = [];
  for (const item of items) {
    const qty = Math.max(1, Math.floor(item.quantity || 1));
    const priceOverride = typeof item.unitPrice === "number" && item.unitPrice > 0 ? item.unitPrice : undefined;

    // Checks real products first, then falls back to matching an existing
    // bundle/kit (e.g. "طقم v58") — with generic Arabic words like "طابعة"
    // or "طقم" stripped so "طابعة 5890" still matches "Epson C5890 ...".
    const match = await findProductOrBundle(item.productName);

    if (match?.type === "product") {
      const unitPrice = priceOverride ?? match.sellingPrice;
      resolvedItems.push({
        id: `it_${Math.random().toString(36).slice(2)}`,
        productId: match.id, productName: match.name, description: "",
        quantity: qty, unitPrice, total: unitPrice * qty, costPrice: match.costPrice,
      });
    } else if (match?.type === "bundle") {
      const bundleSellPrice = Math.max(0, match.items.reduce((s, it) => s + it.sellingPrice * it.quantity, 0) - match.discount);
      const unitPrice = priceOverride ?? bundleSellPrice;
      resolvedItems.push({
        id: `it_${Math.random().toString(36).slice(2)}`,
        productId: match.id, productName: match.name, description: "",
        quantity: qty, unitPrice, total: unitPrice * qty,
        isBundle: true, bundleComponents: match.items.map((it) => ({ productId: it.productId, productName: it.productName, quantity: it.quantity })),
      });
    } else if (priceOverride !== undefined) {
      // Not in the catalog, but the user gave an explicit price — add it as a
      // temporary line item (same mechanism the invoice editor itself uses for
      // one-off items), instead of failing the whole invoice.
      resolvedItems.push({
        id: `it_${Math.random().toString(36).slice(2)}`,
        productId: "", productName: item.productName, description: "",
        quantity: qty, unitPrice: priceOverride, total: priceOverride * qty,
        isTemporary: true, costPrice: 0,
      });
    } else {
      notFound.push(item.productName);
    }
  }
  if (notFound.length > 0 && resolvedItems.length === 0) {
    return { error: `لم يتم العثور على أي من هذه المنتجات: ${notFound.join("، ")}. إذا كان منتجاً جديداً، اذكر سعره صراحةً وسأضيفه كصنف مؤقت.` };
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
    client_created: clientCreated,
  };
}

async function searchSuppliers(query: string) {
  const { data } = await supabase.from("suppliers").select("id,name,phone,total_owed").ilike("name", `%${query}%`).limit(8);
  return { suppliers: data || [] };
}

async function getPurchaseOrders(status?: string) {
  let q = supabase.from("purchase_orders").select("po_number,supplier_name,total,status,created_at").order("created_at", { ascending: false }).limit(20);
  if (status) q = q.eq("status", status);
  const { data } = await q;
  return { purchase_orders: data || [] };
}

// Derives real sales trends from invoice line items — never invented, computed
// straight from the same JSONB blobs the invoices page itself renders.
async function getSalesTrends() {
  const { data: invoices } = await supabase.from("invoices").select("items,total,status,created_at").neq("status", "مسودة");
  const productTotals = new Map<string, { quantity: number; revenue: number }>();
  const monthTotals = new Map<string, number>();
  for (const inv of invoices || []) {
    let items: unknown = inv.items;
    if (typeof items === "string") { try { items = JSON.parse(items); } catch { items = null; } }
    const list = (items && typeof items === "object" && "_items" in (items as Record<string, unknown>))
      ? (items as { _items: unknown[] })._items
      : Array.isArray(items) ? items : [];
    for (const raw of list) {
      const it = raw as { productName?: string; quantity?: number; total?: number };
      if (!it.productName) continue;
      const cur = productTotals.get(it.productName) || { quantity: 0, revenue: 0 };
      cur.quantity += Number(it.quantity) || 0;
      cur.revenue += Number(it.total) || 0;
      productTotals.set(it.productName, cur);
    }
    const month = String(inv.created_at || "").slice(0, 7);
    if (month) monthTotals.set(month, (monthTotals.get(month) || 0) + Number(inv.total || 0));
  }
  const topByRevenue = [...productTotals.entries()].sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 10)
    .map(([name, v]) => ({ product_name: name, quantity_sold: v.quantity, revenue: v.revenue }));
  const revenueByMonth = [...monthTotals.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-6)
    .map(([month, total]) => ({ month, total }));
  return { top_products_by_revenue: topByRevenue, revenue_by_month: revenueByMonth };
}

interface QuickAction { label: string; href: string; }
interface AuditIssue { severity: "high" | "medium" | "low"; title: string; detail: string; action: QuickAction; }

// The core "read the whole database, find financial problems" tool. Every
// threshold here is deterministic and computed server-side — the model only
// narrates what this function already found, it never invents an issue.
async function auditFinancialHealth() {
  const [{ data: invoices }, { data: products }, { data: suppliers }, { data: purchaseOrders }] = await Promise.all([
    supabase.from("invoices").select("status,total,created_at"),
    supabase.from("products").select("name,stock,min_stock,cost_price,selling_price"),
    supabase.from("suppliers").select("name,total_owed"),
    supabase.from("purchase_orders").select("po_number,supplier_name,status,created_at"),
  ]);
  const issues: AuditIssue[] = [];

  const unpaid = (invoices || []).filter((i) => i.status === "غير مدفوعة");
  const unpaidTotal = unpaid.reduce((s, i) => s + Number(i.total || 0), 0);
  if (unpaid.length > 0) {
    issues.push({
      severity: unpaidTotal > 5000 ? "high" : "medium",
      title: `${unpaid.length} فاتورة غير مدفوعة بقيمة ${unpaidTotal.toLocaleString("en-US")}`,
      detail: "هاد فلوس واقفة عند الزباين — لازم متابعة تحصيل.",
      action: { label: "افتح الفواتير", href: "/invoices" },
    });
  }

  const negativeMargin = (products || []).filter((p) => Number(p.selling_price) > 0 && Number(p.cost_price) > Number(p.selling_price));
  if (negativeMargin.length > 0) {
    issues.push({
      severity: "high",
      title: `${negativeMargin.length} منتج عم يِنباع بخسارة`,
      detail: `سعر البيع أوطى من سعر التكلفة: ${negativeMargin.slice(0, 5).map((p) => p.name).join("، ")}`,
      action: { label: "افتح إدارة المخزون", href: "/inventory/advanced" },
    });
  }

  const zeroCost = (products || []).filter((p) => Number(p.cost_price) === 0 && Number(p.selling_price) > 0);
  if (zeroCost.length > 0) {
    issues.push({
      severity: "medium",
      title: `${zeroCost.length} منتج بلا سعر تكلفة مسجّل`,
      detail: "مش قادرين نحسب هامش الربح الحقيقي لهاد المنتجات لحتى تنحط تكلفتها.",
      action: { label: "افتح إدارة المخزون", href: "/inventory/advanced" },
    });
  }

  const outOfStock = (products || []).filter((p) => Number(p.stock) <= 0);
  if (outOfStock.length > 0) {
    issues.push({
      severity: "high",
      title: `${outOfStock.length} منتج خلص من المخزون`,
      detail: outOfStock.slice(0, 5).map((p) => p.name).join("، "),
      action: { label: "أنشئ طلب شراء", href: "/purchases" },
    });
  }

  const supplierDebt = (suppliers || []).filter((s) => Number(s.total_owed) > 0);
  const supplierDebtTotal = supplierDebt.reduce((s, x) => s + Number(x.total_owed || 0), 0);
  if (supplierDebt.length > 0) {
    issues.push({
      severity: supplierDebtTotal > 5000 ? "high" : "medium",
      title: `فينا ديون على ${supplierDebt.length} مورد بقيمة ${supplierDebtTotal.toLocaleString("en-US")}`,
      detail: "لازم نجدول تسديدها لحتى منضل بعلاقة كويسة مع الموردين.",
      action: { label: "افتح الموردين", href: "/suppliers" },
    });
  }

  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const stalePOs = (purchaseOrders || []).filter((po) => po.status === "ordered" && String(po.created_at) < twoWeeksAgo);
  if (stalePOs.length > 0) {
    issues.push({
      severity: "medium",
      title: `${stalePOs.length} طلب شراء مطلوب من أكتر من أسبوعين وما انستلم`,
      detail: stalePOs.slice(0, 5).map((po) => `${po.po_number} (${po.supplier_name})`).join("، "),
      action: { label: "افتح طلبات الشراء", href: "/purchases" },
    });
  }

  return { issue_count: issues.length, issues };
}

type BundleComponentType = "printer" | "ink" | "tank" | "other";
interface BundleItemInput { productName: string; quantity: number; componentType?: BundleComponentType }
interface ResolvedBundleItem {
  productId: string; productName: string; quantity: number;
  componentType?: BundleComponentType; costPrice: number; sellingPrice: number;
}

async function resolveBundleItems(items: BundleItemInput[]): Promise<{ resolved: ResolvedBundleItem[]; notFound: string[] }> {
  const resolved: ResolvedBundleItem[] = [];
  const notFound: string[] = [];
  for (const it of items) {
    const { data: matches } = await supabase.from("products").select("id,name,cost_price,selling_price").ilike("name", `%${it.productName}%`).limit(1);
    const product = matches?.[0];
    if (!product) { notFound.push(it.productName); continue; }
    resolved.push({
      productId: product.id, productName: product.name,
      quantity: Math.max(1, Math.floor(it.quantity || 1)),
      componentType: it.componentType,
      costPrice: Number(product.cost_price) || 0,
      sellingPrice: Number(product.selling_price) || 0,
    });
  }
  return { resolved, notFound };
}

async function createBundleTool(args: { name: string; description?: string; discount?: number; items: BundleItemInput[] }) {
  const { name, description, discount, items } = args;
  if (!name || !items?.length) return { error: "name and items are required" };
  const { resolved, notFound } = await resolveBundleItems(items);
  if (resolved.length === 0) return { error: `لم يتم العثور على أي من هذه المنتجات: ${notFound.join("، ")}` };

  const id = `b_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const createdAt = new Date().toISOString().split("T")[0];
  const { error } = await supabase.from("bundles").insert({
    id, name, description: description || "", items: JSON.stringify(resolved),
    discount: discount || 0, created_at: createdAt,
  });
  if (error) return { error: `فشل إنشاء المجموعة: ${error.message}` };
  return { success: true, bundle: { id, name, description: description || "", items: resolved, discount: discount || 0, createdAt }, skipped_products: notFound };
}

async function updateBundleTool(args: {
  bundleName: string; newName?: string; description?: string; discount?: number;
  addItems?: BundleItemInput[]; removeProductNames?: string[];
}) {
  const { bundleName, newName, description, discount, addItems, removeProductNames } = args;
  if (!bundleName) return { error: "bundleName is required" };
  const { data: matches } = await supabase.from("bundles").select("id,name,description,items,discount").ilike("name", `%${bundleName}%`).limit(1);
  const bundle = matches?.[0];
  if (!bundle) return { error: `لم يتم العثور على مجموعة باسم "${bundleName}".` };

  let items: ResolvedBundleItem[] = [];
  try { items = typeof bundle.items === "string" ? JSON.parse(bundle.items) : bundle.items || []; } catch { items = []; }

  if (removeProductNames?.length) {
    const toRemove = removeProductNames.map((n) => n.toLowerCase());
    items = items.filter((it) => !toRemove.some((n) => it.productName.toLowerCase().includes(n)));
  }
  let addNotFound: string[] = [];
  if (addItems?.length) {
    const { resolved, notFound } = await resolveBundleItems(addItems);
    items = [...items, ...resolved];
    addNotFound = notFound;
  }

  const patch: Record<string, unknown> = { items: JSON.stringify(items) };
  if (newName) patch.name = newName;
  if (description !== undefined) patch.description = description;
  if (discount !== undefined) patch.discount = discount;

  const { error } = await supabase.from("bundles").update(patch).eq("id", bundle.id);
  if (error) return { error: `فشل تحديث المجموعة: ${error.message}` };
  return {
    success: true,
    bundle: { id: bundle.id, name: newName || bundle.name, items, discount: discount ?? bundle.discount },
    skipped_products: addNotFound,
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
        name: "search_suppliers",
        description: "ابحث عن مورد بالاسم للحصول على بياناته الحقيقية بما فيها المبلغ المستحق له.",
        parameters: { type: "OBJECT", properties: { query: { type: "STRING" } }, required: ["query"] },
      },
      {
        name: "get_purchase_orders",
        description: "احصل على آخر طلبات الشراء الحقيقية، اختيارياً مفلترة بحالة معينة (draft, ordered, received, cancelled).",
        parameters: { type: "OBJECT", properties: { status: { type: "STRING" } } },
      },
      {
        name: "get_sales_trends",
        description: "تحليل حقيقي لأداء المبيعات: أفضل المنتجات مبيعاً حسب الإيراد، وإجمالي الإيرادات لكل شهر من آخر 6 أشهر. استخدمها عند سؤال المستخدم عن الاتجاهات أو أكثر المنتجات مبيعاً أو أداء المبيعات بمرور الوقت.",
        parameters: { type: "OBJECT", properties: {} },
      },
      {
        name: "audit_financial_health",
        description: "افحص قاعدة البيانات بالكامل لاكتشاف المشاكل المالية الحقيقية: فواتير غير مدفوعة، منتجات تُباع بخسارة، منتجات بلا سعر تكلفة، مخزون نافد، ديون موردين، طلبات شراء متأخرة. استخدمها دائماً عند سؤال المستخدم عن مشاكل النظام أو تدقيق شامل أو 'شو في مشاكل' أو طلب اقتراحات لتحسين الوضع المالي. كل مشكلة تُرجع مع زر إجراء سريع يظهر تلقائياً للمستخدم — لا تخترع روابط أو أزرار بنفسك.",
        parameters: { type: "OBJECT", properties: {} },
      },
      {
        name: "create_draft_invoice",
        description: "أنشئ فاتورة مسودة حقيقية في النظام. إذا كان العميل غير موجود، يُنشأ تلقائياً بالاسم المُعطى — لكن ابحث دائماً بجزء من الاسم أولاً (مثلاً 'حنظل' بدل 'شركة حنظل') لأن العميل غالباً موجود فعلاً بالنظام باسم أطول أو مختلف قليلاً. لكل صنف: اسم الصنف يُطابَق تلقائياً مع منتج حقيقي أو مجموعة/طقم (bundle) حقيقي موجود بالكتالوج — لا داعي لذكر الاسم الكامل الدقيق. إذا لم يُذكر سعر صراحةً، يُستخدم سعر البيع الحقيقي المسجل. إذا ذكر المستخدم سعراً صراحةً لصنف معين (مثلاً 'وحطلي السعر ٢٤ دولار')، مرّره في unitPrice ليُستخدم بدل السعر المسجل. إذا لم يُعثر على مطابقة بالكتالوج إطلاقاً لكن المستخدم ذكر سعره، مرّر unitPrice وسيُضاف كصنف مؤقت بهذا السعر بدون ما يفشل إنشاء الفاتورة. الفاتورة تُنشأ كمسودة فقط ولا تؤثر على المخزون حتى يراجعها المستخدم ويؤكدها من داخل النظام.",
        parameters: {
          type: "OBJECT",
          properties: {
            clientName: { type: "STRING", description: "اسم العميل — إذا لم يكن موجوداً سيُنشأ تلقائياً بهذا الاسم" },
            items: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  productName: { type: "STRING" },
                  quantity: { type: "NUMBER" },
                  unitPrice: { type: "NUMBER", description: "اذكرها فقط إذا صرّح المستخدم بسعر محدد لهذا الصنف؛ اتركها فارغة لاستخدام سعر البيع المسجل تلقائياً" },
                },
                required: ["productName", "quantity"],
              },
            },
            notes: { type: "STRING" },
          },
          required: ["clientName", "items"],
        },
      },
      {
        name: "create_bundle",
        description: "أنشئ مجموعة منتجات (bundle) حقيقية جديدة في الكتالوج من منتجات موجودة فعلياً — مثل طقم طابعة + حبر + خزان. أسعار وتكاليف كل صنف تُؤخذ تلقائياً من بيانات المنتج الحقيقية.",
        parameters: {
          type: "OBJECT",
          properties: {
            name: { type: "STRING", description: "اسم المجموعة" },
            description: { type: "STRING" },
            discount: { type: "NUMBER", description: "خصم ثابت يُطرح من إجمالي المجموعة، افتراضياً صفر" },
            items: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  productName: { type: "STRING" },
                  quantity: { type: "NUMBER" },
                  componentType: { type: "STRING", description: "printer أو ink أو tank أو other" },
                },
                required: ["productName", "quantity"],
              },
            },
          },
          required: ["name", "items"],
        },
      },
      {
        name: "update_bundle",
        description: "عدّل مجموعة منتجات موجودة بالاسم: غيّر اسمها أو وصفها أو خصمها، أضف أصنافاً جديدة، أو احذف أصنافاً موجودة بالاسم.",
        parameters: {
          type: "OBJECT",
          properties: {
            bundleName: { type: "STRING", description: "اسم المجموعة الحالي كما هو مسجل، أو جزء مميز منه" },
            newName: { type: "STRING" },
            description: { type: "STRING" },
            discount: { type: "NUMBER" },
            addItems: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  productName: { type: "STRING" },
                  quantity: { type: "NUMBER" },
                  componentType: { type: "STRING" },
                },
                required: ["productName", "quantity"],
              },
            },
            removeProductNames: { type: "ARRAY", items: { type: "STRING" } },
          },
          required: ["bundleName"],
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
    case "search_suppliers": return searchSuppliers(String(args.query || ""));
    case "get_purchase_orders": return getPurchaseOrders(args.status ? String(args.status) : undefined);
    case "get_sales_trends": return getSalesTrends();
    case "audit_financial_health": return auditFinancialHealth();
    case "rename_product_everywhere": return renameProductTool(args as { currentName: string; newName: string });
    case "create_draft_invoice": return createDraftInvoice(args as { clientName: string; items: { productName: string; quantity: number; unitPrice?: number }[]; notes?: string });
    case "create_bundle": return createBundleTool(args as { name: string; description?: string; discount?: number; items: BundleItemInput[] });
    case "update_bundle": return updateBundleTool(args as { bundleName: string; newName?: string; description?: string; discount?: number; addItems?: BundleItemInput[]; removeProductNames?: string[] });
    default: return { error: `Unknown tool: ${name}` };
  }
}

const SYSTEM_PROMPT = `أنت المساعد الذكي لنظام "كمال للتجهيزات المكتبية" — نظام إدارة أعمال (فواتير، عملاء، مخزون، موردون).
دورك: مستشار مالي شاطر ومدقق حسابات وكاتب فواتير للمالك، وعينك على كل رقم بالنظام.

أسلوب الكلام:
- احكي بلهجة شامية (سورية/لبنانية) طبيعية وودّية، متل ما بيحكي مستشار قريب من صاحب المحل — مو رسمي وما تحكي فصحى صحفية. بس خلّي الأرقام والمصطلحات المالية (الأسعار، النسب، أسماء المنتجات) واضحة ودقيقة متل ما هي.
- كون مباشر ومختصر، وإذا في مشكلة قلها بصراحة بلا لف ودوران.
- صاحب النظام اسمه بلال أبو كمال. خاطبه دايماً بكنيته "أبو كمال" أو "معلم" — أبداً بأول اسمه "بلال". نوّع بين الطريقتين وبين مكان الكنية بالجملة حسب السياق، متل: "اهلين أبو كمال"، "اهلين معلم"، "إي أبو كمال كلامك مضبوط"، "معلم في نقطة لازم تعرفها"، "تمام أبو كمال" — ما تكرر نفس العبارة بالضبط كل مرة، خليها طبيعية ومتنوعة متل حكي حقيقي.

الذكاء والاستباقية:
- ما تكتفي بالجواب البسيط — إذا شفت فرصة تساعد أكتر (مثلاً سأل عن فاتورة وانت لاحظت العميل عليه فواتير تانية غير مدفوعة)، نبّه صاحب العمل.
- عند سؤال عام متل "شو وضعي المالي" أو "شو في مشاكل" أو "ساعدني حسّن النظام"، استخدم audit_financial_health دائماً — هي بتفحص قاعدة البيانات كلها وبترجع مشاكل حقيقية مرتبة حسب الخطورة. اشرح كل مشكلة بجملة وحدة وضحة، وما تحتاج تكتب روابط أو أزرار بنفسك — الواجهة بتعرض زر "إجراء سريع" تلقائياً تحت كل جواب حسب الأداة يلي استخدمتها.
- عند سؤال عن المبيعات أو الاتجاهات أو أكتر منتج مبيعاً، استخدم get_sales_trends.
- اربط المعلومات مع بعضها: مثلاً منتج بلا سعر تكلفة + هو من أكتر المنتجات مبيعاً = فرصة ربح ضايعة، لازم تقولها.

قواعد صارمة (ما تتنازل عنها):
- استخدم الأدوات المتاحة دائماً للحصول على بيانات حقيقية. لا تخترع أي رقم أو اسم عميل أو منتج أو سعر أبداً.
- عند إنشاء فاتورة، استخدم create_draft_invoice فقط. الفاتورة تُنشأ كـ"مسودة" ولا تُنفَّذ إلا بعد مراجعة المستخدم لها داخل النظام. أخبر المستخدم دائماً أنها مسودة بانتظار المراجعة. إذا صرّح المستخدم بسعر محدد لصنف (مثلاً "بسعر ٢٤ دولار")، مرّره كـ unitPrice ولا تستخدم سعر البيع المسجل بدلاً منه. إذا لم يكن العميل موجوداً، أخبر المستخدم أنك أنشأته تلقائياً.
- استخدم create_bundle و update_bundle لإنشاء وتعديل مجموعات المنتجات (طقم طابعة + حبر مثلاً) — دائماً بمنتجات حقيقية موجودة بالمخزون.
- إذا لم يُعثر على منتج أو مورد، أخبر المستخدم بوضوح ولا تخترع بديلاً (العميل وحده يُنشأ تلقائياً عند عدم وجوده، كما هو موضح فوق).
- عند السؤال عن فواتير عميل معين بالاسم، استخدم get_client_invoices دائماً (تُرجع كل فواتيره). لا تستخدم get_recent_invoices لهذا الغرض أبداً، لأنها تعرض فقط آخر الفواتير في كامل النظام لكل العملاء وقد لا تشمل هذا العميل حتى لو كانت لديه فواتير كثيرة.
- استخدم rename_product_everywhere فقط عندما يطلب المستخدم صراحةً تغيير أو تصحيح اسم منتج. هذه العملية فورية وتعدّل سجلات حقيقية (فواتير وطلبات شراء ومجموعات سابقة) ولا تراجع تلقائياً، لذا لا تنفذها إلا بطلب واضح، وأخبر المستخدم دائماً بعدد الفواتير وطلبات الشراء والمجموعات التي تم تحديثها.
- ما تنفّذ ولا تقترح أي إجراء مالي مباشر (تسديد، تحويل، تغيير حالة دفعة) — دايماً وجّه صاحب العمل لمراجعة وتأكيد الإجراء بنفسه داخل النظام.
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

async function callModel(model: string, contents: GeminiContent[]) {
  const res = await fetch(`${geminiUrl(model)}?key=${process.env.GEMINI_API_KEY}`, {
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
    const err = new Error(`Gemini API error ${res.status}: ${errText.slice(0, 300)}`);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  return res.json();
}

async function callGemini(contents: GeminiContent[]): Promise<{ data: Record<string, unknown>; model: string }> {
  try {
    return { data: await callModel(MODEL, contents), model: MODEL };
  } catch (err) {
    const status = (err as Error & { status?: number }).status;
    if (status === 429) return { data: await callModel(FALLBACK_MODEL, contents), model: FALLBACK_MODEL };
    throw err;
  }
}

interface UsageTotals { promptTokens: number; completionTokens: number; totalTokens: number; }

// Fire-and-forget accumulation into a single durable row — Vercel's serverless
// functions don't keep in-memory state between invocations, so this is the only
// way to report real, persistent token usage instead of numbers that reset on
// every cold start.
async function recordUsage(usage: UsageTotals) {
  try {
    const { data: row } = await supabase.from("assistant_usage").select("*").eq("id", "default").single();
    if (!row) return;
    await supabase.from("assistant_usage").update({
      prompt_tokens: Number(row.prompt_tokens || 0) + usage.promptTokens,
      completion_tokens: Number(row.completion_tokens || 0) + usage.completionTokens,
      total_tokens: Number(row.total_tokens || 0) + usage.totalTokens,
      request_count: Number(row.request_count || 0) + 1,
      updated_at: new Date().toISOString(),
    }).eq("id", "default");
  } catch {
    // Usage tracking is best-effort — never let it break the actual chat response.
  }
}

export async function GET() {
  try {
    const { data: row } = await supabase.from("assistant_usage").select("*").eq("id", "default").single();
    return NextResponse.json({
      model: MODEL,
      fallbackModel: FALLBACK_MODEL,
      totals: {
        promptTokens: Number(row?.prompt_tokens || 0),
        completionTokens: Number(row?.completion_tokens || 0),
        totalTokens: Number(row?.total_tokens || 0),
        requestCount: Number(row?.request_count || 0),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "تعذّر جلب إحصائيات الاستخدام", details: message }, { status: 500 });
  }
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
    const actions: QuickAction[] = [];
    const usage: UsageTotals = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    let modelUsed = MODEL;

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const { data, model } = await callGemini(contents);
      modelUsed = model;
      const meta = data.usageMetadata as { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number } | undefined;
      if (meta) {
        usage.promptTokens += meta.promptTokenCount || 0;
        usage.completionTokens += meta.candidatesTokenCount || 0;
        usage.totalTokens += meta.totalTokenCount || 0;
      }
      const candidates = data.candidates as Array<{ content?: { parts?: GeminiPart[] } }> | undefined;
      const candidate = candidates?.[0];
      const parts: GeminiPart[] = candidate?.content?.parts || [];
      const functionCallParts = parts.filter((p) => p.functionCall);

      if (functionCallParts.length === 0) {
        const text = parts.filter((p) => p.text).map((p) => p.text).join("");
        recordUsage(usage);
        return NextResponse.json({ text: text || "", invoice: createdInvoice, renamedProduct, actions, usage: { ...usage, model: modelUsed } });
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
        // Quick-action buttons are derived server-side from tool results, never
        // authored by the model — auditFinancialHealth returns one per issue found.
        if (name === "audit_financial_health" && result && typeof result === "object" && "issues" in result) {
          for (const issue of (result as { issues: AuditIssue[] }).issues) {
            if (!actions.some((a) => a.href === issue.action.href)) actions.push(issue.action);
          }
        }
        responseParts.push({ functionResponse: { name, response: { result } } });
      }
      contents.push({ role: "user", parts: responseParts });
    }

    recordUsage(usage);
    return NextResponse.json({ text: "عذراً، لم أتمكن من إكمال الطلب — حاول صياغته بشكل أبسط.", invoice: createdInvoice, renamedProduct, actions, usage: { ...usage, model: modelUsed } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Assistant error:", message);
    return NextResponse.json({ error: "حدث خطأ في المساعد الذكي", details: message }, { status: 500 });
  }
}
