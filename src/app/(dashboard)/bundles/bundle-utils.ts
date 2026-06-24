import { type Product } from "@/lib/data";
import { type BundleItem } from "@/lib/store";

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
  if (n.includes("light cyan")    || n === "lc") return "LC";
  if (n.includes("light magenta") || n === "lm") return "LM";
  if (n.includes("cyan")          || n === "c")  return "C";
  if (n.includes("magenta")       || n === "m")  return "M";
  if (n.includes("yellow")        || n === "y")  return "Y";
  if (n.includes("black")         || n === "bk") return "BK";
  return "";
}

export function detectType(product: Product): NonNullable<BundleItem["componentType"]> {
  const cat = product.category.toLowerCase();
  const name = product.name.toLowerCase();
  if (cat.includes("printer") || cat === "printers") return "printer";
  if (name.includes("tank") || cat.includes("tank")) return "tank";
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
