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
  background: #FFFFFF;
  direction: rtl;
  padding: 48px 44px 32px;
}

/* ── Header ── */
.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 16px;
}

.brand img {
  height: 52px;
}

.company-name {
  font-size: 22px;
  font-weight: 800;
  color: #2D3436;
  letter-spacing: -0.5px;
}

.company-sub {
  font-size: 8px;
  color: #636E72;
  letter-spacing: 1.5px;
  font-weight: 600;
  margin-top: 2px;
}

.header-underline {
  height: 2px;
  background: #29ABE2;
  margin-bottom: 32px;
  width: 100%;
}

/* ── Invoice Info (right-aligned block) ── */
.inv-info {
  text-align: left;
  min-width: 180px;
}

.inv-info .row {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 4px 0;
  font-size: 10px;
}

.inv-info .label {
  color: #636E72;
  font-weight: 600;
  font-size: 9px;
}

.inv-info .value {
  font-weight: 700;
  color: #2D3436;
  font-family: 'Inter', sans-serif;
  direction: ltr;
}

.inv-info .value.name {
  font-family: 'Cairo', sans-serif;
  direction: rtl;
}

/* ── Table ── */
.table-section {
  margin-top: 28px;
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead th {
  background: transparent;
  color: #29ABE2;
  padding: 10px 12px;
  font-size: 9px;
  font-weight: 700;
  text-align: right;
  white-space: nowrap;
  border-bottom: 2px solid #29ABE2;
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
  border-bottom: 1px solid #DFE6E9;
  white-space: nowrap;
  font-size: 10px;
}

.idx {
  text-align: center;
  color: #B2BEC3;
  font-size: 9px;
}

.desc {
  white-space: normal !important;
  font-weight: 600;
  max-width: 240px;
}

.qty {
  text-align: center;
}

.price {
  text-align: center;
  font-family: 'Inter', monospace;
  font-size: 10px;
}

.amt {
  text-align: left;
  font-family: 'Inter', monospace;
  font-weight: 700;
  font-size: 10px;
}

/* ── Totals ── */
.totals-wrap {
  margin-top: 20px;
  display: flex;
  justify-content: flex-start;
}

.totals {
  width: 260px;
}

.tot-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #DFE6E9;
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

.tot-row.grand {
  border-bottom: none;
  padding: 10px 0;
  border-right: 3px solid #29ABE2;
  padding-right: 12px;
  margin-top: 4px;
}

.tot-row.grand .lbl {
  font-weight: 700;
  color: #2D3436;
  font-size: 11px;
}

.tot-row.grand .val {
  color: #29ABE2;
  font-size: 16px;
}

/* ── Footer ── */
.footer {
  position: fixed;
  bottom: 32px;
  left: 44px;
  right: 44px;
  border-top: 1px solid #DFE6E9;
  padding-top: 10px;
  text-align: center;
}

.footer span {
  font-size: 7.5px;
  color: #B2BEC3;
}
</style>
</head>
<body>

<div class="header">
  <div class="brand">
    <img src="http://localhost:3001/logo.png" onerror="this.outerHTML=''" />
    <div>
      <div class="company-name">برينتكس للأحبار ولوازم الطباعة</div>
      <div class="company-sub">PRINTIX — INKS & PRINTING SUPPLIES</div>
    </div>
  </div>
  <div class="inv-info">
    <div class="row">
      <span class="label">رقم الفاتورة</span>
      <span class="value">${inv.invoice_number}</span>
    </div>
    <div class="row">
      <span class="label">التاريخ</span>
      <span class="value">${dateStr}</span>
    </div>
    <div class="row">
      <span class="label">العميل</span>
      <span class="value name">${inv.client_name}</span>
    </div>
  </div>
</div>

<div class="header-underline"></div>

<div class="table-section">
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

<div class="totals-wrap">
  <div class="totals">
    <div class="tot-row">
      <span class="lbl">المجموع الفرعي</span>
      <span class="val">${fmt(inv.subtotal)}</span>
    </div>
    <div class="tot-row grand">
      <span class="lbl">الإجمالي</span>
      <span class="val">${fmt(inv.total)}</span>
    </div>
  </div>
</div>

<div class="footer">
  <span>الجميلية - حلب - سوريا &nbsp;&bull;&nbsp; 00905465301000 &nbsp;&bull;&nbsp; kamalreklam.ist@gmail.com &nbsp;&bull;&nbsp; شكراً لتعاملكم معنا</span>
</div>

</body>
</html>`;

  console.log("Generating Design A (Elegant Minimal) PDF via API...");
  const res = await fetch("http://localhost:3001/api/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ html, filename: "design_A_elegant.pdf" }),
  });

  if (!res.ok) { console.log("ERROR:", res.status, await res.text()); return; }

  const buffer = await res.arrayBuffer();
  const outPath = "C:/Users/ihima/Downloads/design_A_elegant.pdf";
  fs.writeFileSync(outPath, Buffer.from(buffer));
  console.log(`SUCCESS! ${(buffer.byteLength / 1024).toFixed(1)} KB -> ${outPath}`);
}

main().catch(console.error);
