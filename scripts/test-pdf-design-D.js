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

  const statusLabel = inv.status === "paid" ? "مدفوعة" : inv.status === "partial" ? "جزئي" : "غير مدفوعة";
  const statusColor = inv.status === "paid" ? "#27AE60" : inv.status === "partial" ? "#F39C12" : "#E74C3C";

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
  color: #2D3436;
  background: #FFFFFF;
  direction: rtl;
  width: 210mm;
  min-height: 297mm;
  position: relative;
  overflow: hidden;
}

/* ── Right Dark Panel (35%) ── */
.dark-panel {
  position: fixed;
  top: 0;
  left: 0;
  width: 35%;
  height: 100%;
  background: #1a1a2e;
  padding: 48px 28px;
  display: flex;
  flex-direction: column;
  z-index: 2;
}

.dark-panel .logo-area {
  margin-bottom: 20px;
}

.dark-panel .logo-area img {
  height: 48px;
  filter: brightness(0) invert(1);
}

.dark-panel .company-ar {
  font-size: 16px;
  font-weight: 800;
  color: #FFFFFF;
  line-height: 1.4;
  margin-bottom: 4px;
}

.dark-panel .company-en {
  font-size: 22px;
  font-weight: 900;
  color: #FFFFFF;
  font-family: 'Inter', sans-serif;
  letter-spacing: 4px;
  direction: ltr;
  text-align: left;
  margin-bottom: 24px;
  line-height: 1;
}

.dark-panel .contact-info {
  color: rgba(255,255,255,0.5);
  font-size: 8px;
  line-height: 2;
  margin-bottom: 28px;
}

.dark-panel .contact-info span {
  display: block;
  direction: ltr;
  text-align: left;
}

/* CMYK Bars */
.cmyk-bars {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: auto;
}

.cmyk-bar {
  height: 8px;
  border-radius: 0;
}

.cmyk-c { background: #29ABE2; }
.cmyk-m { background: #E91E63; }
.cmyk-y { background: #FFC107; }
.cmyk-k { background: #212121; }

/* Bottom of dark panel */
.dark-panel .inv-bottom {
  margin-top: auto;
}

.dark-panel .inv-number {
  font-size: 28px;
  font-weight: 900;
  color: #FFFFFF;
  font-family: 'Inter', sans-serif;
  direction: ltr;
  text-align: left;
  line-height: 1;
  margin-bottom: 6px;
}

.dark-panel .inv-date {
  font-size: 10px;
  color: rgba(255,255,255,0.4);
  font-family: 'Space Mono', monospace;
  direction: ltr;
  text-align: left;
}

/* ── Left White Content (65%) ── */
.content {
  margin-right: 35%;
  padding: 48px 44px 32px 36px;
  min-height: 297mm;
  position: relative;
}

.invoice-label {
  font-size: 9px;
  font-weight: 700;
  color: #29ABE2;
  letter-spacing: 3px;
  margin-bottom: 12px;
}

.client-name {
  font-size: 22px;
  font-weight: 800;
  color: #1a1a2e;
  margin-bottom: 4px;
  line-height: 1.3;
}

.client-details {
  font-size: 9px;
  color: #636E72;
  margin-bottom: 6px;
}

.status-badge {
  display: inline-block;
  padding: 3px 14px;
  font-size: 9px;
  font-weight: 700;
  border-radius: 3px;
  margin-bottom: 28px;
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
  color: #29ABE2;
  padding: 10px 10px;
  font-size: 9px;
  font-weight: 700;
  text-align: right;
  white-space: nowrap;
  border-bottom: none;
}

thead th:first-child {
  text-align: center;
  width: 28px;
}

thead th:last-child {
  text-align: left;
}

tbody td {
  padding: 8px 10px;
  border-bottom: 1px solid #EAEAEA;
  white-space: nowrap;
  font-size: 10px;
}

tbody tr:last-child td {
  border-bottom: none;
}

.idx {
  text-align: center;
  color: #B2BEC3;
  font-size: 9px;
}

.desc {
  white-space: normal !important;
  font-weight: 600;
  max-width: 200px;
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
  white-space: nowrap;
}

/* ── Totals ── */
.totals-wrap {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
}

.totals {
  width: 240px;
}

.tot-row {
  display: flex;
  justify-content: space-between;
  padding: 7px 0;
  border-bottom: 1px solid #EAEAEA;
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
  white-space: nowrap;
}

.tot-row.grand {
  border-bottom: none;
  padding: 10px 0;
  border-right: 4px solid #29ABE2;
  padding-right: 12px;
  margin-top: 6px;
}

.tot-row.grand .lbl {
  font-weight: 700;
  color: #1a1a2e;
  font-size: 11px;
}

.tot-row.grand .val {
  color: #29ABE2;
  font-size: 18px;
}

/* ── Footer ── */
.footer-note {
  position: absolute;
  bottom: 32px;
  right: 44px;
  left: 36px;
  text-align: center;
  font-size: 7.5px;
  color: #B2BEC3;
  border-top: 1px solid #EAEAEA;
  padding-top: 10px;
}
</style>
</head>
<body>

<!-- RIGHT DARK PANEL -->
<div class="dark-panel">
  <div class="logo-area">
    <img src="http://localhost:3001/logo.png" onerror="this.outerHTML=''" />
  </div>
  <div class="company-ar">برينتكس للأحبار ولوازم الطباعة</div>
  <div class="company-en">PRINTIX</div>
  <div class="contact-info">
    <span>00905465301000</span>
    <span>kamalreklam.ist@gmail.com</span>
    <span>الجميلية - حلب - سوريا</span>
  </div>
  <div class="cmyk-bars">
    <div class="cmyk-bar cmyk-c"></div>
    <div class="cmyk-bar cmyk-m"></div>
    <div class="cmyk-bar cmyk-y"></div>
    <div class="cmyk-bar cmyk-k"></div>
  </div>
  <div class="inv-bottom">
    <div class="inv-number">${inv.invoice_number}</div>
    <div class="inv-date">${dateStr}</div>
  </div>
</div>

<!-- LEFT WHITE CONTENT -->
<div class="content">
  <div class="invoice-label">فاتورة</div>
  <div class="client-name">${inv.client_name}</div>
  <div class="client-details">${inv.client_phone || ""} ${inv.client_email ? "&bull; " + inv.client_email : ""}</div>
  <div class="status-badge" style="background: ${statusColor}15; color: ${statusColor}; border: 1px solid ${statusColor}33;">${statusLabel}</div>

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

  <div class="footer-note">
    الجميلية - حلب - سوريا &nbsp;&bull;&nbsp; 00905465301000 &nbsp;&bull;&nbsp; kamalreklam.ist@gmail.com &nbsp;&bull;&nbsp; شكراً لتعاملكم معنا
  </div>
</div>

</body>
</html>`;

  console.log("Generating Design D (INK CMYK Split) PDF via API...");
  const res = await fetch("http://localhost:3001/api/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ html, filename: "design_D_ink.pdf" }),
  });

  if (!res.ok) { console.log("ERROR:", res.status, await res.text()); return; }

  const buffer = await res.arrayBuffer();
  const outPath = "C:/Users/ihima/Downloads/design_D_ink.pdf";
  fs.writeFileSync(outPath, Buffer.from(buffer));
  console.log(`SUCCESS! ${(buffer.byteLength / 1024).toFixed(1)} KB -> ${outPath}`);
}

main().catch(console.error);
