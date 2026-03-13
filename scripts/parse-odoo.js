#!/usr/bin/env node
/**
 * Parse Odoo PostgreSQL dump.sql and extract data into JSON
 * compatible with the Kamal ERP app's localStorage format.
 *
 * Usage: node scripts/parse-odoo.js <path-to-dump.sql> [output.json]
 */

const fs = require("fs");
const path = require("path");

const dumpPath = process.argv[2];
const outputPath = process.argv[3] || path.join(__dirname, "..", "odoo-import.json");

if (!dumpPath) {
  console.error("Usage: node scripts/parse-odoo.js <path-to-dump.sql> [output.json]");
  process.exit(1);
}

console.log(`Reading dump from: ${dumpPath}`);
const sql = fs.readFileSync(dumpPath, "utf-8");

// ============================================
// Generic COPY parser
// ============================================
function parseTable(tableName, sqlText) {
  // Match: COPY public.table_name (col1, col2, ...) FROM stdin;
  const regex = new RegExp(
    `COPY public\\.${tableName}\\s*\\(([^)]+)\\)\\s*FROM stdin;`,
    "m"
  );
  const match = regex.exec(sqlText);
  if (!match) {
    console.warn(`  Table "${tableName}" not found in dump`);
    return [];
  }

  const columns = match[1].split(",").map((c) => c.trim());
  const startIdx = match.index + match[0].length;

  // Find the end marker: a line with just "\."
  const endMarker = "\n\\.\n";
  const endIdx = sqlText.indexOf(endMarker, startIdx);
  if (endIdx === -1) {
    console.warn(`  Could not find end of data for "${tableName}"`);
    return [];
  }

  const dataBlock = sqlText.substring(startIdx, endIdx).trim();
  if (!dataBlock) return [];

  const rows = dataBlock.split("\n").map((line) => {
    const values = line.split("\t");
    const row = {};
    columns.forEach((col, i) => {
      let val = values[i];
      if (val === "\\N") val = null;
      row[col] = val;
    });
    return row;
  });

  console.log(`  ${tableName}: ${rows.length} rows`);
  return rows;
}

// ============================================
// Parse JSON fields from Odoo (e.g. product names)
// ============================================
function parseOdooJson(val) {
  if (!val || val === "\\N") return null;
  try {
    return JSON.parse(val);
  } catch {
    return val;
  }
}

function getProductName(jsonStr) {
  const parsed = parseOdooJson(jsonStr);
  if (!parsed) return "";
  if (typeof parsed === "string") return parsed;
  // Prefer Arabic name, fallback to English
  return parsed["ar_001"] || parsed["en_US"] || Object.values(parsed)[0] || "";
}

function getProductNameEn(jsonStr) {
  const parsed = parseOdooJson(jsonStr);
  if (!parsed) return "";
  if (typeof parsed === "string") return parsed;
  return parsed["en_US"] || "";
}

function getCostPrice(jsonStr) {
  const parsed = parseOdooJson(jsonStr);
  if (!parsed) return 0;
  if (typeof parsed === "number") return parsed;
  // Keyed by company_id, usually "1"
  return parseFloat(parsed["1"]) || 0;
}

// ============================================
// Main
// ============================================
console.log("Parsing Odoo tables...");

const partners = parseTable("res_partner", sql);
const productTemplates = parseTable("product_template", sql);
const productProducts = parseTable("product_product", sql);
const accountMoves = parseTable("account_move", sql);
const accountMoveLines = parseTable("account_move_line", sql);
const saleOrders = parseTable("sale_order", sql);
const saleOrderLines = parseTable("sale_order_line", sql);
const stockQuants = parseTable("stock_quant", sql);
const productCategories = parseTable("product_category", sql);

// ============================================
// Build product template map (tmpl_id -> template)
// ============================================
const tmplMap = {};
for (const t of productTemplates) {
  tmplMap[t.id] = t;
}

// ============================================
// Build product map (product_id -> full product info)
// ============================================
const productMap = {};
for (const pp of productProducts) {
  const tmpl = tmplMap[pp.product_tmpl_id];
  if (!tmpl) continue;
  productMap[pp.id] = { ...pp, tmpl };
}

