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
    `<tr>
      <td class="idx">${String(i + 1).padStart(2, '0')}</td>
      <td class="desc">${item.productName}</td>
      <td class="qty">${item.quantity}</td>
      <td class="price">${fmt(item.unitPrice)}</td>
      <td class="amt">${fmt(item.total)}</td>
    </tr>`
  ).join("\n");

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
@page { size: A4; margin: 0; }
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Cairo', sans-serif;
  font-size: 10px;
  color: #ffffff;
  background: #1a3a5c;
  direction: rtl;
  padding: 0;
  position: relative;
  min-height: 100vh;
}

/* ── Blueprint Grid ── */
.grid-bg {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background:
    repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 20px),
    repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 20px);
  z-index: 0;
  pointer-events: none;
}

.content {
  position: relative;
  z-index: 1;
  padding: 40px 44px 32px;
}

/* ── Title Block ── */
.title-block {
  border: 3px solid #ffffff;
  padding: 14px 20px;
  display: inline-block;
  margin-bottom: 24px;
  position: relative;
}

.title-block::before {
  content: '';
  position: absolute;
  top: -7px; left: -7px; right: -7px; bottom: -7px;
  border: 1px solid rgba(255,255,255,0.3);
}

.title-block .inv-title {
  font-size: 26px;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: 2px;
  line-height: 1.2;
}

.title-block .inv-meta {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  color: #a8d4f0;
  margin-top: 6px;
  direction: ltr;
  text-align: left;
}

/* ── Header ── */
.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.brand-section {
  text-align: left;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.brand-section img {
  height: 48px;
  margin-bottom: 8px;
}

.company-name {
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
}

.company-sub {
  font-family: 'Space Mono', monospace;
  font-size: 7px;
  color: #a8d4f0;
  letter-spacing: 3px;
  margin-top: 2px;
}

/* ── Client Info ── */
.client-block {
  border: 1px dashed #a8d4f0;
  padding: 12px 18px;
  margin-bottom: 24px;
  display: inline-block;
  position: relative;
}

.client-block::before {
  content: 'CLIENT / العميل';
  position: absolute;
  top: -8px;
  right: 12px;
  background: #1a3a5c;
  padding: 0 8px;
  font-family: 'Space Mono', monospace;
  font-size: 7px;
  color: #a8d4f0;
  letter-spacing: 2px;
}

.client-block .client-name {
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 2px;
}

.client-block .client-detail {
  font-family: 'Space Mono', monospace;
  font-size: 8px;
  color: #a8d4f0;
}

/* ── Separator Line ── */
.sep {
  border: none;
  border-top: 1px solid rgba(168,212,240,0.3);
  margin: 16px 0;
}

/* ── Table ── */
table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 8px;
}

thead th {
  font-family: 'Space Mono', monospace;
  font-size: 8px;
  color: #a8d4f0;
  text-align: right;
  padding: 8px 10px;
  border-bottom: 1px dashed #a8d4f0;
  letter-spacing: 1px;
  text-transform: uppercase;
  white-space: nowrap;
}

thead th:first-child {
  text-align: center;
  width: 30px;
}

thead th:last-child {
  text-align: left;
}

tbody td {
  padding: 6px 10px;
  border-bottom: 1px dashed rgba(168,212,240,0.2);
  font-size: 10px;
  color: #ffffff;
  white-space: nowrap;
}

.idx {
  text-align: center;
  font-family: 'Space Mono', monospace;
  color: #a8d4f0;
  font-size: 9px;
}

.desc {
  white-space: normal !important;
  font-weight: 600;
  max-width: 240px;
}

.qty {
  text-align: center;
  font-family: 'Space Mono', monospace;
}

.price {
  text-align: center;
  font-family: 'Space Mono', monospace;
}

.amt {
  text-align: left;
  font-family: 'Space Mono', monospace;
  font-weight: 700;
  color: #a8d4f0;
}

/* ── Totals ── */
.totals-wrap {
  margin-top: 20px;
  display: flex;
  justify-content: flex-start;
}

.totals-box {
  border: 2px solid #ffffff;
  outline: 1px solid rgba(255,255,255,0.3);
  outline-offset: 4px;
  padding: 14px 24px;
  min-width: 280px;
}

.tot-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  gap: 40px;
}

.tot-row .lbl {
  font-size: 9px;
  color: #a8d4f0;
  font-weight: 600;
}

.tot-row .val {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  color: #ffffff;
}

.tot-row.grand {
  border-top: 1px dashed #a8d4f0;
  padding-top: 10px;
  margin-top: 4px;
}

