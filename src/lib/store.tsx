"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  clients as defaultClients,
  products as defaultProducts,
  invoices as defaultInvoices,
  orders as defaultOrders,
  type Client,
  type Product,
  type Invoice,
  type Order,
  type InvoiceStatus,
  type OrderStatus,
} from "./data";
import { supabase } from "./supabase";
import { toast } from "sonner";

// Supabase call with error toast — returns promise for awaiting critical ops
async function dbExec(promise: PromiseLike<{ error: { message: string } | null }>): Promise<boolean> {
  const res = await promise;
  if (res.error) {
    toast.error(`خطأ في المزامنة: ${res.error.message}`);
    return false;
  }
  return true;
}

// ==========================================
// Settings Interface
// ==========================================
export interface AppSettings {
  businessName: string;
  businessNameEn: string;
  phone: string;
  address: string;
  logo: string;
  currency: string;
  currencySymbol: string;
  taxRate: number;
  taxEnabled: boolean;
  invoicePrefix: string;
  invoiceNotes: string;
  lowStockWarning: boolean;
  primaryColor: string;
  customInvoiceHtml: string;
  productCategories: string[];
}

const defaultSettings: AppSettings = {
  businessName: "كمال للتجهيزات المكتبية",
  businessNameEn: "Kamal Copy Center",
  phone: "0912345678",
  address: "حلب - سوريا",
  logo: "",
  currency: "USD",
  currencySymbol: "$",
  taxRate: 0,
  taxEnabled: false,
  invoicePrefix: "INV",
  invoiceNotes: "شكراً لتعاملكم معنا",
  lowStockWarning: true,
  primaryColor: "#2563eb",
  customInvoiceHtml: "",
  productCategories: ["طابعة", "حبر", "تونر", "ورق", "ملحقات"],
};

// ==========================================
// Product Bundle Interface
// ==========================================
export interface BundleItem {
  productId: string;
  productName: string;
  quantity: number;
}

export interface ProductBundle {
  id: string;
  name: string;
  description: string;
  items: BundleItem[];
  discount: number;
  createdAt: string;
}

// ==========================================
// Odoo Import Interface
// ==========================================
export interface OdooImportData {
  meta?: { source: string; counts: Record<string, number> };
  clients: Array<{
    id: string;
    name: string;
    phone: string;
    address: string;
    totalSpent: number;
    createdAt: string;
  }>;
  products: Array<{
    id: string;
    name: string;
    nameEn?: string;
    category: string;
    price: number;
    cost?: number;
    stock: number;
    unit: string;
    minStock: number;
    barcode?: string;
    sku?: string;
    createdAt: string;
  }>;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    clientId: string;
    clientName: string;
    items: Array<{
      id: string;
      productId: string;
      productName: string;
      description: string;
      quantity: number;
      unitPrice: number;
      discount?: number;
      total: number;
    }>;
    subtotal: number;
    taxAmount?: number;
    discountType: string;
    discountValue: number;
    discountAmount: number;
    total: number;
    status: string;
    notes: string;
    createdAt: string;
  }>;
  orders: Array<{
    id: string;
    trackingId: string;
    clientId: string;
    clientName: string;
    description: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  }>;
}

// ==========================================
// Store Interface
// ==========================================
interface StoreContextType {
  // Data
  clients: Client[];
  products: Product[];
  invoices: Invoice[];
  orders: Order[];
  bundles: ProductBundle[];
  settings: AppSettings;

  // Client CRUD
  addClient: (client: Omit<Client, "id" | "createdAt" | "totalSpent">) => Client;
  updateClient: (id: string, data: Partial<Client>) => void;
  deleteClient: (id: string) => void;

  // Product CRUD
  addProduct: (product: Omit<Product, "id" | "createdAt"> & { image?: string }) => Product;
  updateProduct: (id: string, data: Partial<Product> & { image?: string }) => void;
  deleteProduct: (id: string) => void;
  getProductImage: (id: string) => string;

  // Invoice CRUD
  addInvoice: (invoice: Omit<Invoice, "id" | "invoiceNumber" | "createdAt">) => Invoice;
  updateInvoice: (id: string, data: Omit<Invoice, "id" | "invoiceNumber" | "createdAt">) => void;
  updateInvoiceStatus: (id: string, status: InvoiceStatus) => void;
  deleteInvoice: (id: string) => void;

  // Order CRUD
  addOrder: (order: Omit<Order, "id" | "trackingId" | "createdAt" | "updatedAt">) => Order;
  updateOrder: (id: string, data: Partial<Order>) => void;
  deleteOrder: (id: string) => void;

  // Bundles
  addBundle: (bundle: Omit<ProductBundle, "id" | "createdAt">) => ProductBundle;
  updateBundle: (id: string, data: Partial<ProductBundle>) => void;
  deleteBundle: (id: string) => void;

  // Settings
  updateSettings: (data: Partial<AppSettings>) => void;

  // Import
  importOdooData: (data: OdooImportData) => { clients: number; products: number; invoices: number; orders: number };

  // Helpers
  nextInvoiceNumber: () => string;
  connectionStatus: "connected" | "offline" | "loading";
}

const StoreContext = createContext<StoreContextType | null>(null);

// ==========================================
// Supabase helpers — map between camelCase (app) and snake_case (DB)
// ==========================================

function clientToRow(c: Client) {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    address: c.address,
    total_spent: c.totalSpent,
    created_at: c.createdAt,
  };
}

