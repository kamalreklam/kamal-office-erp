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
  width: 210mm;
  min-height: 297mm;
  padding: 52px 48px 40px;
  position: relative;
  overflow: hidden;
}

/* ── Ink Drops (CMYK circles) ── */
.ink-drop {
  position: absolute;
  border-radius: 50%;
  z-index: 0;
}

.ink-cyan {
  width: 140px;
  height: 140px;
  background: rgba(41, 171, 226, 0.18);
  top: -20px;
  left: -10px;
}

.ink-magenta {
  width: 120px;
  height: 120px;
  background: rgba(233, 30, 99, 0.15);
  top: 30px;
  left: 60px;
}

.ink-yellow {
  width: 110px;
  height: 110px;
  background: rgba(255, 193, 7, 0.18);
  top: -10px;
  left: 100px;
}

/* ── Header ── */
.header {
  position: relative;
  z-index: 1;
  margin-bottom: 36px;
}

.company-name {
  font-size: 28px;
  font-weight: 800;
  color: #2D3436;
  margin-bottom: 2px;
}

.company-sub {
  font-size: 8px;
  color: #636E72;
  letter-spacing: 3px;
  font-weight: 600;
}

.logo-float {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 2;
}

.logo-float img {
  height: 48px;
  opacity: 0.85;
}

/* ── Invoice Number ── */
.inv-number-section {
  margin-bottom: 16px;
  position: relative;
  z-index: 1;
}

.inv-number {
  font-size: 22px;
  font-weight: 800;
  font-family: 'Inter', sans-serif;
  color: #2D3436;
  direction: ltr;
  text-align: right;
  display: inline-block;
  padding-bottom: 4px;
  border-bottom: 3px solid #29ABE2;
}

.inv-label {
  font-size: 9px;
  color: #B2BEC3;
  font-weight: 600;
  margin-bottom: 4px;
}

/* ── Client Line ── */
.client-line {
  font-size: 11px;
  color: #636E72;
  margin-bottom: 28px;
  position: relative;
  z-index: 1;
}

.client-line strong {
  color: #2D3436;
  font-weight: 700;
}

.meta-inline {
  display: flex;
  gap: 24px;
  margin-top: 6px;
  font-size: 9px;
}

.meta-inline span {
  color: #B2BEC3;
}

.meta-inline strong {
  color: #2D3436;
  font-weight: 700;
  font-family: 'Inter', sans-serif;
  direction: ltr;
}

/* ── Table ── */
table {
  width: 100%;
  border-collapse: collapse;
  position: relative;
  z-index: 1;
}

thead th {
  background: transparent;
  color: #29ABE2;
  padding: 10px 14px;
  font-size: 7.5px;
  font-weight: 700;
  text-align: right;
  white-space: nowrap;
  text-transform: uppercase;
  letter-spacing: 2px;
  border: none;
}

thead th:first-child { text-align: center; width: 24px; }
thead th:last-child { text-align: left; }

tbody tr { background: transparent; }
tbody tr.alt { background: #FAFAFA; }

tbody td {
  padding: 8px 14px;
  border: none;
  white-space: nowrap;
  font-size: 10px;
}

.idx { text-align: center; color: #B2BEC3; font-size: 9px; }
.desc { white-space: normal !important; font-weight: 600; max-width: 240px; }
.qty { text-align: center; font-family: 'Inter', monospace; }
.price { text-align: center; font-family: 'Inter', monospace; }
.amt { text-align: left; font-family: 'Inter', monospace; font-weight: 700; }

/* ── Totals (text only) ── */
.totals-section {
  margin-top: 28px;
  position: relative;
  z-index: 1;
}

.tot-line {
  display: flex;
  justify-content: flex-start;
  gap: 24px;
  padding: 4px 0;
}

.tot-line .lbl {
  font-size: 9px;
  color: #B2BEC3;
  min-width: 100px;
  text-align: right;
}

.tot-line .val {
  font-family: 'Inter', monospace;
  font-size: 10px;
  font-weight: 600;
  color: #636E72;
}

.tot-grand {
  margin-top: 8px;
  padding-top: 8px;
}

.tot-grand .lbl {
  font-size: 11px;
  color: #2D3436;
  font-weight: 700;
}

.tot-grand .val {
  font-size: 24px;
  font-weight: 800;
  color: #29ABE2;
  letter-spacing: -0.5px;
}

/* ── Footer ── */
.footer {
  position: fixed;
  bottom: 36px;
  left: 48px;
  right: 48px;
  text-align: center;
  z-index: 1;
}

.footer-text {
  font-size: 7.5px;
  color: #B2BEC3;
  margin-bottom: 8px;
}

.footer-dot {
  width: 12px;
  height: 12px;
  background: #29ABE2;
  border-radius: 50%;
  margin: 0 auto;
}
</style>
</head>
<body>

<!-- Ink Drops -->
<div class="ink-drop ink-cyan"></div>
<div class="ink-drop ink-magenta"></div>
<div class="ink-drop ink-yellow"></div>

<!-- Header -->
<div class="header">
  <div class="company-name">برينتكس</div>
  <div class="company-sub">PRINTIX — INKS & PRINTING SUPPLIES</div>
  <div class="logo-float">
    <img src="http://localhost:3001/logo-black.png" onerror="this.outerHTML=''" />
  </div>
</div>

<!-- Invoice Number -->
<div class="inv-number-section">
  <div class="inv-label">فاتورة</div>
  <div class="inv-number">${inv.invoice_number}</div>
</div>

<!-- Client Line -->
<div class="client-line">
  العميل: <strong>${inv.client_name}</strong> | ${inv.client_city || 'حلب'}
  <div class="meta-inline">
    <span>التاريخ: <strong>${dateStr}</strong></span>
    <span>الحالة: <strong style="color:#29ABE2">${inv.status === 'paid' ? 'مدفوعة' : 'معلّقة'}</strong></span>
  </div>
</div>

<!-- Table -->
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

<!-- Totals -->
<div class="totals-section">
  <div class="tot-line">
    <span class="lbl">المجموع الفرعي</span>
    <span class="val">${fmt(inv.subtotal)}</span>
  </div>
  <div class="tot-line tot-grand">
    <span class="lbl">الإجمالي</span>
    <span class="val">${fmt(inv.total)}</span>
  </div>
</div>

<!-- Footer -->
<div class="footer">
  <div class="footer-text">الجميلية - حلب - سوريا &nbsp;&bull;&nbsp; 00905465301000 &nbsp;&bull;&nbsp; kamalreklam.ist@gmail.com &nbsp;&bull;&nbsp; شكراً لتعاملكم معنا</div>
  <div class="footer-dot"></div>
</div>

</body>
</html>`;

  console.log("Generating Design K (Ink Drops Abstract) PDF via API...");
  const res = await fetch("http://localhost:3001/api/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ html, filename: "design_K_inkdrops.pdf" }),
  });

  if (!res.ok) { console.log("ERROR:", res.status, await res.text()); return; }

  const buffer = await res.arrayBuffer();
  const outPath = "C:/Users/ihima/Downloads/design_K_inkdrops.pdf";
  fs.writeFileSync(outPath, Buffer.from(buffer));
  console.log(`SUCCESS! ${(buffer.byteLength / 1024).toFixed(1)} KB -> ${outPath}`);
}

main().catch(console.error);
