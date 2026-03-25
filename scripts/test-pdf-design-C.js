const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

const s = createClient(
  "https://pajjacoachbzjsdzoheg.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhamphY29hY2hiempzZHpvaGVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzOTg3NTYsImV4cCI6MjA4ODk3NDc1Nn0.Xa2rU5ViGIgupJDSyt90PVKlD5aSWKRCf4oLjqEik_A"
);

function fmt(n) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function main() {
  const { data: inv } = await s.from("invoices").select("*").eq("invoice_number", "INV-S00047").single();
  if (!inv) { console.log("Invoice not found"); return; }

  let items = inv.items;
  if (typeof items === "string") try { items = JSON.parse(items); } catch { items = []; }
  const realItems = items._items || items;
  const dateStr = inv.created_at.split("-").reverse().join("/");

  console.log(`Invoice: ${inv.invoice_number} | Client: ${inv.client_name} | Items: ${realItems.length} | Total: ${fmt(inv.total)}`);

  const rows = realItems.map((item, i) =>
    `<tr><td class="idx">${i + 1}</td><td class="desc">${item.productName}</td><td class="qty">${item.quantity}</td><td class="price">${fmt(item.unitPrice)}</td><td class="amt">${fmt(item.total)}</td></tr>`
  ).join("\n");

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
@page { size: A4; margin: 0; }
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Cairo', sans-serif;
  font-size: 10px;
  color: #2D3436;
  background: #F5F5F5;
  direction: rtl;
  padding: 28px 32px;
}

/* ── Card base ── */
.card {
  background: #FFFFFF;
  border: 1px solid #E0E0E0;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  margin-bottom: 14px;
  overflow: hidden;
}

