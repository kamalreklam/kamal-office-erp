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
}

const defaultSettings: AppSettings = {
  businessName: "كمال للتجهيزات المكتبية",
  businessNameEn: "Kamal Office Equipment",
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
    category: (r.category || "ملحقات") as Product["category"],
    sku: (r.sku || "") as string,
    description: (r.description || "") as string,
    price: Number(r.price) || 0,
    stock: Number(r.stock) || 0,
    minStock: Number(r.min_stock) || 5,
    unit: (r.unit || "قطعة") as string,
    createdAt: r.created_at as string,
  };
}

function invoiceToRow(inv: Invoice) {
  return {
    id: inv.id,
    invoice_number: inv.invoiceNumber,
    client_id: inv.clientId,
    client_name: inv.clientName,
    items: JSON.stringify(inv.items),
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
  let items = r.items;
  if (typeof items === "string") {
    try { items = JSON.parse(items); } catch { items = []; }
  }
  return {
    id: r.id as string,
    invoiceNumber: r.invoice_number as string,
    clientId: r.client_id as string,
    clientName: r.client_name as string,
    items: (items as Invoice["items"]) || [],
    subtotal: Number(r.subtotal) || 0,
    discountType: (r.discount_type || "fixed") as "percentage" | "fixed",
    discountValue: Number(r.discount_value) || 0,
    discountAmount: Number(r.discount_amount) || 0,
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
            supabase.from("clients").upsert(lsClients.map(clientToRow)).then(() => {});
          }
          if (lsProducts.length > 0) {
            supabase.from("products").upsert(lsProducts.map(productToRow)).then(() => {});
          }
          if (lsInvoices.length > 0) {
            supabase.from("invoices").upsert(lsInvoices.map(invoiceToRow)).then(() => {});
          }
          if (lsOrders.length > 0) {
            supabase.from("orders").upsert(lsOrders.map(orderToRow)).then(() => {});
          }
          if (lsBundles.length > 0) {
            supabase.from("bundles").upsert(lsBundles.map(bundleToRow)).then(() => {});
          }
          supabase.from("app_settings").upsert(settingsToRow(lsSettings)).then(() => {});
          if (Object.keys(lsImages).length > 0) {
            const imageRows = Object.entries(lsImages).map(([productId, imageData]) => ({
              product_id: productId,
              image_data: imageData,
            }));
            supabase.from("product_images").upsert(imageRows).then(() => {});
          }
        }
      } catch {
        // Supabase unavailable — fall back to localStorage
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
        id: `c${Date.now()}`,
        totalSpent: 0,
        createdAt: new Date().toISOString().split("T")[0],
      };
      setClients((prev) => [newClient, ...prev]);
      supabase.from("clients").insert(clientToRow(newClient)).then(() => {});
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
    if (data.totalSpent !== undefined) row.total_spent = data.totalSpent;
    supabase.from("clients").update(row).eq("id", id).then(() => {});
  }, []);

  const deleteClient = useCallback((id: string) => {
    setClients((prev) => prev.filter((c) => c.id !== id));
    supabase.from("clients").delete().eq("id", id).then(() => {});
  }, []);

  // --- Product CRUD ---
  const addProduct = useCallback(
    (data: Omit<Product, "id" | "createdAt"> & { image?: string }): Product => {
      const { image, ...productData } = data;
      const newProduct: Product = {
        ...productData,
        id: `p${Date.now()}`,
        createdAt: new Date().toISOString().split("T")[0],
      };
      setProducts((prev) => [newProduct, ...prev]);
      supabase.from("products").insert(productToRow(newProduct)).then(() => {});
      if (image) {
        setProductImages((prev) => ({ ...prev, [newProduct.id]: image }));
        supabase.from("product_images").upsert({ product_id: newProduct.id, image_data: image }).then(() => {});
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
        supabase.from("products").update(row).eq("id", id).then(() => {});
      }
      if (image !== undefined) {
        setProductImages((prev) => ({ ...prev, [id]: image }));
        supabase.from("product_images").upsert({ product_id: id, image_data: image }).then(() => {});
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
    supabase.from("products").delete().eq("id", id).then(() => {});
    supabase.from("product_images").delete().eq("product_id", id).then(() => {});
  }, []);

  const getProductImage = useCallback(
    (id: string) => productImages[id] || "",
    [productImages]
  );

  // --- Invoice CRUD (with stock deduction) ---
  const nextInvoiceNumber = useCallback(() => {
    const prefix = settings.invoicePrefix || "INV";
    const year = new Date().getFullYear();
    const count = invoices.filter((inv) =>
      inv.invoiceNumber.startsWith(`${prefix}-${year}`)
    ).length;
    return `${prefix}-${year}-${String(count + 1).padStart(3, "0")}`;
  }, [invoices, settings.invoicePrefix]);

  const addInvoice = useCallback(
    (
      data: Omit<Invoice, "id" | "invoiceNumber" | "createdAt">
    ): Invoice => {
      const invoiceNumber = nextInvoiceNumber();
      const newInvoice: Invoice = {
        ...data,
        id: `inv${Date.now()}`,
        invoiceNumber,
        createdAt: new Date().toISOString().split("T")[0],
      };

      setInvoices((prev) => [newInvoice, ...prev]);
      supabase.from("invoices").insert(invoiceToRow(newInvoice)).then(() => {});

      // Auto-deduct stock
      if (data.status !== "مسودة" && data.status !== "ملغاة") {
        setProducts((prev) => {
          const updated = prev.map((product) => {
            const invoiceItem = data.items.find(
              (item) => item.productId === product.id
            );
            if (invoiceItem) {
              const newStock = Math.max(0, product.stock - invoiceItem.quantity);
              supabase.from("products").update({ stock: newStock }).eq("id", product.id).then(() => {});
              return { ...product, stock: newStock };
            }
            return product;
          });
          return updated;
        });
      }

      // Update client totalSpent
      if (data.status === "مدفوعة") {
        setClients((prev) =>
          prev.map((c) => {
            if (c.id === data.clientId) {
              const newTotal = c.totalSpent + data.total;
              supabase.from("clients").update({ total_spent: newTotal }).eq("id", c.id).then(() => {});
              return { ...c, totalSpent: newTotal };
            }
            return c;
          })
        );
      }

      return newInvoice;
    },
    [nextInvoiceNumber]
  );

  const updateInvoiceStatus = useCallback(
    (id: string, status: InvoiceStatus) => {
      setInvoices((prev) =>
        prev.map((inv) => (inv.id === id ? { ...inv, status } : inv))
      );
      supabase.from("invoices").update({ status }).eq("id", id).then(() => {});
    },
    []
  );

  const deleteInvoice = useCallback((id: string) => {
    setInvoices((prev) => prev.filter((inv) => inv.id !== id));
    supabase.from("invoices").delete().eq("id", id).then(() => {});
  }, []);

  // --- Order CRUD ---
  const addOrder = useCallback(
    (
      data: Omit<Order, "id" | "trackingId" | "createdAt" | "updatedAt">
    ): Order => {
      const trackingId = `TRK-${String(orders.length + 1).padStart(3, "0")}`;
      const now = new Date().toISOString().split("T")[0];
      const newOrder: Order = {
        ...data,
        id: `o${Date.now()}`,
        trackingId,
        createdAt: now,
        updatedAt: now,
      };
      setOrders((prev) => [newOrder, ...prev]);
      supabase.from("orders").insert(orderToRow(newOrder)).then(() => {});
      return newOrder;
    },
    [orders.length]
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
    supabase.from("orders").update(row).eq("id", id).then(() => {});
  }, []);

  const deleteOrder = useCallback((id: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== id));
    supabase.from("orders").delete().eq("id", id).then(() => {});
  }, []);

  // --- Bundles ---
  const addBundle = useCallback(
    (data: Omit<ProductBundle, "id" | "createdAt">): ProductBundle => {
      const newBundle: ProductBundle = {
        ...data,
        id: `b${Date.now()}`,
        createdAt: new Date().toISOString().split("T")[0],
      };
      setBundles((prev) => [newBundle, ...prev]);
      supabase.from("bundles").insert(bundleToRow(newBundle)).then(() => {});
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
        supabase.from("bundles").update(row).eq("id", id).then(() => {});
      }
    },
    []
  );

  const deleteBundle = useCallback((id: string) => {
    setBundles((prev) => prev.filter((b) => b.id !== id));
    supabase.from("bundles").delete().eq("id", id).then(() => {});
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
              totalSpent: c.totalSpent || 0,
              createdAt: c.createdAt || new Date().toISOString().split("T")[0],
            }));
          counts.clients = newClients.length;
          if (newClients.length > 0) {
            supabase.from("clients").upsert(newClients.map(clientToRow)).then(() => {});
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
              category: (p.category || "ملحقات") as Product["category"],
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
            supabase.from("products").upsert(newProducts.map(productToRow)).then(() => {});
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
              total: i.total,
              status: (i.status || "غير مدفوعة") as InvoiceStatus,
              notes: i.notes || "",
              createdAt: i.createdAt || new Date().toISOString().split("T")[0],
            }));
          counts.invoices = newInvoices.length;
          if (newInvoices.length > 0) {
            supabase.from("invoices").upsert(newInvoices.map(invoiceToRow)).then(() => {});
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
            supabase.from("orders").upsert(newOrders.map(orderToRow)).then(() => {});
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
      supabase.from("app_settings").upsert(settingsToRow(updated)).then(() => {});
      return updated;
    });
  }, []);

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
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
