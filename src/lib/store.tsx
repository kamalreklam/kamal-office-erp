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

// ==========================================
// Settings Interface
// ==========================================
export interface AppSettings {
  businessName: string;
  businessNameEn: string;
  phone: string;
  address: string;
  logo: string; // base64 data URL
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
  discount: number; // percentage discount on total
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
// localStorage helpers
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

function saveToStorage(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or not available
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

  // Load from localStorage on mount
  useEffect(() => {
    setClients(loadFromStorage("kamal_clients", defaultClients));
    setProducts(loadFromStorage("kamal_products", defaultProducts));
    setInvoices(loadFromStorage("kamal_invoices", defaultInvoices));
    setOrders(loadFromStorage("kamal_orders", defaultOrders));
    setBundles(loadFromStorage("kamal_bundles", []));
    setSettings(loadFromStorage("kamal_settings", defaultSettings));
    setProductImages(loadFromStorage("kamal_product_images", {}));
    setInitialized(true);
  }, []);

  // Save to localStorage on changes
  useEffect(() => {
    if (!initialized) return;
    saveToStorage("kamal_clients", clients);
  }, [clients, initialized]);

  useEffect(() => {
    if (!initialized) return;
    saveToStorage("kamal_products", products);
  }, [products, initialized]);

  useEffect(() => {
    if (!initialized) return;
    saveToStorage("kamal_invoices", invoices);
  }, [invoices, initialized]);

  useEffect(() => {
    if (!initialized) return;
    saveToStorage("kamal_orders", orders);
  }, [orders, initialized]);

  useEffect(() => {
    if (!initialized) return;
    saveToStorage("kamal_bundles", bundles);
  }, [bundles, initialized]);

  useEffect(() => {
    if (!initialized) return;
    saveToStorage("kamal_settings", settings);
  }, [settings, initialized]);

  useEffect(() => {
    if (!initialized) return;
    saveToStorage("kamal_product_images", productImages);
  }, [productImages, initialized]);

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
      return newClient;
    },
    []
  );

  const updateClient = useCallback((id: string, data: Partial<Client>) => {
    setClients((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)));
  }, []);

  const deleteClient = useCallback((id: string) => {
    setClients((prev) => prev.filter((c) => c.id !== id));
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
      if (image) {
        setProductImages((prev) => ({ ...prev, [newProduct.id]: image }));
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
      if (image !== undefined) {
        setProductImages((prev) => ({ ...prev, [id]: image }));
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

      // Auto-deduct stock
      if (data.status !== "مسودة" && data.status !== "ملغاة") {
        setProducts((prev) =>
          prev.map((product) => {
            const invoiceItem = data.items.find(
              (item) => item.productId === product.id
            );
            if (invoiceItem) {
              return {
                ...product,
                stock: Math.max(0, product.stock - invoiceItem.quantity),
              };
            }
            return product;
          })
        );
      }

      // Update client totalSpent
      if (data.status === "مدفوعة") {
        setClients((prev) =>
          prev.map((c) =>
            c.id === data.clientId
              ? { ...c, totalSpent: c.totalSpent + data.total }
              : c
          )
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
    },
    []
  );

  const deleteInvoice = useCallback((id: string) => {
    setInvoices((prev) => prev.filter((inv) => inv.id !== id));
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
      return newOrder;
    },
    [orders.length]
  );

  const updateOrder = useCallback((id: string, data: Partial<Order>) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === id
          ? { ...o, ...data, updatedAt: new Date().toISOString().split("T")[0] }
          : o
      )
    );
  }, []);

  const deleteOrder = useCallback((id: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== id));
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
      return newBundle;
    },
    []
  );

  const updateBundle = useCallback(
    (id: string, data: Partial<ProductBundle>) => {
      setBundles((prev) =>
        prev.map((b) => (b.id === id ? { ...b, ...data } : b))
      );
    },
    []
  );

  const deleteBundle = useCallback((id: string) => {
    setBundles((prev) => prev.filter((b) => b.id !== id));
  }, []);

  // --- Import Odoo Data ---
  const importOdooData = useCallback(
    (data: OdooImportData) => {
      const counts = { clients: 0, products: 0, invoices: 0, orders: 0 };

      // Import clients (merge by id, skip duplicates)
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
          return [...newClients, ...prev];
        });
      }

      // Import products
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
          return [...newProducts, ...prev];
        });
      }

      // Import invoices
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
          return [...newInvoices, ...prev];
        });
      }

      // Import orders
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
          return [...newOrders, ...prev];
        });
      }

      return counts;
    },
    []
  );

  // --- Settings ---
  const updateSettings = useCallback((data: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...data }));
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