.tot-row.grand .lbl {
  font-size: 12px;
  color: #ffffff;
  font-weight: 800;
}

.tot-row.grand .val {
  font-size: 18px;
  color: #a8d4f0;
}

/* ── Footer ── */
.footer {
  position: fixed;
  bottom: 28px;
  left: 44px;
  right: 44px;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.footer-meta {
  font-family: 'Space Mono', monospace;
  font-size: 7px;
  color: #a8d4f0;
  letter-spacing: 1.5px;
  direction: ltr;
  text-align: left;
}

/* ── Approved Stamp ── */
.stamp {
  width: 60px;
  height: 60px;
  border: 2px solid #50FA7B;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transform: rotate(-15deg);
  opacity: 0.8;
}

.stamp .check {
  font-size: 18px;
  color: #50FA7B;
  line-height: 1;
}

.stamp .stamp-text {
  font-family: 'Space Mono', monospace;
  font-size: 6px;
  color: #50FA7B;
  letter-spacing: 2px;
  margin-top: 2px;
}

/* ── Contact Bar ── */
.contact-bar {
  position: fixed;
  bottom: 8px;
  left: 44px;
  right: 44px;
  text-align: center;
  font-family: 'Space Mono', monospace;
  font-size: 6.5px;
  color: rgba(168,212,240,0.5);
  letter-spacing: 1px;
  border-top: 1px solid rgba(168,212,240,0.15);
  padding-top: 6px;
}
</style>
</head>
<body>

<div class="grid-bg"></div>

<div class="content">
  <!-- Header -->
  <div class="header">
    <div class="title-block">
      <div class="inv-title">فاتورة</div>
      <div class="inv-meta">NO: ${inv.invoice_number}  |  DATE: ${dateStr}</div>
    </div>
    <div class="brand-section">
      <img src="http://localhost:3001/logo.png" onerror="this.outerHTML=''" />
      <div class="company-name">برينتكس للأحبار ولوازم الطباعة</div>
      <div class="company-sub">PRINTIX — INKS & PRINTING SUPPLIES</div>
    </div>
  </div>

  <!-- Client -->
  <div class="client-block">
    <div class="client-name">${inv.client_name}</div>
    <div class="client-detail">INVOICE: ${inv.invoice_number} &nbsp;|&nbsp; STATUS: ${inv.status === 'paid' ? 'PAID' : 'PENDING'}</div>
  </div>

  <hr class="sep">

  <!-- Items Table -->
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>الوصف / Description</th>
        <th>الكمية / Qty</th>
        <th>سعر الوحدة / Unit</th>
        <th style="text-align:left">المبلغ / Amount</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <!-- Totals -->
  <div class="totals-wrap">
    <div class="totals-box">
      <div class="tot-row">
        <span class="lbl">المجموع الفرعي / Subtotal</span>
        <span class="val">${fmt(inv.subtotal)}</span>
      </div>
      <div class="tot-row grand">
        <span class="lbl">الإجمالي / Total</span>
        <span class="val">${fmt(inv.total)}</span>
      </div>
    </div>
  </div>
</div>

<!-- Footer -->
<div class="footer">
  <div class="footer-meta">
    REV: 01 &nbsp;|&nbsp; DATE: ${dateStr} &nbsp;|&nbsp; SCALE: 1:1 &nbsp;|&nbsp; DWG NO: ${inv.invoice_number}<br>
    DRAWN BY: PRINTIX SYSTEM &nbsp;|&nbsp; CHECKED: AUTO &nbsp;|&nbsp; SHEET: 1 OF 1
  </div>
  <div class="stamp">
    <span class="check">&#10003;</span>
    <span class="stamp-text">APPROVED</span>
  </div>
</div>

<div class="contact-bar">
  الجميلية - حلب - سوريا &nbsp;&bull;&nbsp; 00905465301000 &nbsp;&bull;&nbsp; kamalreklam.ist@gmail.com
</div>

</body>
</html>`;

  console.log("Generating Design L (Blueprint) PDF via API...");
  const res = await fetch("http://localhost:3001/api/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ html, filename: "design_L_blueprint.pdf" }),
  });

  if (!res.ok) { console.log("ERROR:", res.status, await res.text()); return; }

  const buffer = await res.arrayBuffer();
  const outPath = "C:/Users/ihima/Downloads/design_L_blueprint.pdf";
  fs.writeFileSync(outPath, Buffer.from(buffer));
  console.log(`SUCCESS! ${(buffer.byteLength / 1024).toFixed(1)} KB -> ${outPath}`);
}

main().catch(console.error);
