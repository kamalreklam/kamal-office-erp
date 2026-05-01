"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DndContext, DragEndEvent, PointerSensor, KeyboardSensor,
  useSensor, useSensors, closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy,
  arrayMove, sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { MobileInvoiceWizard } from "@/components/mobile/invoice-wizard/mobile-invoice-wizard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowRight, Plus, Trash2, Search, GripVertical, ChevronDown, ChevronRight,
  Save, Layers, Droplets, X, Package, User, FileText, Percent,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { type InvoiceStatus, formatCurrency } from "@/lib/data";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

interface LineItem {
  id: string;
  productId: string;
  productName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  discount?: number;
  _priceInput?: string;
  isBundle?: boolean;
  bundleComponents?: { productId: string; productName: string; quantity: number }[];
  isTemporary?: boolean;
  costPrice?: number;
}

// ─── Sortable row shell ───────────────────────────────────────────────────────

function SortableRowShell({
  id, children, dragListeners, dragAttributes, isDragging,
}: {
  id: string;
  children: React.ReactNode;
  dragListeners: Record<string, unknown>;
  dragAttributes: Record<string, unknown>;
  isDragging: boolean;
}) {
  void id;
  return (
    <div className={`relative transition-opacity ${isDragging ? "opacity-40 z-50" : "opacity-100"}`}>
      <button
        {...dragAttributes}
        {...dragListeners}
        className="absolute right-1 top-1/2 -translate-y-1/2 cursor-grab p-1 text-slate-300 hover:text-slate-400 active:cursor-grabbing z-10 touch-none"
        tabIndex={-1}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      {children}
    </div>
  );
}

function DraggableLineItem({
  item, children,
}: {
  item: LineItem;
  children: (
    listeners: Record<string, unknown>,
    attributes: Record<string, unknown>,
    isDragging: boolean,
  ) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <SortableRowShell
        id={item.id}
        dragListeners={listeners as Record<string, unknown>}
        dragAttributes={attributes as unknown as Record<string, unknown>}
        isDragging={isDragging}
      >
        {children(
          listeners as Record<string, unknown>,
          attributes as unknown as Record<string, unknown>,
          isDragging,
        )}
      </SortableRowShell>
    </div>
  );
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export default function NewInvoicePage() {
  const isMobile = useIsMobile();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  if (isMobile) return <MobileInvoiceWizard editId={editId} />;
  return <DesktopInvoicePage />;
}

// ─── Color helpers (shared with bundle display) ───────────────────────────────

const COLOR_STYLES: Record<string, { bg: string; dot: string; text: string }> = {
  C:  { bg: "bg-cyan-50 dark:bg-cyan-950/40",   dot: "#06b6d4", text: "text-cyan-700 dark:text-cyan-300" },
  M:  { bg: "bg-pink-50 dark:bg-pink-950/40",   dot: "#ec4899", text: "text-pink-700 dark:text-pink-300" },
  Y:  { bg: "bg-amber-50 dark:bg-amber-950/40", dot: "#eab308", text: "text-amber-700 dark:text-amber-300" },
  BK: { bg: "bg-slate-100 dark:bg-slate-800",   dot: "#334155", text: "text-slate-700 dark:text-slate-300" },
  LC: { bg: "bg-sky-50 dark:bg-sky-950/40",     dot: "#38bdf8", text: "text-sky-600 dark:text-sky-300" },
  LM: { bg: "bg-rose-50 dark:bg-rose-950/40",   dot: "#fb7185", text: "text-rose-600 dark:text-rose-300" },
};
const COLOR_ORDER = ["C", "M", "Y", "BK", "LC", "LM"];

function getColorKey(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("light cyan")    || n === "lc") return "LC";
  if (n.includes("light magenta") || n === "lm") return "LM";
  if (n.includes("cyan")   || n === "c")  return "C";
  if (n.includes("magenta")|| n === "m")  return "M";
  if (n.includes("yellow") || n === "y")  return "Y";
  if (n.includes("black")  || n === "bk") return "BK";
  return "";
}

// ─── Main desktop component ───────────────────────────────────────────────────

function DesktopInvoicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");

  const {
    clients, products, bundles, invoices,
    addInvoice, updateInvoice, settings, nextInvoiceNumber,
  } = useStore();

  const editingInvoice = editId ? invoices.find((i) => i.id === editId) : null;
  const isEdit = !!editingInvoice;

  // ── Line items ──
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: "li1", productId: "", productName: "", description: "", quantity: 1, unitPrice: 0, total: 0 },
  ]);
  const [expandedBundles, setExpandedBundles] = useState<Set<string>>(new Set());

  // ── Client ──
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<(typeof clients)[0] | null>(null);
  const [showClientDrop, setShowClientDrop] = useState(false);
  const clientRef = useRef<HTMLDivElement>(null);

  // ── Invoice-level discount ──
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState(0);

  // ── Notes ──
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);

  // ── Prefill for edit ──
  const [prefilled, setPrefilled] = useState(false);
  useEffect(() => {
    if (!editingInvoice || prefilled) return;
    const client = clients.find((c) => c.id === editingInvoice.clientId);
    if (client) { setSelectedClient(client); setClientSearch(client.name); }
    const items: LineItem[] = editingInvoice.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total,
      ...(item.isBundle ? { isBundle: true, bundleComponents: item.bundleComponents } : {}),
      ...(item.isTemporary ? { isTemporary: true, costPrice: item.costPrice } : {}),
    }));
    setLineItems(items.length > 0
      ? items
      : [{ id: "li1", productId: "", productName: "", description: "", quantity: 1, unitPrice: 0, total: 0 }]);
    setDiscountType(editingInvoice.discountType);
    setDiscountValue(editingInvoice.discountValue);
    setNotes(editingInvoice.notes);
    if (editingInvoice.notes) setShowNotes(true);
    setPrefilled(true);
  }, [editingInvoice, clients, prefilled]);

  // ── Calculations ──
  function getLineTotal(item: LineItem) {
    const d = item.discount || 0;
    return item.quantity * item.unitPrice * (1 - d / 100);
  }
  const subtotal = lineItems.reduce((s, i) => s + getLineTotal(i), 0);
  const clampedDiscount = discountType === "percentage"
    ? Math.min(discountValue, 100)
    : Math.min(discountValue, subtotal);
  const discountAmount = discountType === "percentage"
    ? (subtotal * clampedDiscount) / 100
    : clampedDiscount;
  const taxAmount = settings.taxEnabled
    ? ((subtotal - discountAmount) * settings.taxRate) / 100
    : 0;
  const total = Math.max(0, subtotal - discountAmount + taxAmount);

  // ── Close dropdowns on outside click ──
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (clientRef.current && !clientRef.current.contains(e.target as Node))
        setShowClientDrop(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Line item mutations ──
  function updateQty(id: string, qty: number) {
    setLineItems((prev) => prev.map((item) => {
      if (item.id !== id) return item;
      if (item.isTemporary) return { ...item, quantity: qty, total: qty * item.unitPrice };
      if (item.isBundle && item.bundleComponents) {
        for (const comp of item.bundleComponents) {
          const p = products.find((pr) => pr.id === comp.productId);
          if (p && comp.quantity * qty > p.stock) {
            toast.error(`الكمية أكبر من مخزون "${p.name}" (${p.stock})`);
            return item;
          }
        }
        return { ...item, quantity: qty, total: getLineTotal({ ...item, quantity: qty }) };
      }
      const p = products.find((pr) => pr.id === item.productId);
      if (p && qty > p.stock) {
        toast.error(`الكمية (${qty}) أكبر من المخزون (${p.stock})`);
        return item;
      }
      return { ...item, quantity: qty, total: getLineTotal({ ...item, quantity: qty }) };
    }));
  }

  function updatePrice(id: string, raw: string) {
    const unitPrice = parseFloat(raw) || 0;
    setLineItems((prev) => prev.map((item) =>
      item.id !== id ? item
        : { ...item, unitPrice, total: getLineTotal({ ...item, unitPrice }), _priceInput: raw }
    ));
  }

  function updateLineDiscount(id: string, disc: number) {
    const d = Math.min(Math.max(disc, 0), 100);
    setLineItems((prev) => prev.map((item) =>
      item.id !== id ? item
        : { ...item, discount: d, total: getLineTotal({ ...item, discount: d }) }
    ));
  }

  function updateTempName(id: string, name: string) {
    setLineItems((prev) => prev.map((item) =>
      item.id !== id ? item : { ...item, productName: name }
    ));
  }

  function updateCostPrice(id: string, raw: string) {
    setLineItems((prev) => prev.map((item) =>
      item.id !== id ? item : { ...item, costPrice: parseFloat(raw) || 0 }
    ));
  }

  function removeRow(id: string) {
    if (lineItems.length <= 1) return;
    setLineItems((prev) => prev.filter((i) => i.id !== id));
  }

  function toggleBundleExpand(id: string) {
    setExpandedBundles((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // ── Drag & drop ──
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setLineItems((prev) => {
        const oldIndex = prev.findIndex((i) => i.id === active.id);
        const newIndex = prev.findIndex((i) => i.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  }

  // ── Ink-set detection ──
  const COLOR_WORDS = ["cyan", "magenta", "yellow", "black", "light cyan", "light magenta"];
  function getInkBaseName(name: string): string | null {
    const n = name.toLowerCase();
    let base = n;
    for (const cw of COLOR_WORDS) base = base.replace(cw, "").trim();
    base = base.replace(/\d+\s*ml/gi, "").replace(/[-–—]+/g, " ").replace(/\s+/g, " ").trim();
    const cleaned = n.replace(/\d+\s*ml/gi, "").replace(/[-–—]+/g, " ").replace(/\s+/g, " ").trim();
    return base !== cleaned ? base : null;
  }

  const inkSets = (() => {
    const groups: Record<string, typeof products> = {};
    products.forEach((p) => {
      const base = getInkBaseName(p.name);
      if (base) {
        if (!groups[base]) groups[base] = [];
        groups[base].push(p);
      }
    });
    return Object.entries(groups)
      .filter(([, items]) => items.length >= 4)
      .map(([baseName, items]) => ({
        baseName,
        displayName:
          items[0].name
            .replace(/\s*(Cyan|Magenta|Yellow|Black|Light Cyan|Light Magenta)\s*/i, " ")
            .trim() + " Set",
        items: items.sort((a, b) =>
          COLOR_ORDER.indexOf(getColorKey(a.name)) -
          COLOR_ORDER.indexOf(getColorKey(b.name))
        ),
      }));
  })();

  // ── Smart search overlay ──
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCategory, setSearchCategory] = useState("all");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showSearch) setTimeout(() => searchInputRef.current?.focus(), 50);
  }, [showSearch]);

  useEffect(() => {
    if (!showSearch) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setShowSearch(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showSearch]);

  const categories = ["all", ...Array.from(new Set(products.map((p) => p.category)))];

  const filteredProducts = (() => {
    const q = searchQuery.toLowerCase().trim();
    let list = products;
    if (searchCategory !== "all") list = list.filter((p) => p.category === searchCategory);
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q));
    return list.slice(0, 30);
  })();

  // Recent products: last 5 distinct products added (non-bundle, non-temp)
  const recentProductIds = lineItems
    .filter((i) => i.productId && !i.isBundle && !i.isTemporary)
    .map((i) => i.productId)
    .slice(-5)
    .reverse();
  const recentProducts = recentProductIds
    .map((id) => products.find((p) => p.id === id))
    .filter(Boolean) as typeof products;

  function addProductFromSearch(product: (typeof products)[0]) {
    if (product.stock <= 0) {
      toast.error(`"${product.name}" — المخزون 0`);
      return;
    }
    const newItem: LineItem = {
      id: `li${Date.now()}`,
      productId: product.id,
      productName: product.name,
      description: product.description,
      quantity: 1,
      unitPrice: product.price,
      total: product.price,
    };
    setLineItems((prev) => {
      const withoutEmpty = prev.filter((i) => i.productId || i.isTemporary || i.isBundle);
      return [...withoutEmpty, newItem];
    });
    setShowSearch(false);
    toast.success(`تمت إضافة "${product.name}"`);
  }

  function addTempProduct() {
    const newItem: LineItem = {
      id: `li${Date.now()}`,
      productId: "",
      productName: "",
      description: "",
      quantity: 1,
      unitPrice: 0,
      total: 0,
      isTemporary: true,
    };
    setLineItems((prev) => {
      const withoutEmpty = prev.filter((i) => i.productId || i.isTemporary || i.isBundle);
      return [...withoutEmpty, newItem];
    });
    setShowSearch(false);
  }

  // ── Bundle dialog ──
  const [bundleDialogOpen, setBundleDialogOpen] = useState(false);
  const [activeBundleId, setActiveBundleId] = useState<string | null>(null);
  const [bundleSetPrice, setBundleSetPrice] = useState("");

  function openBundleDialog(bundleId: string) {
    const bundle = bundles.find((b) => b.id === bundleId);
    if (!bundle) return;
    // Default price = sum of sellingPrice × quantity, fallback to product.price
    const defaultPrice = bundle.items.reduce((s, bi) => {
      if (bi.sellingPrice !== undefined) return s + bi.sellingPrice * bi.quantity;
      const product = products.find((p) => p.id === bi.productId);
      return s + (product?.price || 0) * bi.quantity;
    }, 0);
    setBundleSetPrice(String(defaultPrice));
    setActiveBundleId(bundleId);
    setBundleDialogOpen(true);
    setShowSearch(false);
  }

  function confirmBundleAdd() {
    const bundle = bundles.find((b) => b.id === activeBundleId);
    if (!bundle) return;
    const blocked = bundle.items
      .filter((bi) => {
        const p = products.find((p) => p.id === bi.productId);
        return !p || p.stock < bi.quantity;
      })
      .map((bi) => bi.productName);
    if (blocked.length > 0) {
      toast.error(`نفذ المخزون: ${blocked.join("، ")}`);
      return;
    }
    const components = bundle.items.map((bi) => {
      const product = products.find((p) => p.id === bi.productId);
      return { productId: bi.productId, productName: product?.name || bi.productName, quantity: bi.quantity };
    });
    const bundleItem: LineItem = {
      id: `li${Date.now()}`,
      productId: `bundle_${bundle.id}`,
      productName: bundle.name,
      description: bundle.description || bundle.items.map((bi) => {
        const p = products.find((p) => p.id === bi.productId);
        return p?.name || bi.productName;
      }).join(" + "),
      quantity: 1,
      unitPrice: parseFloat(bundleSetPrice) || 0,
      total: parseFloat(bundleSetPrice) || 0,
      isBundle: true,
      bundleComponents: components,
    };
    setLineItems((prev) => {
      const withoutEmpty = prev.filter((i) => i.productId || i.isTemporary || i.isBundle);
      return [...withoutEmpty, bundleItem];
    });
    setBundleDialogOpen(false);
    toast.success(`تم إضافة "${bundle.name}"`);
  }

  // ── Ink-set dialog ──
  const [inkSetDialogOpen, setInkSetDialogOpen] = useState(false);
  const [activeInkSet, setActiveInkSet] = useState<(typeof inkSets)[0] | null>(null);
  const [inkSetPrice, setInkSetPrice] = useState("");

  function openInkSetDialog(set: (typeof inkSets)[0]) {
    setActiveInkSet(set);
    setInkSetPrice(String(set.items.reduce((s, p) => s + p.price, 0)));
    setInkSetDialogOpen(true);
    setShowSearch(false);
  }

  function confirmInkSetAdd() {
    if (!activeInkSet) return;
    const blocked = activeInkSet.items.filter((p) => p.stock <= 0).map((p) => p.name);
    if (blocked.length > 0) { toast.error(`نفذ المخزون: ${blocked.join("، ")}`); return; }
    const components = activeInkSet.items.map((p) => ({
      productId: p.id, productName: p.name, quantity: 1,
    }));
    const setItem: LineItem = {
      id: `li${Date.now()}`,
      productId: `inkset_${activeInkSet.baseName}`,
      productName: activeInkSet.displayName,
      description: activeInkSet.items.map((p) => p.name).join(" + "),
      quantity: 1,
      unitPrice: parseFloat(inkSetPrice) || 0,
      total: parseFloat(inkSetPrice) || 0,
      isBundle: true,
      bundleComponents: components,
    };
    setLineItems((prev) => {
      const withoutEmpty = prev.filter((i) => i.productId || i.isTemporary || i.isBundle);
      return [...withoutEmpty, setItem];
    });
    setInkSetDialogOpen(false);
    toast.success(`تم إضافة طقم "${activeInkSet.displayName}"`);
  }

  // ── Save invoice ──
  function handleSave(status: InvoiceStatus) {
    if (!selectedClient) { toast.error("يرجى اختيار عميل"); return; }
    const validItems = lineItems.filter((li) => li.productId || li.isTemporary);
    if (validItems.length === 0) { toast.error("يرجى إضافة منتج واحد على الأقل"); return; }
    const missingNames = validItems.filter((li) => li.isTemporary && !li.productName.trim());
    if (missingNames.length > 0) { toast.error("يرجى إدخال اسم المنتج المؤقت"); return; }

    // Build effective stock map for edit mode
    const effectiveStock = new Map<string, number>();
    if (isEdit && editingInvoice) {
      (editingInvoice.items || []).forEach((item) => {
        if (item.isTemporary) return;
        if (item.isBundle && item.bundleComponents) {
          item.bundleComponents.forEach((comp) => {
            const p = products.find((pr) => pr.id === comp.productId);
            if (!p) return;
            effectiveStock.set(comp.productId, (effectiveStock.get(comp.productId) ?? p.stock) + comp.quantity * item.quantity);
          });
        } else if (item.productId) {
          const p = products.find((pr) => pr.id === item.productId);
          if (!p) return;
          effectiveStock.set(item.productId, (effectiveStock.get(item.productId) ?? p.stock) + item.quantity);
        }
      });
    }

    // Stock validation
    const stockErrors: string[] = [];
    validItems.forEach((li) => {
      if (li.isTemporary) return;
      if (li.isBundle && li.bundleComponents) {
        li.bundleComponents.forEach((comp) => {
          const p = products.find((pr) => pr.id === comp.productId);
          if (!p) return;
          const avail = effectiveStock.get(comp.productId) ?? p.stock;
          if (comp.quantity * li.quantity > avail)
            stockErrors.push(`${p.name} (متوفر: ${avail})`);
        });
      } else {
        const p = products.find((pr) => pr.id === li.productId);
        if (!p) return;
        const avail = effectiveStock.get(li.productId) ?? p.stock;
        if (li.quantity > avail)
          stockErrors.push(`${p.name} (طلب: ${li.quantity}, متوفر: ${avail})`);
      }
    });
    if (stockErrors.length > 0) { toast.error(`مشكلة في المخزون: ${stockErrors.join("، ")}`); return; }

    const invoiceData = {
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      items: validItems.map((li) => ({
        id: li.id,
        productId: li.productId,
        productName: li.productName,
        description: li.description,
        quantity: li.quantity,
        unitPrice: li.unitPrice,
        total: li.total,
        ...(li.discount ? { discount: li.discount } : {}),
        ...(li.isBundle ? { isBundle: true, bundleComponents: li.bundleComponents } : {}),
        ...(li.isTemporary ? { isTemporary: true, ...(li.costPrice ? { costPrice: li.costPrice } : {}) } : {}),
      })),
      subtotal,
      discountType,
      discountValue,
      discountAmount,
      taxAmount,
      total,
      status,
      notes,
    };

    if (isEdit && editId) {
      updateInvoice(editId, invoiceData);
      toast.success("تم تحديث الفاتورة");
      router.push(`/invoices/${editId}`);
    } else {
      addInvoice(invoiceData);
      toast.success("تم حفظ الفاتورة");
      router.push("/invoices");
    }
  }

  // ─── UI ───────────────────────────────────────────────────────────────────

  const filteredClients = clientSearch.trim()
    ? clients.filter((c) => {
        const q = clientSearch.toLowerCase();
        return c.name.toLowerCase().includes(q) || c.phone.includes(q);
      })
    : clients;

  return (
    <div dir="rtl" className="flex h-screen flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur px-6 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/invoices")}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-none">
              {isEdit ? "تعديل الفاتورة" : "فاتورة جديدة"}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              {isEdit ? editingInvoice?.invoiceNumber : nextInvoiceNumber()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-xl"
            onClick={() => handleSave("مسودة")}
          >
            <FileText className="h-3.5 w-3.5" />
            حفظ مسودة
          </Button>
          <Button
            size="sm"
            className="gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700"
            onClick={() => handleSave("غير مدفوعة")}
          >
            <Save className="h-3.5 w-3.5" />
            إصدار الفاتورة
          </Button>
          <Button
            size="sm"
            className="gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700"
            onClick={() => handleSave("مدفوعة")}
          >
            حفظ مدفوعة
          </Button>
        </div>
      </header>

      {/* ── Split panel ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT: Line items ── */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* Notes toggle */}
          <div className="mb-4">
            <button
              onClick={() => setShowNotes((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              <FileText className="h-3.5 w-3.5" />
              {showNotes ? "إخفاء الملاحظات" : "إضافة ملاحظة"}
              {showNotes ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
            {showNotes && (
              <Textarea
                placeholder="ملاحظات على الفاتورة..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-2 min-h-[72px] rounded-xl border-slate-200 dark:border-slate-700 text-sm resize-none"
              />
            )}
          </div>

          {/* Line items table */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_72px_110px_72px_90px_36px] gap-2 bg-slate-50 dark:bg-slate-800/50 px-5 py-2.5 pr-8 text-[11px] font-bold uppercase tracking-wide text-slate-400">
              <span>المنتج</span>
              <span className="text-center">الكمية</span>
              <span className="text-center">السعر</span>
              <span className="text-center">خصم%</span>
              <span className="text-left">الإجمالي</span>
              <span />
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={lineItems.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {lineItems.map((item) => (
                    <DraggableLineItem key={item.id} item={item}>
                      {() => (
                        <div>
                          {item.isTemporary ? (
                            /* ── Temporary product row ── */
                            <div className="grid grid-cols-[1fr_72px_110px_72px_90px_36px] gap-2 items-center px-5 py-3 pr-8">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1.5">
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-300 text-amber-600 bg-amber-50">مؤقت</Badge>
                                  <Input
                                    placeholder="اسم المنتج..."
                                    value={item.productName}
                                    onChange={(e) => updateTempName(item.id, e.target.value)}
                                    className="h-7 text-sm border-0 shadow-none bg-transparent p-0 focus-visible:ring-0 font-medium"
                                  />
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                  <span>سعر التكلفة:</span>
                                  <Input
                                    type="number"
                                    placeholder="0"
                                    value={item.costPrice || ""}
                                    onChange={(e) => updateCostPrice(item.id, e.target.value)}
                                    className="h-6 w-20 text-[11px] border-slate-200 rounded-lg"
                                  />
                                </div>
                              </div>
                              <Input
                                type="number" min={1}
                                value={item.quantity}
                                onChange={(e) => updateQty(item.id, parseInt(e.target.value) || 1)}
                                className="h-8 text-center text-sm rounded-lg border-slate-200"
                              />
                              <Input
                                type="number" min={0} step="0.01"
                                value={item._priceInput ?? item.unitPrice}
                                onChange={(e) => updatePrice(item.id, e.target.value)}
                                className="h-8 text-center text-sm rounded-lg border-slate-200"
                              />
                              <Input
                                type="number" min={0} max={100}
                                value={item.discount || ""}
                                onChange={(e) => updateLineDiscount(item.id, parseFloat(e.target.value) || 0)}
                                className="h-8 text-center text-sm rounded-lg border-slate-200"
                                placeholder="0"
                              />
                              <span className="text-sm font-bold text-slate-800 dark:text-slate-100 text-left">
                                {formatCurrency(getLineTotal(item))}
                              </span>
                              <button
                                onClick={() => removeRow(item.id)}
                                className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : item.isBundle ? (
                            /* ── Bundle row ── */
                            <div>
                              <div className="grid grid-cols-[1fr_72px_110px_72px_90px_36px] gap-2 items-center px-5 py-3 pr-8 bg-blue-50/40 dark:bg-blue-950/20">
                                <div className="flex items-center gap-2">
                                  <span className="text-base">🎁</span>
                                  <div>
                                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                      {item.productName}
                                    </span>
                                    {item.bundleComponents && (
                                      <button
                                        onClick={() => toggleBundleExpand(item.id)}
                                        className="mr-2 flex items-center gap-0.5 text-[11px] text-blue-500 hover:text-blue-700"
                                      >
                                        {expandedBundles.has(item.id)
                                          ? <><ChevronDown className="h-3 w-3" />إخفاء التفاصيل</>
                                          : <><ChevronRight className="h-3 w-3" />{item.bundleComponents.length} منتج</>
                                        }
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <Input
                                  type="number" min={1}
                                  value={item.quantity}
                                  onChange={(e) => updateQty(item.id, parseInt(e.target.value) || 1)}
                                  className="h-8 text-center text-sm rounded-lg border-slate-200"
                                />
                                <Input
                                  type="number" min={0} step="0.01"
                                  value={item._priceInput ?? item.unitPrice}
                                  onChange={(e) => updatePrice(item.id, e.target.value)}
                                  className="h-8 text-center text-sm rounded-lg border-slate-200"
                                />
                                <Input
                                  type="number" min={0} max={100}
                                  value={item.discount || ""}
                                  onChange={(e) => updateLineDiscount(item.id, parseFloat(e.target.value) || 0)}
                                  className="h-8 text-center text-sm rounded-lg border-slate-200"
                                  placeholder="0"
                                />
                                <span className="text-sm font-bold text-slate-800 dark:text-slate-100 text-left">
                                  {formatCurrency(getLineTotal(item))}
                                </span>
                                <button
                                  onClick={() => removeRow(item.id)}
                                  className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              {/* Expanded component sub-rows */}
                              {expandedBundles.has(item.id) && item.bundleComponents && (
                                <div className="border-t border-blue-100 dark:border-blue-900/30 bg-blue-50/20 dark:bg-blue-950/10">
                                  {item.bundleComponents.map((comp, ci) => {
                                    const ck = getColorKey(comp.productName);
                                    const cs = COLOR_STYLES[ck];
                                    return (
                                      <div
                                        key={ci}
                                        className={`flex items-center gap-3 px-8 py-1.5 text-xs text-slate-500 ${cs?.bg || ""}`}
                                      >
                                        {cs ? (
                                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: cs.dot }} />
                                        ) : (
                                          <span className="h-2.5 w-2.5 rounded-full bg-slate-300 shrink-0" />
                                        )}
                                        <span className={cs?.text || ""}>{comp.productName}</span>
                                        <span className="text-slate-400">× {comp.quantity}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          ) : (
                            /* ── Regular product row ── */
                            <div className="grid grid-cols-[1fr_72px_110px_72px_90px_36px] gap-2 items-center px-5 py-3 pr-8">
                              <div>
                                {item.productId ? (
                                  <div>
                                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100 leading-none">
                                      {item.productName}
                                    </p>
                                    {item.description && (
                                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{item.description}</p>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-sm text-slate-300 italic">منتج غير محدد</span>
                                )}
                              </div>
                              <Input
                                type="number" min={1}
                                value={item.quantity}
                                onChange={(e) => updateQty(item.id, parseInt(e.target.value) || 1)}
                                className="h-8 text-center text-sm rounded-lg border-slate-200"
                              />
                              <Input
                                type="number" min={0} step="0.01"
                                value={item._priceInput ?? item.unitPrice}
                                onChange={(e) => updatePrice(item.id, e.target.value)}
                                className="h-8 text-center text-sm rounded-lg border-slate-200"
                              />
                              <Input
                                type="number" min={0} max={100}
                                value={item.discount || ""}
                                onChange={(e) => updateLineDiscount(item.id, parseFloat(e.target.value) || 0)}
                                className="h-8 text-center text-sm rounded-lg border-slate-200"
                                placeholder="0"
                              />
                              <span className="text-sm font-bold text-slate-800 dark:text-slate-100 text-left">
                                {formatCurrency(getLineTotal(item))}
                              </span>
                              <button
                                onClick={() => removeRow(item.id)}
                                className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </DraggableLineItem>
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {/* Add product row */}
            <div className="flex items-center gap-2 border-t border-slate-100 dark:border-slate-800 px-5 py-3">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl font-bold"
                onClick={() => { setSearchQuery(""); setSearchCategory("all"); setShowSearch(true); }}
              >
                <Plus className="h-4 w-4" />
                إضافة منتج
              </Button>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Client + Summary (sticky) ── */}
        <div className="w-80 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto flex flex-col">

          {/* Client selector */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-3">
              <User className="h-4 w-4 text-slate-400" />
              <span className="text-xs font-bold uppercase tracking-wide text-slate-400">العميل</span>
            </div>
            <div ref={clientRef} className="relative">
              {selectedClient ? (
                <div className="rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{selectedClient.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5" dir="ltr">{selectedClient.phone}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        الرصيد: <span className="font-bold text-slate-600 dark:text-slate-300">{formatCurrency(selectedClient.totalSpent)}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => { setSelectedClient(null); setClientSearch(""); }}
                      className="rounded-lg p-1 text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-red-500 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="ابحث عن عميل..."
                    value={clientSearch}
                    onChange={(e) => { setClientSearch(e.target.value); setShowClientDrop(true); }}
                    onFocus={() => setShowClientDrop(true)}
                    className="pr-9 h-9 rounded-xl border-slate-200 text-sm"
                  />
                </div>
              )}
              {showClientDrop && !selectedClient && (
                <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg overflow-hidden">
                  <div className="max-h-52 overflow-y-auto p-1">
                    {filteredClients.length === 0 ? (
                      <p className="p-3 text-center text-sm text-slate-400">لا يوجد عملاء</p>
                    ) : filteredClients.slice(0, 15).map((c) => (
                      <button
                        key={c.id}
                        onClick={() => { setSelectedClient(c); setClientSearch(c.name); setShowClientDrop(false); }}
                        className="flex w-full items-center gap-2.5 rounded-lg p-2 text-right hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900 text-[10px] font-bold text-blue-600 dark:text-blue-300">
                          {c.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{c.name}</p>
                          <p className="text-[11px] text-slate-400" dir="ltr">{c.phone}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Discount controls */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-3">
              <Percent className="h-4 w-4 text-slate-400" />
              <span className="text-xs font-bold uppercase tracking-wide text-slate-400">الخصم</span>
            </div>
            <div className="flex gap-2">
              <Select
                value={discountType}
                onValueChange={(v) => setDiscountType(v as "percentage" | "fixed")}
              >
                <SelectTrigger className="h-9 w-28 rounded-xl border-slate-200 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">نسبة %</SelectItem>
                  <SelectItem value="fixed">مبلغ ثابت</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number" min={0}
                value={discountValue || ""}
                onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="h-9 flex-1 rounded-xl border-slate-200 text-sm text-center"
              />
            </div>
          </div>

          {/* Summary */}
          <div className="p-4 flex-1">
            <div className="space-y-2.5">
              <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                <span>المجموع الفرعي</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400">
                  <span>الخصم</span>
                  <span className="font-medium">− {formatCurrency(discountAmount)}</span>
                </div>
              )}
              {settings.taxEnabled && taxAmount > 0 && (
                <div className="flex justify-between text-sm text-slate-500">
                  <span>ضريبة ({settings.taxRate}%)</span>
                  <span className="font-medium">{formatCurrency(taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-800 dark:text-slate-100">الإجمالي</span>
                <span className="text-xl font-extrabold text-blue-600 dark:text-blue-400">
                  {formatCurrency(total)}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 text-left">{settings.currencySymbol} · {settings.currency}</p>
            </div>
          </div>

          {/* Save actions */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <Button
              className="w-full gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold"
              onClick={() => handleSave("مدفوعة")}
            >
              <Save className="h-4 w-4" />
              حفظ مدفوعة
            </Button>
            <Button
              variant="outline"
              className="w-full gap-2 rounded-xl"
              onClick={() => handleSave("غير مدفوعة")}
            >
              إصدار غير مدفوع
            </Button>
            <Button
              variant="ghost"
              className="w-full gap-2 rounded-xl text-slate-400"
              onClick={() => handleSave("مسودة")}
            >
              حفظ مسودة
            </Button>
          </div>
        </div>
      </div>

      {/* ── Smart Search Overlay ── */}
      {showSearch && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/40 backdrop-blur-sm"
          onClick={() => setShowSearch(false)}
        >
          <div
            className="w-full max-w-2xl mx-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            {/* Search input */}
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 px-4 py-3">
              <Search className="h-4 w-4 text-slate-400 shrink-0" />
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن منتج..."
                className="flex-1 bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none"
              />
              <button onClick={() => setShowSearch(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Category tabs */}
            <div className="flex gap-1 overflow-x-auto border-b border-slate-100 dark:border-slate-800 px-3 py-2 scrollbar-hide">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSearchCategory(cat)}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    searchCategory === cat
                      ? "bg-blue-600 text-white"
                      : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {cat === "all" ? "الكل" : cat}
                </button>
              ))}
            </div>

            <div className="max-h-[50vh] overflow-y-auto">
              {/* Bundles section */}
              {searchCategory === "all" && !searchQuery && bundles.length > 0 && (
                <div>
                  <p className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    <Layers className="h-3.5 w-3.5" /> المجموعات
                  </p>
                  {bundles.map((b) => {
                    const isBroken = b.items.some((bi) => !products.find((p) => p.id === bi.productId));
                    return (
                      <button
                        key={b.id}
                        disabled={isBroken}
                        onClick={() => openBundleDialog(b.id)}
                        className="flex w-full items-center justify-between px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-40"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-base">🎁</span>
                          <div className="text-right">
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{b.name}</p>
                            <p className="text-[11px] text-slate-400">{b.items.length} منتج</p>
                          </div>
                        </div>
                        {isBroken && <Badge variant="outline" className="text-[10px] border-red-200 text-red-500">منتج محذوف</Badge>}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Ink sets section */}
              {searchCategory === "all" && !searchQuery && inkSets.length > 0 && (
                <div>
                  <p className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    <Droplets className="h-3.5 w-3.5" /> طواقم الأحبار
                  </p>
                  {inkSets.map((set) => (
                    <button
                      key={set.baseName}
                      onClick={() => openInkSetDialog(set)}
                      className="flex w-full items-center justify-between px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex -space-x-1 space-x-reverse">
                          {set.items.slice(0, 4).map((p, i) => {
                            const ck = getColorKey(p.name);
                            const cs = COLOR_STYLES[ck];
                            return (
                              <span
                                key={i}
                                className="h-4 w-4 rounded-full border-2 border-white dark:border-slate-900"
                                style={{ background: cs?.dot || "#94a3b8" }}
                              />
                            );
                          })}
                        </div>
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{set.displayName}</span>
                      </div>
                      <span className="text-xs text-slate-400">{set.items.length} لون</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Recent products */}
              {!searchQuery && recentProducts.length > 0 && (
                <div>
                  <p className="px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    المستخدمة مؤخراً
                  </p>
                  {recentProducts.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => addProductFromSearch(p)}
                      disabled={p.stock <= 0}
                      className="flex w-full items-center justify-between px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-40"
                    >
                      <span className="text-sm text-slate-700 dark:text-slate-200">{p.name}</span>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span>{formatCurrency(p.price)}</span>
                        <span className={p.stock <= 0 ? "text-red-400" : "text-emerald-500"}>{p.stock} {p.unit || "عبوة"}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* All products */}
              {filteredProducts.length > 0 && (
                <div>
                  {(!searchQuery && (recentProducts.length > 0 || bundles.length > 0 || inkSets.length > 0)) && (
                    <p className="px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      {searchQuery ? "النتائج" : "جميع المنتجات"}
                    </p>
                  )}
                  {filteredProducts.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => addProductFromSearch(p)}
                      disabled={p.stock <= 0}
                      className="flex w-full items-center justify-between px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-40"
                    >
                      <div className="flex items-center gap-2.5">
                        <Package className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                        <div className="text-right">
                          <p className="text-sm text-slate-700 dark:text-slate-200">{p.name}</p>
                          <p className="text-[11px] text-slate-400">{p.category}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400 shrink-0">
                        <span className="font-medium">{formatCurrency(p.price)}</span>
                        <span className={p.stock <= 0 ? "text-red-400" : p.stock <= 3 ? "text-amber-400" : "text-emerald-500"}>
                          {p.stock <= 0 ? "نفذ" : `${p.stock} ${p.unit || "عبوة"}`}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {filteredProducts.length === 0 && searchQuery && (
                <p className="p-8 text-center text-sm text-slate-400">لا توجد نتائج</p>
              )}

              {/* Add temporary product */}
              <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-3">
                <button
                  onClick={addTempProduct}
                  className="flex items-center gap-2 text-sm text-amber-600 hover:text-amber-700"
                >
                  <Plus className="h-4 w-4" />
                  إضافة منتج مؤقت / غير مسجل
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Bundle dialog ── */}
      <Dialog open={bundleDialogOpen} onOpenChange={setBundleDialogOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              🎁 {bundles.find((b) => b.id === activeBundleId)?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
              {bundles.find((b) => b.id === activeBundleId)?.items.map((bi, i) => {
                const p = products.find((pr) => pr.id === bi.productId);
                const ck = getColorKey(bi.productName);
                const cs = COLOR_STYLES[ck];
                return (
                  <div key={i} className={`flex items-center justify-between px-3 py-2 text-sm ${cs?.bg || ""} ${i > 0 ? "border-t border-slate-100 dark:border-slate-800" : ""}`}>
                    <div className="flex items-center gap-2">
                      {cs
                        ? <span className="h-3 w-3 rounded-full shrink-0" style={{ background: cs.dot }} />
                        : <Package className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      }
                      <span className={cs?.text || "text-slate-700 dark:text-slate-200"}>{p?.name || bi.productName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>×{bi.quantity}</span>
                      {p && <span className={p.stock < bi.quantity ? "text-red-500 font-bold" : "text-emerald-500"}>({p.stock})</span>}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="grid gap-1.5">
              <label className="text-xs font-medium text-slate-500">سعر الطقم</label>
              <Input
                type="number" min={0} step="0.01"
                value={bundleSetPrice}
                onChange={(e) => setBundleSetPrice(e.target.value)}
                className="h-10 rounded-xl text-center text-lg font-bold"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBundleDialogOpen(false)} className="rounded-xl">إلغاء</Button>
            <Button onClick={confirmBundleAdd} className="rounded-xl bg-blue-600 hover:bg-blue-700">إضافة للفاتورة</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Ink Set dialog ── */}
      <Dialog open={inkSetDialogOpen} onOpenChange={setInkSetDialogOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Droplets className="h-4 w-4 text-cyan-500" />
              {activeInkSet?.displayName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
              {activeInkSet?.items.map((p, i) => {
                const ck = getColorKey(p.name);
                const cs = COLOR_STYLES[ck];
                return (
                  <div key={i} className={`flex items-center justify-between px-3 py-2 text-sm ${cs?.bg || ""} ${i > 0 ? "border-t border-slate-100 dark:border-slate-800" : ""}`}>
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full shrink-0" style={{ background: cs?.dot || "#94a3b8" }} />
                      <span className={cs?.text || "text-slate-700"}>{p.name}</span>
                    </div>
                    <span className={`text-xs ${p.stock <= 0 ? "text-red-500 font-bold" : "text-emerald-500"}`}>
                      {p.stock <= 0 ? "نفذ" : `${p.stock} ${p.unit || "عبوة"}`}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="grid gap-1.5">
              <label className="text-xs font-medium text-slate-500">سعر الطقم</label>
              <Input
                type="number" min={0} step="0.01"
                value={inkSetPrice}
                onChange={(e) => setInkSetPrice(e.target.value)}
                className="h-10 rounded-xl text-center text-lg font-bold"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setInkSetDialogOpen(false)} className="rounded-xl">إلغاء</Button>
            <Button onClick={confirmInkSetAdd} className="rounded-xl bg-cyan-600 hover:bg-cyan-700">إضافة للفاتورة</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