function rowToClient(r: Record<string, unknown>): Client {
  return {
    id: r.id as string,
    name: r.name as string,
    phone: r.phone as string,
    address: r.address as string,
    notes: (r.notes || "") as string,
    totalSpent: Number(r.total_spent) || 0,
    createdAt: r.created_at as string,
  };
}

function productToRow(p: Product) {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    sku: p.sku,
    description: p.description,
    price: p.price,
    stock: p.stock,
    min_stock: p.minStock,
    unit: p.unit,
    created_at: p.createdAt,
  };
}

function rowToProduct(r: Record<string, unknown>): Product {
  return {
    id: r.id as string,
    name: r.name as string,
    category: (r.category || "ملحقات") as string,
    sku: (r.sku || "") as string,
    description: (r.description || "") as string,
    price: Number(r.price) || 0,
    stock: Number(r.stock) || 0,
    minStock: Number(r.min_stock) || 5,
    unit: (r.unit || "قطعة") as string,
    createdAt: r.created_at as string,
  };
}

// NOTE: tax_amount is stored inside the JSON `items` field as a top-level property
// until the column is added to Supabase via:
//   ALTER TABLE invoices ADD COLUMN tax_amount numeric DEFAULT 0;
function invoiceToRow(inv: Invoice) {
  // Embed taxAmount in items JSON so it survives round-trip
  const itemsWithMeta = { _items: inv.items, _taxAmount: inv.taxAmount ?? 0 };
  return {
    id: inv.id,
    invoice_number: inv.invoiceNumber,
    client_id: inv.clientId,
    client_name: inv.clientName,
    items: JSON.stringify(itemsWithMeta),
    subtotal: inv.subtotal,
    discount_type: inv.discountType,
    discount_value: inv.discountValue,
    discount_amount: inv.discountAmount,
    total: inv.total,
    status: inv.status,
    notes: inv.notes,
    created_at: inv.createdAt,
  };
}

function rowToInvoice(r: Record<string, unknown>): Invoice {
  let parsed = r.items;
  if (typeof parsed === "string") {
    try { parsed = JSON.parse(parsed); } catch { parsed = []; }
  }
  // Handle embedded meta format { _items: [...], _taxAmount: N }
  let items: Invoice["items"];
  let taxFromItems = 0;
  if (parsed && typeof parsed === "object" && "_items" in (parsed as Record<string, unknown>)) {
    const meta = parsed as { _items: Invoice["items"]; _taxAmount?: number };
    items = meta._items || [];
    taxFromItems = meta._taxAmount ?? 0;
  } else {
    items = (parsed as Invoice["items"]) || [];
  }
  // Prefer DB column if it exists, otherwise use embedded value
  const taxAmount = r.tax_amount !== undefined ? Number(r.tax_amount) || 0 : taxFromItems;

  return {
    id: r.id as string,
    invoiceNumber: r.invoice_number as string,
    clientId: r.client_id as string,
    clientName: r.client_name as string,
    items,
    subtotal: Number(r.subtotal) || 0,
    discountType: (r.discount_type || "fixed") as "percentage" | "fixed",
    discountValue: Number(r.discount_value) || 0,
    discountAmount: Number(r.discount_amount) || 0,
    taxAmount,
    total: Number(r.total) || 0,
    status: (r.status || "غير مدفوعة") as InvoiceStatus,
    notes: (r.notes || "") as string,
    createdAt: r.created_at as string,
  };
}

function orderToRow(o: Order) {
  return {
    id: o.id,
    tracking_id: o.trackingId,
    client_id: o.clientId,
    client_name: o.clientName,
    description: o.description,
    status: o.status,
    created_at: o.createdAt,
    updated_at: o.updatedAt,
  };
}

