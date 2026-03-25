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
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
@page { size: A4; margin: 0; }
* { margin: 0; padding: 0; box-sizing: border-box; border-radius: 0 !important; }

body {
  font-family: 'Cairo', sans-serif;
  font-size: 10px;
  color: #000000;
  background: #FFFFFF;
  direction: rtl;
  padding: 44px 40px 32px;
  min-height: 297mm;
  position: relative;
}

/* ── TOP GRID ── */
.top-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 0;
  margin-bottom: 0;
}

.top-grid .cell {
  padding: 12px 0;
}

.top-grid .cell-invoice-label {
  display: flex;
  align-items: flex-end;
}

.top-grid .cell-invoice-label .text {
  font-size: 40px;
  font-weight: 900;
  color: #000000;
  line-height: 1;
}

.top-grid .cell-inv-number {
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.top-grid .cell-inv-number .number {
  font-size: 18px;
  font-weight: 700;
  color: #E74C3C;
  font-family: 'Space Mono', monospace;
  direction: ltr;
  white-space: nowrap;
}

.top-grid .cell-date {
  display: flex;
  align-items: flex-end;
  justify-content: flex-start;
}

.top-grid .cell-date .date {
  font-size: 12px;
  font-family: 'Space Mono', monospace;
  color: #000000;
  direction: ltr;
  white-space: nowrap;
}

/* ── Red Divider ── */
.red-line {
  height: 2px;
  background: #E74C3C;
  margin-bottom: 24px;
}

/* ── Info Grid ── */
.info-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 0;
  margin-bottom: 28px;
}

.company-block {
  padding-left: 24px;
}

.company-block .logo-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.company-block .logo-row img {
  height: 36px;
}

.company-block .name-ar {
  font-size: 13px;
  font-weight: 800;
  color: #000000;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.company-block .name-en {
  font-size: 9px;
  font-weight: 700;
  color: #000000;
  font-family: 'Inter', sans-serif;
  letter-spacing: 4px;
  text-transform: uppercase;
  direction: ltr;
  text-align: right;
}

.company-block .contact {
  font-size: 8px;
  color: #000000;
  margin-top: 4px;
  line-height: 1.8;
}

.client-block {
  border-right: 2px solid #000000;
  padding-right: 16px;
}

.client-block .label {
  font-size: 7px;
  font-weight: 700;
  color: #000000;
  letter-spacing: 3px;
  text-transform: uppercase;
  margin-bottom: 6px;
}

.client-block .client-name {
  font-size: 16px;
  font-weight: 900;
  color: #000000;
  line-height: 1.3;
}

.client-block .client-detail {
  font-size: 9px;
  color: #000000;
  margin-top: 4px;
}