// ============================================
// Map categories
// ============================================
function mapCategory(catName) {
  if (!catName) return "ملحقات";
  const lower = (catName || "").toLowerCase();
  if (lower.includes("printer") || lower.includes("طابع")) return "طابعة";
  if (lower.includes("ink") || lower.includes("حبر")) return "حبر";
  if (lower.includes("toner") || lower.includes("تونر")) return "تونر";
  if (lower.includes("paper") || lower.includes("ورق")) return "ورق";
  return "ملحقات";
}

function guessCategory(name) {
  const lower = name.toLowerCase();
  if (lower.includes("printer") || lower.includes("طابع")) return "طابعة";
  if (lower.includes("toner") || lower.includes("تونر")) return "تونر";
  if (lower.includes("ink") || lower.includes("حبر") || lower.includes("dye")) return "حبر";
  if (lower.includes("paper") || lower.includes("ورق")) return "ورق";
  if (lower.includes("tank") || lower.includes("خزان")) return "ملحقات";
  return "حبر"; // default for this business
}

// ============================================
// Compute stock from stock_quant
// ============================================
// Stock is positive at warehouse location (typically id=5 or similar)
// We sum all positive quantities per product
const stockMap = {};
for (const sq of stockQuants) {
  const qty = parseFloat(sq.quantity) || 0;
  const prodId = sq.product_id;
  if (qty > 0) {
    stockMap[prodId] = (stockMap[prodId] || 0) + qty;
  }
}

// ============================================
// Build CLIENTS
// ============================================
const clients = partners
  .filter((p) => {
    // Only customers (customer_rank > 0) or companies that aren't the main company
    const rank = parseInt(p.customer_rank) || 0;
    return rank > 0 || p.is_company === "t";
  })
  .filter((p) => {
    // Exclude the company's own record (usually id <= 3 are system records)
    const id = parseInt(p.id);
    return id > 3 && p.name;
  })
  .map((p) => ({
    id: `odoo_c${p.id}`,
    odooId: p.id,
    name: p.name || "",
    phone: p.phone || p.mobile || "",
    address: [p.street, p.city, p.country_id ? "" : ""].filter(Boolean).join(" - ") || "",
    totalSpent: 0, // Will be calculated from invoices
    createdAt: p.create_date ? p.create_date.split(" ")[0] : new Date().toISOString().split("T")[0],
  }));

console.log(`\nMapped ${clients.length} clients`);

// ============================================
// Build PRODUCTS
// ============================================
const products = productProducts
  .filter((pp) => {
    const tmpl = tmplMap[pp.product_tmpl_id];
    return tmpl && tmpl.active !== "f" && pp.active !== "f";
  })
  .map((pp) => {
    const tmpl = tmplMap[pp.product_tmpl_id];
    const nameAr = getProductName(tmpl.name);
    const nameEn = getProductNameEn(tmpl.name);
    const displayName = nameAr || nameEn || "منتج بدون اسم";
    const category = guessCategory(nameEn || nameAr);
    const stock = stockMap[pp.id] || 0;
    const price = parseFloat(tmpl.list_price) || 0;
    const cost = getCostPrice(pp.standard_price);

    return {
      id: `odoo_p${pp.id}`,
      odooId: pp.id,
      name: displayName,
      nameEn: nameEn,
      category,
      price,
      cost,
      stock: Math.max(0, Math.round(stock)),
      unit: "قطعة",
      minStock: 5,
      barcode: pp.barcode || "",
      sku: pp.default_code || "",
      createdAt: pp.create_date ? pp.create_date.split(" ")[0] : new Date().toISOString().split("T")[0],
    };
  });

console.log(`Mapped ${products.length} products`);

// ============================================
// Build partner lookup (odoo_id -> our client id)
// ============================================
const partnerToClient = {};
for (const c of clients) {
  partnerToClient[c.odooId] = c;
}

// Build product lookup (odoo product_id -> our product)
const odooProductToOurs = {};
for (const p of products) {
  odooProductToOurs[p.odooId] = p;
}