function rowToOrder(r: Record<string, unknown>): Order {
  return {
    id: r.id as string,
    trackingId: r.tracking_id as string,
    clientId: r.client_id as string,
    clientName: r.client_name as string,
    description: (r.description || "") as string,
    status: (r.status || "قيد الانتظار") as OrderStatus,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function bundleToRow(b: ProductBundle) {
  return {
    id: b.id,
    name: b.name,
    description: b.description,
    items: JSON.stringify(b.items),
    discount: b.discount,
    created_at: b.createdAt,
  };
}

function rowToBundle(r: Record<string, unknown>): ProductBundle {
  let items = r.items;
  if (typeof items === "string") {
    try { items = JSON.parse(items); } catch { items = []; }
  }
  return {
    id: r.id as string,
    name: r.name as string,
    description: (r.description || "") as string,
    items: (items as BundleItem[]) || [],
    discount: Number(r.discount) || 0,
    createdAt: r.created_at as string,
  };
}

function settingsToRow(s: AppSettings) {
  return {
    id: "default",
    business_name: s.businessName,
    business_name_en: s.businessNameEn,
    phone: s.phone,
    address: s.address,
    logo: s.logo,
    currency: s.currency,
    currency_symbol: s.currencySymbol,
    tax_rate: s.taxRate,
    tax_enabled: s.taxEnabled,
    invoice_prefix: s.invoicePrefix,
    invoice_notes: s.invoiceNotes,
    low_stock_warning: s.lowStockWarning,
    primary_color: s.primaryColor,
    custom_invoice_html: s.customInvoiceHtml,
  };
}

function rowToSettings(r: Record<string, unknown>): AppSettings {
  return {
    businessName: (r.business_name || defaultSettings.businessName) as string,
    businessNameEn: (r.business_name_en || defaultSettings.businessNameEn) as string,
    phone: (r.phone || defaultSettings.phone) as string,
    address: (r.address || defaultSettings.address) as string,
    logo: (r.logo || "") as string,
    currency: (r.currency || "USD") as string,
    currencySymbol: (r.currency_symbol || "$") as string,
    taxRate: Number(r.tax_rate) || 0,
    taxEnabled: r.tax_enabled as boolean ?? false,
    invoicePrefix: (r.invoice_prefix || "INV") as string,
    invoiceNotes: (r.invoice_notes || defaultSettings.invoiceNotes) as string,
    lowStockWarning: r.low_stock_warning as boolean ?? true,
    primaryColor: (r.primary_color || "#2563eb") as string,
    customInvoiceHtml: (r.custom_invoice_html || "") as string,
    productCategories: defaultSettings.productCategories,
  };
}

// ==========================================
// localStorage helpers (for migration fallback)
// ==========================================
function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

// ==========================================
// Provider
// ==========================================
export function StoreProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [bundles, setBundles] = useState<ProductBundle[]>([]);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [productImages, setProductImages] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "offline" | "loading">("loading");

  // Load from Supabase on mount, fallback to localStorage for migration
  useEffect(() => {
    async function loadData() {
      try {
        // Fetch all data from Supabase in parallel
        const [
          clientsRes,
          productsRes,
          invoicesRes,
          ordersRes,
          bundlesRes,
          settingsRes,
          imagesRes,
        ] = await Promise.all([
          supabase.from("clients").select("*"),
          supabase.from("products").select("*"),
          supabase.from("invoices").select("*"),
          supabase.from("orders").select("*"),
          supabase.from("bundles").select("*"),
          supabase.from("app_settings").select("*").eq("id", "default").single(),
          supabase.from("product_images").select("*"),
        ]);

        const dbClients = (clientsRes.data || []).map(rowToClient);
        const dbProducts = (productsRes.data || []).map(rowToProduct);
        const dbInvoices = (invoicesRes.data || []).map(rowToInvoice);
        const dbOrders = (ordersRes.data || []).map(rowToOrder);
        const dbBundles = (bundlesRes.data || []).map(rowToBundle);
        const dbSettings = settingsRes.data ? rowToSettings(settingsRes.data) : null;
        const dbImages: Record<string, string> = {};
        (imagesRes.data || []).forEach((row: { product_id: string; image_data: string }) => {
          dbImages[row.product_id] = row.image_data;
        });

        // If Supabase has data, use it
        setConnectionStatus("connected");
        if (dbClients.length > 0 || dbProducts.length > 0 || dbInvoices.length > 0) {
          setClients(dbClients);
          setProducts(dbProducts);
          setInvoices(dbInvoices);
          setOrders(dbOrders);
          setBundles(dbBundles);
          setSettings(dbSettings || defaultSettings);
          setProductImages(dbImages);
        } else {
          // Supabase is empty — migrate from localStorage
          const lsClients = loadFromStorage("kamal_clients", defaultClients);
          const lsProducts = loadFromStorage("kamal_products", defaultProducts);
          const lsInvoices = loadFromStorage("kamal_invoices", defaultInvoices);
          const lsOrders = loadFromStorage("kamal_orders", defaultOrders);
          const lsBundles = loadFromStorage<ProductBundle[]>("kamal_bundles", []);
          const lsSettings = loadFromStorage("kamal_settings", defaultSettings);
          const lsImages = loadFromStorage<Record<string, string>>("kamal_product_images", {});

          setClients(lsClients);
          setProducts(lsProducts);
          setInvoices(lsInvoices);
          setOrders(lsOrders);
          setBundles(lsBundles);
          setSettings(lsSettings);
          setProductImages(lsImages);

          // Migrate to Supabase in background
          if (lsClients.length > 0) {
            dbExec(supabase.from("clients").upsert(lsClients.map(clientToRow)));
          }
          if (lsProducts.length > 0) {
            dbExec(supabase.from("products").upsert(lsProducts.map(productToRow)));
          }
          if (lsInvoices.length > 0) {
            dbExec(supabase.from("invoices").upsert(lsInvoices.map(invoiceToRow)));
          }
          if (lsOrders.length > 0) {
            dbExec(supabase.from("orders").upsert(lsOrders.map(orderToRow)));
          }
          if (lsBundles.length > 0) {
            dbExec(supabase.from("bundles").upsert(lsBundles.map(bundleToRow)));
          }
          dbExec(supabase.from("app_settings").upsert(settingsToRow(lsSettings)));
          if (Object.keys(lsImages).length > 0) {
            const imageRows = Object.entries(lsImages).map(([productId, imageData]) => ({
              product_id: productId,
              image_data: imageData,
            }));
            dbExec(supabase.from("product_images").upsert(imageRows));
          }
        }
      } catch {
        // Supabase unavailable — fall back to localStorage
        setConnectionStatus("offline");
        setClients(loadFromStorage("kamal_clients", defaultClients));
        setProducts(loadFromStorage("kamal_products", defaultProducts));
        setInvoices(loadFromStorage("kamal_invoices", defaultInvoices));
        setOrders(loadFromStorage("kamal_orders", defaultOrders));
        setBundles(loadFromStorage("kamal_bundles", []));
        setSettings(loadFromStorage("kamal_settings", defaultSettings));
        setProductImages(loadFromStorage("kamal_product_images", {}));
      }

      setInitialized(true);
    }

    loadData();
  }, []);

  // --- Client CRUD ---
  const addClient = useCallback(
    (data: Omit<Client, "id" | "createdAt" | "totalSpent">): Client => {
      const newClient: Client = {
        ...data,
        notes: data.notes || "",
        id: `c_${crypto.randomUUID()}`,
        totalSpent: 0,
        createdAt: new Date().toISOString().split("T")[0],
      };
      setClients((prev) => [newClient, ...prev]);
      dbExec(supabase.from("clients").insert(clientToRow(newClient)));
      return newClient;
    },
    []
  );

  const updateClient = useCallback((id: string, data: Partial<Client>) => {
    setClients((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)));
    const row: Record<string, unknown> = {};
    if (data.name !== undefined) row.name = data.name;
    if (data.phone !== undefined) row.phone = data.phone;
    if (data.address !== undefined) row.address = data.address;
    if (data.notes !== undefined) row.notes = data.notes;
    if (data.totalSpent !== undefined) row.total_spent = data.totalSpent;
    dbExec(supabase.from("clients").update(row).eq("id", id));
  }, []);

  const deleteClient = useCallback((id: string) => {
    setClients((prev) => prev.filter((c) => c.id !== id));
    dbExec(supabase.from("clients").delete().eq("id", id));
  }, []);

  // --- Product CRUD ---
  const addProduct = useCallback(
    (data: Omit<Product, "id" | "createdAt"> & { image?: string }): Product => {
      const { image, ...productData } = data;
      const newProduct: Product = {
        ...productData,
        id: `p_${crypto.randomUUID()}`,
        createdAt: new Date().toISOString().split("T")[0],
      };
      setProducts((prev) => [newProduct, ...prev]);
      dbExec(supabase.from("products").insert(productToRow(newProduct)));
      if (image) {
        setProductImages((prev) => ({ ...prev, [newProduct.id]: image }));
        dbExec(supabase.from("product_images").upsert({ product_id: newProduct.id, image_data: image }));
      }
      return newProduct;
    },
    []
  );

  const updateProduct = useCallback(
    (id: string, data: Partial<Product> & { image?: string }) => {
      const { image, ...productData } = data;
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...productData } : p))
      );
      const row: Record<string, unknown> = {};
      if (productData.name !== undefined) row.name = productData.name;
      if (productData.category !== undefined) row.category = productData.category;
      if (productData.sku !== undefined) row.sku = productData.sku;
      if (productData.description !== undefined) row.description = productData.description;
      if (productData.price !== undefined) row.price = productData.price;
      if (productData.stock !== undefined) row.stock = productData.stock;
      if (productData.minStock !== undefined) row.min_stock = productData.minStock;
      if (productData.unit !== undefined) row.unit = productData.unit;
      if (Object.keys(row).length > 0) {
        dbExec(supabase.from("products").update(row).eq("id", id));
      }
      if (image !== undefined) {
        setProductImages((prev) => ({ ...prev, [id]: image }));
        dbExec(supabase.from("product_images").upsert({ product_id: id, image_data: image }));
      }
    },
    []
  );

  const deleteProduct = useCallback((id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setProductImages((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    dbExec(supabase.from("products").delete().eq("id", id));
    dbExec(supabase.from("product_images").delete().eq("product_id", id));
  }, []);

  const getProductImage = useCallback(
    (id: string) => productImages[id] || "",
    [productImages]
  );

  // --- Invoice CRUD (with stock deduction) ---
  const nextInvoiceNumber = useCallback(() => {
    const prefix = settings.invoicePrefix || "INV";
    const year = new Date().getFullYear();
    const pattern = `${prefix}-${year}-`;
    const maxNum = invoices.reduce((max, inv) => {
      if (inv.invoiceNumber.startsWith(pattern)) {
        const num = parseInt(inv.invoiceNumber.replace(pattern, ""), 10);
        return isNaN(num) ? max : Math.max(max, num);
      }
      return max;
    }, 0);
    return `${pattern}${String(maxNum + 1).padStart(3, "0")}`;
  }, [invoices, settings.invoicePrefix]);

  const addInvoice = useCallback(
    (
      data: Omit<Invoice, "id" | "invoiceNumber" | "createdAt">
    ): Invoice => {
      const invoiceNumber = nextInvoiceNumber();
      const newInvoice: Invoice = {
        ...data,
        id: `inv_${crypto.randomUUID()}`,
        invoiceNumber,
        createdAt: new Date().toISOString().split("T")[0],
      };

      setInvoices((prev) => [newInvoice, ...prev]);

      // Persist to DB — awaited in async IIFE to not block return
      (async () => {
        const insertOk = await dbExec(supabase.from("invoices").insert(invoiceToRow(newInvoice)));
        if (!insertOk) {
          toast.error("فشل حفظ الفاتورة في قاعدة البيانات");
          return;
        }

        // Auto-deduct stock — await all for consistency
        if (data.status !== "مسودة" && data.status !== "ملغاة") {
          const stockUpdates: Promise<boolean>[] = [];
          data.items.forEach(item => {
            if (item.isTemporary) return; // skip temp items
            if (item.isBundle && item.bundleComponents) {
              item.bundleComponents.forEach(comp => {
                const product = products.find(p => p.id === comp.productId);
                if (!product) return;
                const newStock = Math.max(0, product.stock - (comp.quantity * item.quantity));
                stockUpdates.push(dbExec(supabase.from("products").update({ stock: newStock }).eq("id", comp.productId)));
              });
            } else if (item.productId) {
              const product = products.find(p => p.id === item.productId);
              if (!product) return;
              const newStock = Math.max(0, product.stock - item.quantity);
              stockUpdates.push(dbExec(supabase.from("products").update({ stock: newStock }).eq("id", item.productId)));
            }
          });
          const results = await Promise.all(stockUpdates);
          if (results.some(r => !r)) {
            toast.error("تحذير: فشل تحديث بعض كميات المخزون");
          }
        }

        // Update client totalSpent
        if (data.status === "مدفوعة" && data.clientId) {
          const client = clients.find(c => c.id === data.clientId);
          if (client) {
            await dbExec(supabase.from("clients").update({ total_spent: client.totalSpent + data.total }).eq("id", data.clientId));
          }
        }
      })();

      // Optimistic local state updates
      if (data.status !== "مسودة" && data.status !== "ملغاة") {
        data.items.forEach(item => {
          if (item.isTemporary) return; // skip temp items
          if (item.isBundle && item.bundleComponents) {
            // Deduct from each component
            item.bundleComponents.forEach(comp => {
              setProducts(prev => prev.map(p =>
                p.id === comp.productId ? { ...p, stock: Math.max(0, p.stock - (comp.quantity * item.quantity)) } : p
              ));
            });
          } else {
            // Normal product deduction
            setProducts(prev => prev.map(p =>
              p.id === item.productId ? { ...p, stock: Math.max(0, p.stock - item.quantity) } : p
            ));
          }
        });
      }

      if (data.status === "مدفوعة") {
        setClients((prev) =>
          prev.map((c) =>
            c.id === data.clientId ? { ...c, totalSpent: c.totalSpent + data.total } : c
          )
        );
      }

      return newInvoice;
    },
    [nextInvoiceNumber, products, clients]
  );

  // Helper: should this status deduct stock?
  const statusDeductsStock = (s: InvoiceStatus) => s !== "مسودة" && s !== "ملغاة";
  // Helper: should this status count toward totalSpent?
  const statusCountsSpent = (s: InvoiceStatus) => s === "مدفوعة";

  const updateInvoice = useCallback(
    (id: string, data: Omit<Invoice, "id" | "invoiceNumber" | "createdAt">) => {
      const oldInvoice = invoices.find(inv => inv.id === id);

      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === id ? { ...inv, ...data } : inv
        )
      );

      // Stock adjustment: restore old items, deduct new items
      if (oldInvoice) {
        const oldDeducts = statusDeductsStock(oldInvoice.status);
        const newDeducts = statusDeductsStock(data.status);

        // Build a map of productId -> stock delta
        const stockDeltas = new Map<string, number>();
        const applyDelta = (pid: string, delta: number) => {
          stockDeltas.set(pid, (stockDeltas.get(pid) || 0) + delta);
        };

        // Restore old deductions
        if (oldDeducts) {
          oldInvoice.items.forEach(item => {
            if (item.isTemporary) return;
            if (item.isBundle && item.bundleComponents) {
              item.bundleComponents.forEach(comp => applyDelta(comp.productId, comp.quantity * item.quantity));
            } else if (item.productId) {
              applyDelta(item.productId, item.quantity);
            }
          });
        }
        // Apply new deductions
        if (newDeducts) {
          data.items.forEach(item => {
            if (item.isTemporary) return;
            if (item.isBundle && item.bundleComponents) {
              item.bundleComponents.forEach(comp => applyDelta(comp.productId, -(comp.quantity * item.quantity)));
            } else if (item.productId) {
              applyDelta(item.productId, -item.quantity);
            }
          });
        }

        setProducts(prev => prev.map(p => {
          const delta = stockDeltas.get(p.id);
          if (!delta) return p;
          return { ...p, stock: Math.max(0, p.stock + delta) };
        }));

        // totalSpent adjustment — handle client change
        const oldSpent = statusCountsSpent(oldInvoice.status) ? oldInvoice.total : 0;
        const newSpent = statusCountsSpent(data.status) ? data.total : 0;
        const clientChanged = oldInvoice.clientId !== data.clientId;

        if (clientChanged) {
          // Reverse from old client, add to new client
          setClients(prev => prev.map(c => {
            if (c.id === oldInvoice.clientId && oldSpent > 0) return { ...c, totalSpent: Math.max(0, c.totalSpent - oldSpent) };
            if (c.id === data.clientId && newSpent > 0) return { ...c, totalSpent: c.totalSpent + newSpent };
            return c;
          }));
        } else {
          const spentDiff = newSpent - oldSpent;
          if (spentDiff !== 0 && data.clientId) {
            setClients(prev => prev.map(c =>
              c.id === data.clientId ? { ...c, totalSpent: Math.max(0, c.totalSpent + spentDiff) } : c
            ));
          }
        }
      }

      // DB update
      (async () => {
        const row = {
          client_id: data.clientId,
          client_name: data.clientName,
          items: JSON.stringify({ _items: data.items, _taxAmount: data.taxAmount ?? 0 }),
          subtotal: data.subtotal,
          discount_type: data.discountType,
          discount_value: data.discountValue,
          discount_amount: data.discountAmount,
          total: data.total,
          status: data.status,
          notes: data.notes,
        };
        await dbExec(supabase.from("invoices").update(row).eq("id", id));

        // Sync stock and client in DB
        if (oldInvoice) {
          // Build a map of productId -> stock delta for DB sync
          const dbStockDeltas = new Map<string, number>();
          const dbApplyDelta = (pid: string, delta: number) => {
            dbStockDeltas.set(pid, (dbStockDeltas.get(pid) || 0) + delta);
          };

          if (statusDeductsStock(oldInvoice.status)) {
            oldInvoice.items.forEach(item => {
              if (item.isTemporary) return;
              if (item.isBundle && item.bundleComponents) {
                item.bundleComponents.forEach(comp => dbApplyDelta(comp.productId, comp.quantity * item.quantity));
              } else if (item.productId) {
                dbApplyDelta(item.productId, item.quantity);
              }
            });
          }
          if (statusDeductsStock(data.status)) {
            data.items.forEach(item => {
              if (item.isTemporary) return;
              if (item.isBundle && item.bundleComponents) {
                item.bundleComponents.forEach(comp => dbApplyDelta(comp.productId, -(comp.quantity * item.quantity)));
              } else if (item.productId) {
                dbApplyDelta(item.productId, -item.quantity);
              }
            });
          }

          for (const [pid, delta] of dbStockDeltas) {
            const p = products.find(pr => pr.id === pid);
            if (!p) continue;
            const stock = Math.max(0, p.stock + delta);
            if (stock !== p.stock) {
              await dbExec(supabase.from("products").update({ stock }).eq("id", pid));
            }
          }

          const oldSpent = statusCountsSpent(oldInvoice.status) ? oldInvoice.total : 0;
          const newSpent = statusCountsSpent(data.status) ? data.total : 0;
          const clientChanged = oldInvoice.clientId !== data.clientId;

          if (clientChanged) {
            if (oldSpent > 0) {
              const oldClient = clients.find(c => c.id === oldInvoice.clientId);
              if (oldClient) await dbExec(supabase.from("clients").update({ total_spent: Math.max(0, oldClient.totalSpent - oldSpent) }).eq("id", oldInvoice.clientId));
            }
            if (newSpent > 0) {
              const newClient = clients.find(c => c.id === data.clientId);
              if (newClient) await dbExec(supabase.from("clients").update({ total_spent: newClient.totalSpent + newSpent }).eq("id", data.clientId));
            }
          } else {
            const spentDiff = newSpent - oldSpent;
            if (spentDiff !== 0 && data.clientId) {
              const client = clients.find(c => c.id === data.clientId);
              if (client) await dbExec(supabase.from("clients").update({ total_spent: Math.max(0, client.totalSpent + spentDiff) }).eq("id", data.clientId));
            }
          }
        }
      })();
    },
    [invoices, products, clients]
  );

  const updateInvoiceStatus = useCallback(
    (id: string, status: InvoiceStatus) => {
      const oldInvoice = invoices.find(inv => inv.id === id);
      if (!oldInvoice) return;
      const oldStatus = oldInvoice.status;

      setInvoices((prev) =>
        prev.map((inv) => (inv.id === id ? { ...inv, status } : inv))
      );

      // Stock: restore if old deducted, deduct if new should
      const oldDeducts = statusDeductsStock(oldStatus);
      const newDeducts = statusDeductsStock(status);
      if (oldDeducts !== newDeducts) {
        const deltas = new Map<string, number>();
        const addDelta = (pid: string, delta: number) => {
          deltas.set(pid, (deltas.get(pid) || 0) + delta);
        };
        oldInvoice.items.forEach(item => {
          if (item.isTemporary) return;
          const sign = oldDeducts && !newDeducts ? 1 : -1; // restore or deduct
          if (item.isBundle && item.bundleComponents) {
            item.bundleComponents.forEach(comp => addDelta(comp.productId, sign * comp.quantity * item.quantity));
          } else if (item.productId) {
            addDelta(item.productId, sign * item.quantity);
          }
        });
        setProducts(prev => prev.map(p => {
          const delta = deltas.get(p.id);
          if (!delta) return p;
          return { ...p, stock: Math.max(0, p.stock + delta) };
        }));
      }

      // totalSpent
      const oldCounts = statusCountsSpent(oldStatus);
      const newCounts = statusCountsSpent(status);
      if (oldCounts !== newCounts) {
        const diff = newCounts ? oldInvoice.total : -oldInvoice.total;
        setClients(prev => prev.map(c =>
          c.id === oldInvoice.clientId ? { ...c, totalSpent: Math.max(0, c.totalSpent + diff) } : c
        ));
      }

      // DB
      (async () => {
        await dbExec(supabase.from("invoices").update({ status }).eq("id", id));

        if (oldDeducts !== newDeducts) {
          const dbDeltas = new Map<string, number>();
          const dbAddDelta = (pid: string, delta: number) => {
            dbDeltas.set(pid, (dbDeltas.get(pid) || 0) + delta);
          };
          oldInvoice.items.forEach(item => {
            if (item.isTemporary) return;
            const sign = oldDeducts && !newDeducts ? 1 : -1;
            if (item.isBundle && item.bundleComponents) {
              item.bundleComponents.forEach(comp => dbAddDelta(comp.productId, sign * comp.quantity * item.quantity));
            } else if (item.productId) {
              dbAddDelta(item.productId, sign * item.quantity);
            }
          });
          for (const [pid, delta] of dbDeltas) {
            const p = products.find(pr => pr.id === pid);
            if (!p) continue;
            const stock = Math.max(0, p.stock + delta);
            await dbExec(supabase.from("products").update({ stock }).eq("id", pid));
          }
        }

        if (oldCounts !== newCounts) {
          const client = clients.find(c => c.id === oldInvoice.clientId);
          if (client) {
            const diff = newCounts ? oldInvoice.total : -oldInvoice.total;
            await dbExec(supabase.from("clients").update({ total_spent: Math.max(0, client.totalSpent + diff) }).eq("id", oldInvoice.clientId));
          }
        }
      })();
    },
    [invoices, products, clients]
  );

  const deleteInvoice = useCallback((id: string) => {
    const invoice = invoices.find(inv => inv.id === id);

    setInvoices((prev) => prev.filter((inv) => inv.id !== id));

    if (invoice) {
      // Restore stock if it was deducted
      if (statusDeductsStock(invoice.status)) {
        const deltas = new Map<string, number>();
        invoice.items.forEach(item => {
          if (item.isTemporary) return;
          if (item.isBundle && item.bundleComponents) {
            item.bundleComponents.forEach(comp => {
              deltas.set(comp.productId, (deltas.get(comp.productId) || 0) + comp.quantity * item.quantity);
            });
          } else if (item.productId) {
            deltas.set(item.productId, (deltas.get(item.productId) || 0) + item.quantity);
          }
        });
        setProducts(prev => prev.map(p => {
          const delta = deltas.get(p.id);
          return delta ? { ...p, stock: p.stock + delta } : p;
        }));
      }
      // Reverse totalSpent if it was counted
      if (statusCountsSpent(invoice.status)) {
        setClients(prev => prev.map(c =>
          c.id === invoice.clientId ? { ...c, totalSpent: Math.max(0, c.totalSpent - invoice.total) } : c
        ));
      }

      // DB
      (async () => {
        await dbExec(supabase.from("invoices").delete().eq("id", id));
        if (statusDeductsStock(invoice.status)) {
          const dbDeltas = new Map<string, number>();
          invoice.items.forEach(item => {
            if (item.isTemporary) return;
            if (item.isBundle && item.bundleComponents) {
              item.bundleComponents.forEach(comp => {
                dbDeltas.set(comp.productId, (dbDeltas.get(comp.productId) || 0) + comp.quantity * item.quantity);
              });
            } else if (item.productId) {
              dbDeltas.set(item.productId, (dbDeltas.get(item.productId) || 0) + item.quantity);
            }
          });
          for (const [pid, delta] of dbDeltas) {
            const p = products.find(pr => pr.id === pid);
            if (p) {
              await dbExec(supabase.from("products").update({ stock: p.stock + delta }).eq("id", pid));
            }
          }
        }
        if (statusCountsSpent(invoice.status) && invoice.clientId) {
          const client = clients.find(c => c.id === invoice.clientId);
          if (client) {
            await dbExec(supabase.from("clients").update({ total_spent: Math.max(0, client.totalSpent - invoice.total) }).eq("id", invoice.clientId));
          }
        }
      })();
    }
  }, [invoices, products, clients]);

  // --- Order CRUD ---
  const addOrder = useCallback(
    (
      data: Omit<Order, "id" | "trackingId" | "createdAt" | "updatedAt">
    ): Order => {
      const maxNum = orders.reduce((max, o) => {
        const m = o.trackingId.match(/TRK-(\d+)/);
        return m ? Math.max(max, parseInt(m[1], 10)) : max;
      }, 0);
      const trackingId = `TRK-${String(maxNum + 1).padStart(3, "0")}`;
      const now = new Date().toISOString().split("T")[0];
      const newOrder: Order = {
        ...data,
        id: `o_${crypto.randomUUID()}`,
        trackingId,
        createdAt: now,
        updatedAt: now,
      };
      setOrders((prev) => [newOrder, ...prev]);
      dbExec(supabase.from("orders").insert(orderToRow(newOrder)));
      return newOrder;
    },
    [orders]
  );

  const updateOrder = useCallback((id: string, data: Partial<Order>) => {
    const updatedAt = new Date().toISOString().split("T")[0];
    setOrders((prev) =>
      prev.map((o) =>
        o.id === id ? { ...o, ...data, updatedAt } : o
      )
    );
    const row: Record<string, unknown> = { updated_at: updatedAt };
    if (data.clientId !== undefined) row.client_id = data.clientId;
    if (data.clientName !== undefined) row.client_name = data.clientName;
    if (data.description !== undefined) row.description = data.description;
    if (data.status !== undefined) row.status = data.status;
    dbExec(supabase.from("orders").update(row).eq("id", id));
  }, []);

  const deleteOrder = useCallback((id: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== id));
    dbExec(supabase.from("orders").delete().eq("id", id));
  }, []);

  // --- Bundles ---
  const addBundle = useCallback(
    (data: Omit<ProductBundle, "id" | "createdAt">): ProductBundle => {
      const newBundle: ProductBundle = {
        ...data,
        id: `b_${crypto.randomUUID()}`,
        createdAt: new Date().toISOString().split("T")[0],
      };
      setBundles((prev) => [newBundle, ...prev]);
      dbExec(supabase.from("bundles").insert(bundleToRow(newBundle)));
      return newBundle;
    },
    []
  );

  const updateBundle = useCallback(
    (id: string, data: Partial<ProductBundle>) => {
      setBundles((prev) =>
        prev.map((b) => (b.id === id ? { ...b, ...data } : b))
      );
      const row: Record<string, unknown> = {};
      if (data.name !== undefined) row.name = data.name;
      if (data.description !== undefined) row.description = data.description;
      if (data.items !== undefined) row.items = JSON.stringify(data.items);
      if (data.discount !== undefined) row.discount = data.discount;
      if (Object.keys(row).length > 0) {
        dbExec(supabase.from("bundles").update(row).eq("id", id));
      }
    },
    []
  );

  const deleteBundle = useCallback((id: string) => {
    setBundles((prev) => prev.filter((b) => b.id !== id));
    dbExec(supabase.from("bundles").delete().eq("id", id));
  }, []);

  // --- Import Odoo Data ---
  const importOdooData = useCallback(
    (data: OdooImportData) => {
      const counts = { clients: 0, products: 0, invoices: 0, orders: 0 };

      if (data.clients?.length) {
        setClients((prev) => {
          const existingIds = new Set(prev.map((c) => c.id));
          const newClients = data.clients
            .filter((c) => !existingIds.has(c.id))
            .map((c) => ({
              id: c.id,
              name: c.name,
              phone: c.phone || "",
              address: c.address || "",
              notes: "",
              totalSpent: c.totalSpent || 0,
              createdAt: c.createdAt || new Date().toISOString().split("T")[0],
            }));
          counts.clients = newClients.length;
          if (newClients.length > 0) {
            dbExec(supabase.from("clients").upsert(newClients.map(clientToRow)));
          }
          return [...newClients, ...prev];
        });
      }

      if (data.products?.length) {
        setProducts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newProducts = data.products
            .filter((p) => !existingIds.has(p.id))
            .map((p) => ({
              id: p.id,
              name: p.name,
              category: (p.category || "ملحقات") as string,
              sku: p.sku || "",
              description: p.nameEn || "",
              price: p.price || 0,
              stock: p.stock || 0,
              unit: p.unit || "قطعة",
              minStock: p.minStock || 5,
              createdAt: p.createdAt || new Date().toISOString().split("T")[0],
            }));
          counts.products = newProducts.length;
          if (newProducts.length > 0) {
            dbExec(supabase.from("products").upsert(newProducts.map(productToRow)));
          }
          return [...newProducts, ...prev];
        });
      }

      if (data.invoices?.length) {
        setInvoices((prev) => {
          const existingIds = new Set(prev.map((i) => i.id));
          const newInvoices = data.invoices
            .filter((i) => !existingIds.has(i.id))
            .map((i) => ({
              id: i.id,
              invoiceNumber: i.invoiceNumber,
              clientId: i.clientId,
              clientName: i.clientName,
              items: i.items.map((item) => ({
                id: item.id,
                productId: item.productId,
                productName: item.productName,
                description: item.description || "",
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                total: item.total,
              })),
              subtotal: i.subtotal,
              discountType: (i.discountType || "fixed") as "percentage" | "fixed",
              discountValue: i.discountValue || 0,
              discountAmount: i.discountAmount || 0,
              taxAmount: i.taxAmount ?? 0,
              total: i.total,
              status: (i.status || "غير مدفوعة") as InvoiceStatus,
              notes: i.notes || "",
              createdAt: i.createdAt || new Date().toISOString().split("T")[0],
            }));
          counts.invoices = newInvoices.length;
          if (newInvoices.length > 0) {
            dbExec(supabase.from("invoices").upsert(newInvoices.map(invoiceToRow)));
          }
          return [...newInvoices, ...prev];
        });
      }

      if (data.orders?.length) {
        setOrders((prev) => {
          const existingIds = new Set(prev.map((o) => o.id));
          const newOrders = data.orders
            .filter((o) => !existingIds.has(o.id))
            .map((o) => ({
              id: o.id,
              trackingId: o.trackingId,
              clientId: o.clientId,
              clientName: o.clientName,
              description: o.description,
              status: (o.status || "قيد الانتظار") as OrderStatus,
              createdAt: o.createdAt || new Date().toISOString().split("T")[0],
              updatedAt: o.updatedAt || new Date().toISOString().split("T")[0],
            }));
          counts.orders = newOrders.length;
          if (newOrders.length > 0) {
            dbExec(supabase.from("orders").upsert(newOrders.map(orderToRow)));
          }
          return [...newOrders, ...prev];
        });
      }

      return counts;
    },
    []
  );

  // --- Settings ---
  const updateSettings = useCallback((data: Partial<AppSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...data };
      dbExec(supabase.from("app_settings").upsert(settingsToRow(updated)));
      return updated;
    });
  }, []);

  if (!initialized) {
    return (
      <div className="min-h-screen bg-background">
        <div className="lg:mr-[272px]">
          {/* Skeleton header */}
          <div className="sticky top-0 z-30 border-b border-border/60 bg-white/80 backdrop-blur-md">
            <div className="flex h-16 items-center justify-between px-5 md:px-7 lg:px-10">
              <div className="h-5 w-40 animate-pulse rounded-lg bg-muted" />
              <div className="h-9 w-9 animate-pulse rounded-xl bg-muted" />
            </div>
          </div>
          {/* Skeleton content */}
          <div className="p-5 md:p-7 lg:p-10 space-y-6">
            <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
            <div className="h-4 w-72 animate-pulse rounded-lg bg-muted" />
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="h-64 animate-pulse rounded-2xl bg-muted" />
              <div className="h-64 animate-pulse rounded-2xl bg-muted" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <StoreContext.Provider
      value={{
        clients,
        products,
        invoices,
        orders,
        bundles,
        settings,
        addClient,
        updateClient,
        deleteClient,
        addProduct,
        updateProduct,
        deleteProduct,
        getProductImage,
        addInvoice,
        updateInvoice,
        updateInvoiceStatus,
        deleteInvoice,
        addOrder,
        updateOrder,
        deleteOrder,
        addBundle,
        updateBundle,
        deleteBundle,
        updateSettings,
        importOdooData,
        nextInvoiceNumber,
        connectionStatus,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