/* ── Table ── */
.table-section {
  margin-top: 0;
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead th {
  background: #000000;
  color: #FFFFFF;
  padding: 10px 12px;
  font-size: 9px;
  font-weight: 700;
  text-align: right;
  white-space: nowrap;
  border: 1px solid #000000;
}

thead th:first-child {
  text-align: center;
  width: 28px;
}

thead th:last-child {
  text-align: left;
}

tbody td {
  padding: 8px 12px;
  border: 1px solid #000000;
  white-space: nowrap;
  font-size: 10px;
  color: #000000;
}

.idx {
  text-align: center;
  font-size: 9px;
  font-family: 'Space Mono', monospace;
}

.desc {
  white-space: normal !important;
  font-weight: 700;
  max-width: 220px;
}

.qty {
  text-align: center;
  font-family: 'Space Mono', monospace;
}

.price {
  text-align: center;
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  white-space: nowrap;
}

.amt {
  text-align: left;
  font-family: 'Space Mono', monospace;
  font-weight: 700;
  font-size: 10px;
  white-space: nowrap;
}

/* ── Totals Block ── */
.totals-block {
  margin-top: 32px;
  display: flex;
  justify-content: flex-start;
  align-items: flex-end;
  gap: 40px;
}

.totals-sub {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.totals-sub .row {
  display: flex;
  gap: 16px;
  align-items: baseline;
}

.totals-sub .lbl {
  font-size: 9px;
  color: #000000;
  font-weight: 700;
}

.totals-sub .val {
  font-family: 'Space Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  color: #000000;
  white-space: nowrap;
}

.grand-block {
  text-align: center;
}

.grand-block .grand-label {
  font-size: 8px;
  font-weight: 700;
  color: #000000;
  letter-spacing: 2px;
  margin-bottom: 2px;
}

.grand-block .grand-amount {
  font-size: 36px;
  font-weight: 900;
  color: #E74C3C;
  font-family: 'Inter', sans-serif;
  direction: ltr;
  line-height: 1;
  white-space: nowrap;
}

/* ── Footer ── */
.footer {
  position: fixed;
  bottom: 24px;
  left: 40px;
  right: 40px;
}

.footer .black-line {
  height: 3px;
  background: #000000;
  margin-bottom: 8px;
}

.footer span {
  font-size: 7px;
  color: #666666;
  display: block;
  text-align: center;
}
</style>
</head>
<body>

<!-- TOP GRID -->
<div class="top-grid">
  <div class="cell cell-invoice-label">
    <div class="text">فاتورة</div>
  </div>
  <div class="cell cell-inv-number">
    <div class="number">${inv.invoice_number}</div>
  </div>
  <div class="cell cell-date">
    <div class="date">${dateStr}</div>
  </div>
</div>

<div class="red-line"></div>

<!-- INFO GRID -->
<div class="info-grid">
  <div class="company-block">
    <div class="logo-row">
      <img src="http://localhost:3001/logo.png" onerror="this.outerHTML=''" />
      <div>
        <div class="name-ar">برينتكس للأحبار ولوازم الطباعة</div>
        <div class="name-en">PRINTIX — INKS & PRINTING SUPPLIES</div>
      </div>
    </div>
    <div class="contact">
      00905465301000 &bull; kamalreklam.ist@gmail.com<br>
      الجميلية - حلب - سوريا
    </div>
  </div>
  <div class="client-block">
    <div class="label">العميل</div>
    <div class="client-name">${inv.client_name}</div>
    <div class="client-detail">${inv.client_phone || ""} ${inv.client_email ? "&bull; " + inv.client_email : ""}</div>
  </div>
</div>

<!-- TABLE -->
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

<!-- TOTALS -->
<div class="totals-block">
  <div class="grand-block">
    <div class="grand-label">الإجمالي</div>
    <div class="grand-amount">${fmt(inv.total)}</div>
  </div>
  <div class="totals-sub">
    <div class="row">
      <span class="lbl">المجموع الفرعي</span>
      <span class="val">${fmt(inv.subtotal)}</span>
    </div>
  </div>
</div>

<!-- FOOTER -->
<div class="footer">
  <div class="black-line"></div>
  <span>الجميلية - حلب - سوريا &nbsp;&bull;&nbsp; 00905465301000 &nbsp;&bull;&nbsp; kamalreklam.ist@gmail.com &nbsp;&bull;&nbsp; شكراً لتعاملكم معنا</span>
</div>

</body>
</html>`;

  console.log("Generating Design F (Swiss Brutal) PDF via API...");
  const res = await fetch("http://localhost:3001/api/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ html, filename: "design_F_swiss.pdf" }),
  });

  if (!res.ok) { console.log("ERROR:", res.status, await res.text()); return; }

  const buffer = await res.arrayBuffer();
  const outPath = "C:/Users/ihima/Downloads/design_F_swiss.pdf";
  fs.writeFileSync(outPath, Buffer.from(buffer));
  console.log(`SUCCESS! ${(buffer.byteLength / 1024).toFixed(1)} KB -> ${outPath}`);
}

main().catch(console.error);
