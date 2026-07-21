import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

function parseItems(raw: unknown): unknown {
  if (typeof raw === "string") {
    try { return JSON.parse(raw); } catch { return null; }
  }
  return raw;
}

// Product names are frozen as plain text inside invoices.items, purchase_orders.items,
// and bundles.items JSONB blobs at the time each record is created — renaming a product
// row does nothing to that historical text on its own. This rewrites it everywhere the
// productId appears, including nested bundleComponents inside invoice line items.
export async function renameProductCascade(productId: string, newName: string) {
  const trimmed = newName.trim();
  if (!trimmed) return { error: "الاسم الجديد فارغ" };

  const { data: product } = await supabase.from("products").select("id,name").eq("id", productId).single();
  if (!product) return { error: "المنتج غير موجود" };
  const oldName = product.name as string;

  await supabase.from("products").update({ name: trimmed }).eq("id", productId);

  let invoicesUpdated = 0;
  const { data: invoices } = await supabase.from("invoices").select("id,items").limit(5000);
  for (const inv of invoices || []) {
    const parsed = parseItems(inv.items);
    if (!parsed) continue;
    const wrapped = parsed && typeof parsed === "object" && !Array.isArray(parsed) && "_items" in (parsed as Record<string, unknown>);
    const arr = wrapped ? (parsed as { _items: unknown[] })._items : parsed;
    if (!Array.isArray(arr)) continue;

    let changed = false;
    const nextArr = arr.map((item) => {
      const it = item as Record<string, unknown>;
      let next = it;
      if (it.productId === productId && it.productName !== trimmed) {
        next = { ...next, productName: trimmed };
        changed = true;
      }
      if (Array.isArray(it.bundleComponents)) {
        let compsChanged = false;
        const comps = (it.bundleComponents as Record<string, unknown>[]).map((c) => {
          if (c.productId === productId && c.productName !== trimmed) { compsChanged = true; return { ...c, productName: trimmed }; }
          return c;
        });
        if (compsChanged) { next = { ...next, bundleComponents: comps }; changed = true; }
      }
      return next;
    });

    if (changed) {
      const payload = wrapped ? { ...(parsed as Record<string, unknown>), _items: nextArr } : nextArr;
      await supabase.from("invoices").update({ items: payload }).eq("id", inv.id);
      invoicesUpdated++;
    }
  }

  let purchaseOrdersUpdated = 0;
  const { data: pos } = await supabase.from("purchase_orders").select("id,items").limit(5000);
  for (const po of pos || []) {
    const arr = parseItems(po.items);
    if (!Array.isArray(arr)) continue;
    let changed = false;
    const nextArr = arr.map((item) => {
      const it = item as Record<string, unknown>;
      if (it.productId === productId && it.productName !== trimmed) { changed = true; return { ...it, productName: trimmed }; }
      return it;
    });
    if (changed) {
      await supabase.from("purchase_orders").update({ items: nextArr }).eq("id", po.id);
      purchaseOrdersUpdated++;
    }
  }

  let bundlesUpdated = 0;
  const { data: bundles } = await supabase.from("bundles").select("id,items").limit(5000);
  for (const b of bundles || []) {
    const arr = parseItems(b.items);
    if (!Array.isArray(arr)) continue;
    let changed = false;
    const nextArr = arr.map((item) => {
      const it = item as Record<string, unknown>;
      if (it.productId === productId && it.productName !== trimmed) { changed = true; return { ...it, productName: trimmed }; }
      return it;
    });
    if (changed) {
      await supabase.from("bundles").update({ items: nextArr }).eq("id", b.id);
      bundlesUpdated++;
    }
  }

  return {
    success: true,
    productId,
    oldName,
    newName: trimmed,
    invoicesUpdated,
    purchaseOrdersUpdated,
    bundlesUpdated,
  };
}
