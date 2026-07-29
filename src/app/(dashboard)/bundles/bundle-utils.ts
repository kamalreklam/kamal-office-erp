import { type Product, type Invoice } from "@/lib/data";
import { type BundleItem, type ProductBundle } from "@/lib/store";

export const colorOrder = ["C", "M", "Y", "BK", "LC", "LM"];
export const typeOrder = ["printer", "ink", "tank", "other"] as const;

export const colorStyles: Record<string, { light: string; dark: string; textLight: string; textDark: string; dot: string }> = {
  C:  { light: "#e0f7fa", dark: "rgba(8,145,178,0.2)",   textLight: "#0e7490", textDark: "#67e8f9", dot: "#06b6d4" },
  M:  { light: "#fce4ec", dark: "rgba(190,24,93,0.2)",   textLight: "#be185d", textDark: "#f9a8d4", dot: "#ec4899" },
  Y:  { light: "#fff8e1", dark: "rgba(161,98,7,0.2)",    textLight: "#a16207", textDark: "#fcd34d", dot: "#eab308" },
  BK: { light: "#f3f4f6", dark: "rgba(75,85,99,0.3)",    textLight: "#1f2937", textDark: "#e5e7eb", dot: "#374151" },
  LC: { light: "#e0f2fe", dark: "rgba(14,165,233,0.2)",  textLight: "#0369a1", textDark: "#7dd3fc", dot: "#38bdf8" },
  LM: { light: "#ffe4e6", dark: "rgba(225,29,72,0.2)",   textLight: "#be123c", textDark: "#fda4af", dot: "#fb7185" },
};

export function getColorKey(name: string): string {
  const n = name.toLowerCase();
  const isLight = n.includes("light") || n.includes("فاتح");
  if ((n.includes("cyan") || n.includes("سماوي")) && isLight) return "LC";
  if ((n.includes("magenta") || n.includes("أحمر") || n.includes("احمر")) && isLight) return "LM";
  if (n.includes("cyan") || n.includes("سماوي") || n === "c") return "C";
  if (n.includes("magenta") || n.includes("أحمر") || n.includes("احمر") || n === "m") return "M";
  if (n.includes("yellow") || n.includes("أصفر") || n.includes("اصفر") || n === "y") return "Y";
  if (n.includes("black") || n.includes("أسود") || n.includes("اسود") || n === "bk") return "BK";
  return "";
}

export function detectType(product: Product): NonNullable<BundleItem["componentType"]> {
  const cat = product.category.toLowerCase();
  const name = product.name.toLowerCase();
  if (cat.includes("printer") || cat === "printers" || cat.includes("طابعة")) return "printer";
  if (name.includes("tank") || cat.includes("tank") || name.includes("خزان") || cat.includes("خزان")) return "tank";
  if (getColorKey(name) !== "") return "ink";
  return "other";
}

export type ResolvedItem = BundleItem & {
  product?: Product;
  colorKey: string;
  type: NonNullable<BundleItem["componentType"]>;
};

export function resolveItems(items: BundleItem[], products: Product[]): ResolvedItem[] {
  return items
    .map(item => {
      const product = products.find(p => p.id === item.productId);
      const colorKey = getColorKey(item.productName);
      const type = (item.componentType ?? (product ? detectType(product) : "other")) as NonNullable<BundleItem["componentType"]>;
      return { ...item, product, colorKey, type };
    })
    .sort((a, b) => {
      const ti = typeOrder.indexOf(a.type);
      const tj = typeOrder.indexOf(b.type);
      if (ti !== tj) return ti - tj;
      const ci = colorOrder.indexOf(a.colorKey);
      const cj = colorOrder.indexOf(b.colorKey);
      return (ci === -1 ? 99 : ci) - (cj === -1 ? 99 : cj);
    });
}

export const itemSell = (item: BundleItem, product?: Product) =>
  item.sellingPrice ?? product?.sellingPrice ?? 0;
export const itemCost = (item: BundleItem, product?: Product) =>
  item.costPrice ?? product?.sellingPrice ?? 0;

export interface BundleSuggestion {
  productIds: string[];
  products: Product[];
  invoiceCount: number;
  suggestedName: string;
}

/**
 * Finds products frequently invoiced together that aren't already covered
 * by an existing bundle — a lightweight co-purchase signal read straight
 * from invoice history, no external AI call needed.
 */
export function suggestBundles(
  invoices: Invoice[],
  products: Product[],
  bundles: ProductBundle[],
  { minInvoices = 2, maxSuggestions = 6 }: { minInvoices?: number; maxSuggestions?: number } = {}
): BundleSuggestion[] {
  const productById = new Map(products.map(p => [p.id, p]));

  // Skip line items that are themselves a bundle — we want raw co-purchases,
  // not products already sold together as a package.
  const invoiceProductSets = invoices
    .map(inv => Array.from(new Set(inv.items.filter(it => !it.isBundle && productById.has(it.productId)).map(it => it.productId))))
    .filter(ids => ids.length >= 2 && ids.length <= 5); // ignore single-item and huge mixed invoices — weak signal either way

  const existingPairs = new Set<string>();
  for (const b of bundles) {
    const ids = b.items.map(i => i.productId).sort();
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) existingPairs.add(`${ids[i]}|${ids[j]}`);
    }
  }

  const pairCounts = new Map<string, number>();
  for (const ids of invoiceProductSets) {
    const sorted = [...ids].sort();
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const key = `${sorted[i]}|${sorted[j]}`;
        if (existingPairs.has(key)) continue;
        pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
      }
    }
  }

  const ranked = Array.from(pairCounts.entries())
    .filter(([, count]) => count >= minInvoices)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxSuggestions);

  return ranked.map(([key, count]) => {
    const [idA, idB] = key.split("|");
    const productsInPair = [productById.get(idA), productById.get(idB)].filter((p): p is Product => !!p);
    return {
      productIds: [idA, idB],
      products: productsInPair,
      invoiceCount: count,
      suggestedName: productsInPair.map(p => p.name).join(" + "),
    };
  });
}