// ============================================
// Build INVOICES
// ============================================
const invoices = accountMoves
  .filter((m) => m.move_type === "out_invoice" && m.state !== "cancel")
  .map((m) => {
    const partnerId = m.partner_id;
    const client = partnerToClient[partnerId];
    const clientName = m.invoice_partner_display_name || client?.name || "";
    const clientId = client?.id || `odoo_c${partnerId}`;

    // Get line items for this invoice
    const lines = accountMoveLines.filter(
      (l) => l.move_id === m.id && l.display_type === "product"
    );

    const items = lines.map((l, idx) => {
      const product = odooProductToOurs[l.product_id];
      const productName = l.name || product?.name || "";
      const quantity = parseFloat(l.quantity) || 0;
      const unitPrice = parseFloat(l.price_unit) || 0;
      const discount = parseFloat(l.discount) || 0;
      const subtotal = parseFloat(l.price_subtotal) || 0;

      return {
        id: `odoo_il${l.id}`,
        productId: product?.id || `odoo_p${l.product_id}`,
        productName: productName,
        description: "",
        quantity,
        unitPrice,
        discount,
        total: subtotal,
      };
    });

    const subtotal = parseFloat(m.amount_untaxed) || 0;
    const tax = parseFloat(m.amount_tax) || 0;
    const total = parseFloat(m.amount_total) || 0;
    const isPaid = m.payment_state === "paid" || m.payment_state === "in_payment";
    const isReversed = m.payment_state === "reversed";

    let status;
    if (isReversed) status = "ملغاة";
    else if (isPaid) status = "مدفوعة";
    else if (m.state === "draft") status = "مسودة";
    else status = "غير مدفوعة";

    return {
      id: `odoo_inv${m.id}`,
      odooId: m.id,
      invoiceNumber: m.name || "",
      clientId,
      clientName,
      items,
      subtotal,
      taxAmount: tax,
      discountType: "fixed",
      discountValue: 0,
      discountAmount: 0,
      total,
      status,
      notes: "",
      createdAt: m.invoice_date || m.date || new Date().toISOString().split("T")[0],
    };
  });

console.log(`Mapped ${invoices.length} invoices`);

// Update client totalSpent from paid invoices
for (const inv of invoices) {
  if (inv.status === "مدفوعة") {
    const client = clients.find((c) => c.id === inv.clientId);
    if (client) {
      client.totalSpent += inv.total;
    }
  }
}

// ============================================
// Build ORDERS from sale_order
// ============================================
const orders = saleOrders
  .filter((so) => so.state !== "cancel")
  .map((so, idx) => {
    const partnerId = so.partner_id;
    const client = partnerToClient[partnerId];
    const clientName = client?.name || `عميل ${partnerId}`;
    const clientId = client?.id || `odoo_c${partnerId}`;

    // Get order lines
    const lines = saleOrderLines.filter((l) => l.order_id === so.id);
    const description = lines
      .map((l) => {
        const name = l.name || "";
        const qty = parseFloat(l.product_uom_qty) || 0;
        // Extract first line of name (Odoo puts multi-line descriptions)
        const shortName = name.split("\n")[0].substring(0, 60);
        return `${shortName} × ${qty}`;
      })
      .join("، ");

    const invoiceStatus = so.invoice_status;
    let status;
    if (invoiceStatus === "invoiced") status = "مكتمل";
    else if (so.state === "draft") status = "قيد الانتظار";
    else if (invoiceStatus === "to invoice") status = "جاهز للاستلام";
    else status = "قيد التنفيذ";

    const dateStr = so.date_order ? so.date_order.split(" ")[0] : new Date().toISOString().split("T")[0];

    return {
      id: `odoo_o${so.id}`,
      odooId: so.id,
      trackingId: so.name || `TRK-${String(idx + 1).padStart(3, "0")}`,
      clientId,
      clientName,
      description: description || `طلب بيع ${so.name}`,
      status,
      createdAt: dateStr,
      updatedAt: so.write_date ? so.write_date.split(" ")[0] : dateStr,
    };
  });

console.log(`Mapped ${orders.length} orders`);

// ============================================
// Output
// ============================================
const result = {
  meta: {
    source: "odoo",
    exportedAt: new Date().toISOString(),
    dumpFile: path.basename(dumpPath),
    counts: {
      clients: clients.length,
      products: products.length,
      invoices: invoices.length,
      orders: orders.length,
    },
  },
  clients,
  products,
  invoices,
  orders,
};

fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), "utf-8");
console.log(`\nExport complete! Written to: ${outputPath}`);
console.log(`  Clients: ${clients.length}`);
console.log(`  Products: ${products.length}`);
console.log(`  Invoices: ${invoices.length}`);
console.log(`  Orders: ${orders.length}`);