/* ── Header card ── */
.header-card {
  padding: 20px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.brand {
  display: flex;
  align-items: center;
  gap: 14px;
}

.brand img {
  height: 46px;
}

.brand-text .name-ar {
  font-size: 15px;
  font-weight: 800;
  color: #2D3436;
}

.brand-text .name-en {
  font-size: 8px;
  color: #636E72;
  letter-spacing: 1.2px;
  font-weight: 600;
  margin-top: 1px;
}

.brand-text .addr {
  font-size: 7px;
  color: #B2BEC3;
  margin-top: 2px;
}

.inv-badge {
  background: linear-gradient(135deg, #29ABE2, #1B8AC2);
  border-radius: 10px;
  padding: 12px 22px;
  text-align: center;
  color: #FFFFFF;
}

.inv-badge .lbl {
  font-size: 7px;
  font-weight: 700;
  letter-spacing: 1.5px;
  opacity: 0.85;
  margin-bottom: 2px;
}

.inv-badge .num {
  font-family: 'Inter', sans-serif;
  font-size: 17px;
  font-weight: 700;
  direction: ltr;
  text-shadow: 0 0 20px rgba(255,255,255,0.3);
}

.inv-badge .date {
  font-size: 8.5px;
  opacity: 0.8;
  margin-top: 2px;
}

/* ── Client card ── */
.client-card {
  padding: 16px 24px;
}

.client-card .card-title {
  font-size: 8px;
  font-weight: 700;
  color: #B2BEC3;
  letter-spacing: 1px;
  margin-bottom: 10px;
}

.client-fields {
  display: flex;
  gap: 32px;
}

.client-field {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
}

.client-field .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #29ABE2;
  flex-shrink: 0;
}

.client-field .label {
  color: #636E72;
  font-weight: 600;
  font-size: 9px;
}

.client-field .value {
  font-weight: 700;
  color: #2D3436;
}

/* ── Items card ── */
.items-card {
  padding: 0;
}

.items-card .card-title {
  font-size: 8px;
  font-weight: 700;
  color: #B2BEC3;
  letter-spacing: 1px;
  padding: 14px 24px 0;
  margin-bottom: 10px;
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead th {
  background: #29ABE2;
  color: #FFFFFF;
  padding: 8px 12px;
  font-size: 8.5px;
  font-weight: 700;
  text-align: right;
  white-space: nowrap;
}

thead th:first-child {
  text-align: center;
  width: 28px;
}

thead th:last-child {
  text-align: left;
}

tbody td {
  padding: 7px 12px;
  border-bottom: 1px solid #F0F0F0;
  white-space: nowrap;
  font-size: 10px;
}

tbody tr:last-child td {
  border-bottom: none;
}

.idx { text-align: center; color: #B2BEC3; font-size: 9px; }
.desc { white-space: normal !important; font-weight: 600; max-width: 240px; }
.qty { text-align: center; }
.price { text-align: center; font-family: 'Inter', monospace; font-size: 10px; }
.amt { text-align: left; font-family: 'Inter', monospace; font-weight: 700; font-size: 10px; }

/* ── Totals card ── */
.totals-card {
  padding: 16px 24px;
}

.totals-card .card-title {
  font-size: 8px;
  font-weight: 700;
  color: #B2BEC3;
  letter-spacing: 1px;
  margin-bottom: 10px;
}

.totals-inner {
  width: 260px;
}

.tot-row {
  display: flex;
  justify-content: space-between;
  padding: 7px 0;
  border-bottom: 1px solid #F0F0F0;
}

.tot-row:last-child {
  border-bottom: none;
}

.tot-row .lbl {
  font-size: 9px;
  color: #636E72;
}

.tot-row .val {
  font-family: 'Inter', monospace;
  font-size: 10px;
  font-weight: 700;
}

.grand-row {
  background: linear-gradient(135deg, #29ABE2, #1B8AC2);
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  margin-top: 8px;
}

.grand-row .lbl {
  color: rgba(255,255,255,0.85);
  font-weight: 700;
  font-size: 10px;
}

.grand-row .val {
  color: #FFFFFF;
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  font-weight: 700;
}

/* ── Footer ── */
.footer {
  text-align: center;
  padding: 8px 0 0;
}

.footer span {
  font-size: 7.5px;
  color: #B2BEC3;
}
</style>
</head>
<body>

<!-- Header Card -->
<div class="card header-card">
  <div class="brand">
    <img src="http://localhost:3001/logo.png" onerror="this.outerHTML=''" />
    <div class="brand-text">
      <div class="name-ar">برينتكس للأحبار ولوازم الطباعة</div>
      <div class="name-en">PRINTIX — INKS & PRINTING SUPPLIES</div>
      <div class="addr">الجميلية - حلب - سوريا &nbsp;|&nbsp; 00905465301000</div>
    </div>
  </div>
  <div class="inv-badge">
    <div class="lbl">فاتورة &nbsp; INVOICE</div>
    <div class="num">${inv.invoice_number}</div>
    <div class="date">${dateStr}</div>
  </div>
</div>

<!-- Client Card -->
<div class="card client-card">
  <div class="card-title">بيانات العميل &nbsp; CUSTOMER</div>
  <div class="client-fields">
    <div class="client-field">
      <div class="dot"></div>
      <span class="label">العميل:</span>
      <span class="value">${inv.client_name}</span>
    </div>
    <div class="client-field">
      <div class="dot"></div>
      <span class="label">الحالة:</span>
      <span class="value">${inv.status}</span>
    </div>
    <div class="client-field">
      <div class="dot"></div>
      <span class="label">المندوب:</span>
      <span class="value">BILAL TARRAB</span>
    </div>
  </div>
</div>

<!-- Items Card -->
<div class="card items-card">
  <div class="card-title">البنود &nbsp; ITEMS</div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>الوصف</th>
        <th>الكمية</th>
        <th>سعر الوحدة</th>
        <th style="text-align:left">المبلغ</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
</div>

<!-- Totals Card -->
<div class="card totals-card">
  <div class="card-title">الملخص &nbsp; SUMMARY</div>
  <div class="totals-inner">
    <div class="tot-row">
      <span class="lbl">المجموع الفرعي</span>
      <span class="val">${fmt(inv.subtotal)}</span>
    </div>
  </div>
  <div class="grand-row">
    <span class="lbl">الإجمالي &nbsp; Total</span>
    <span class="val">${fmt(inv.total)}</span>
  </div>
</div>

<div class="footer">
  <span>شكراً لتعاملكم معنا &nbsp;&bull;&nbsp; kamalreklam.ist@gmail.com &nbsp;&bull;&nbsp; 00905465301000 &nbsp;&bull;&nbsp; الجميلية - حلب - سوريا</span>
</div>

</body>
</html>`;

  console.log("Generating Design C (Glassmorphism/Card) PDF via API...");
  const res = await fetch("http://localhost:3001/api/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ html, filename: "design_C_glass.pdf" }),
  });

  if (!res.ok) { console.log("ERROR:", res.status, await res.text()); return; }

  const buffer = await res.arrayBuffer();
  const outPath = "C:/Users/ihima/Downloads/design_C_glass.pdf";
  fs.writeFileSync(outPath, Buffer.from(buffer));
  console.log(`SUCCESS! ${(buffer.byteLength / 1024).toFixed(1)} KB -> ${outPath}`);
}

main().catch(console.error);
