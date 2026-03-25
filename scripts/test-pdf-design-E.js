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
    `<tr class="${i % 2 === 1 ? 'alt' : ''}"><td class="idx">${i + 1}</td><td class="desc">${item.productName}</td><td class="qty">${item.quantity}</td><td class="price">${fmt(item.unitPrice)}</td><td class="amt">${fmt(item.total)}</td></tr>`
  ).join("\n");

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
@page { size: A4; margin: 0; }
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Cairo', sans-serif;
  font-size: 10px;
  color: #B0B8C4;
  background: #0F1117;
  direction: rtl;
  padding: 0;
  min-height: 297mm;
  position: relative;
}

/* ── Gradient Lines ── */
.gradient-line {
  height: 3px;
  background: linear-gradient(90deg, #29ABE2, #7C3AED, #E91E63);
  width: 100%;
}

.gradient-line.bottom {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
}

/* ── Main Content ── */
.main {
  padding: 40px 44px 60px;
}

/* ── Header ── */
.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 36px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 16px;
}

.brand img {
  height: 50px;
  filter: brightness(1.2);
  box-shadow: 0 0 24px rgba(41,171,226,0.35), 0 0 48px rgba(41,171,226,0.15);
  border-radius: 8px;
}

.company-name {
  font-size: 20px;
  font-weight: 800;
  color: #FFFFFF;
  line-height: 1.3;
}

.company-sub {
  font-size: 8px;
  color: #636E80;
  letter-spacing: 2px;
  font-weight: 600;
  margin-top: 2px;
}

/* ── Invoice Title ── */
.inv-title {
  text-align: left;
}

.inv-title .label {
  font-size: 9px;
  font-weight: 700;
  color: #29ABE2;
  letter-spacing: 2px;
  margin-bottom: 2px;
}

.inv-title .number {
  font-size: 32px;
  font-weight: 900;
  color: #FFFFFF;
  font-family: 'Inter', sans-serif;
  direction: ltr;
  text-align: left;
  line-height: 1;
}

.inv-title .date {
  font-size: 10px;
  color: #4A5060;
  font-family: 'Space Mono', monospace;
  direction: ltr;
  text-align: left;
  margin-top: 6px;
}

/* ── Client Card ── */
.client-card {
  background: #1A1D26;
  border: 1px solid #2A2D36;
  border-radius: 8px;
  padding: 20px 24px;
  margin-bottom: 28px;
}

.client-card .client-name {
  font-size: 18px;
  font-weight: 800;
  color: #FFFFFF;
  margin-bottom: 4px;
}

.client-card .client-detail {
  font-size: 9px;
  color: #636E80;
}

/* ── Table ── */
.table-section {
  margin-top: 8px;
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead th {
  background: transparent;
  color: #FFFFFF;
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
  padding: 9px 12px;
  border-bottom: 1px solid #1E2230;
  white-space: nowrap;
  font-size: 10px;
  color: #B0B8C4;
}

tbody tr.alt td {
  background: #151820;
}

.idx {
  text-align: center;
  color: #4A5060;
  font-size: 9px;
}

.desc {
  white-space: normal !important;
  font-weight: 600;
  max-width: 220px;
  color: #D0D6E0;
}

.qty {
  text-align: center;
}

.price {
  text-align: center;
  font-family: 'Inter', monospace;
  font-size: 10px;
  white-space: nowrap;
}

.amt {
  text-align: left;
  font-family: 'Inter', monospace;
  font-weight: 700;
  font-size: 10px;
  color: #FFFFFF !important;
  white-space: nowrap;
}

/* ── Totals ── */
.totals-wrap {
  margin-top: 24px;
  display: flex;
  justify-content: flex-start;
}

.totals {
  width: 280px;
  background: #1A1D26;
  border: 1px solid #2A2D36;
  border-radius: 8px;
  padding: 16px 20px;
}

.tot-row {
  display: flex;
  justify-content: space-between;
  padding: 7px 0;
  border-bottom: 1px solid #2A2D36;
}

.tot-row:last-child {
  border-bottom: none;
}

.tot-row .lbl {
  font-size: 9px;
  color: #636E80;
}

.tot-row .val {
  font-family: 'Inter', monospace;
  font-size: 10px;
  font-weight: 700;
  color: #D0D6E0;
  white-space: nowrap;
}

.tot-row.grand {
  border-bottom: none;
  padding-top: 10px;
  margin-top: 4px;
}

.tot-row.grand .lbl {
  font-weight: 700;
  color: #FFFFFF;
  font-size: 12px;
}

.tot-row.grand .val {
  color: #29ABE2;
  font-size: 20px;
  text-shadow: 0 0 20px rgba(41,171,226,0.5), 0 0 40px rgba(41,171,226,0.2);
}

/* ── Footer ── */
.footer {
  position: fixed;
  bottom: 16px;
  left: 44px;
  right: 44px;
  text-align: center;
  padding-top: 10px;
}

.footer span {
  font-size: 7.5px;
  color: #3A3F4E;
}
</style>
</head>
<body>

<div class="gradient-line"></div>

<div class="main">

  <div class="header">
    <div class="brand">
      <img src="http://localhost:3001/logo.png" onerror="this.outerHTML=''" />
      <div>
        <div class="company-name">برينتكس للأحبار ولوازم الطباعة</div>
        <div class="company-sub">PRINTIX — INKS & PRINTING SUPPLIES</div>
      </div>
    </div>
    <div class="inv-title">
      <div class="label">فاتورة</div>
      <div class="number">${inv.invoice_number}</div>
      <div class="date">${dateStr}</div>
    </div>
  </div>

  <div class="client-card">
    <div class="client-name">${inv.client_name}</div>
    <div class="client-detail">${inv.client_phone || ""} ${inv.client_email ? "&bull; " + inv.client_email : ""}</div>
  </div>

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

</div>

<div class="footer">
  <span>الجميلية - حلب - سوريا &nbsp;&bull;&nbsp; 00905465301000 &nbsp;&bull;&nbsp; kamalreklam.ist@gmail.com &nbsp;&bull;&nbsp; شكراً لتعاملكم معنا</span>
</div>

<div class="gradient-line bottom"></div>

</body>
</html>`;

  console.log("Generating Design E (Dark Premium) PDF via API...");
  const res = await fetch("http://localhost:3001/api/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ html, filename: "design_E_dark.pdf" }),
  });

  if (!res.ok) { console.log("ERROR:", res.status, await res.text()); return; }

  const buffer = await res.arrayBuffer();
  const outPath = "C:/Users/ihima/Downloads/design_E_dark.pdf";
  fs.writeFileSync(outPath, Buffer.from(buffer));
  console.log(`SUCCESS! ${(buffer.byteLength / 1024).toFixed(1)} KB -> ${outPath}`);
}

main().catch(console.error);
