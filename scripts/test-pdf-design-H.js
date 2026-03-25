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
  width: 210mm;
  min-height: 297mm;
  position: relative;
}

/* ── Right Ribbon ── */
.ribbon {
  position: fixed;
  top: 0;
  right: 0;
  width: 20px;
  height: 100%;
  background: #29ABE2;
  z-index: 10;
}

/* Timeline dots */
.dot {
  position: fixed;
  right: 5px;
  width: 10px;
  height: 10px;
  background: #FFFFFF;
  border-radius: 50%;
  z-index: 12;
}

.dot-1 { top: 50px; }
.dot-2 { top: 200px; }
.dot-3 { top: 340px; }
.dot-4 { top: 700px; }

/* Connector lines from dots to sections */
.connector {
  position: absolute;
  height: 1px;
  background: #29ABE2;
  top: 50%;
  left: -40px;
  width: 40px;
}

/* ── Sections ── */
.page-content {
  padding: 40px 36px 40px 48px;
  margin-right: 20px;
}

/* Section 1: Company */
.section-company {
  position: relative;
  padding-right: 0;
  margin-bottom: 36px;
}

.brand-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.brand-row img {
  height: 48px;
}

.company-name {
  font-size: 22px;
  font-weight: 800;
  color: #2D3436;
}

.company-sub {
  font-size: 8px;
  color: #636E72;
  letter-spacing: 2px;
  font-weight: 600;
  margin-top: 1px;
}

.company-address {
  font-size: 8px;
  color: #B2BEC3;
  margin-top: 6px;
}

/* Section 2: Invoice Meta */
.section-meta {
  position: relative;
  margin-bottom: 28px;
}

.meta-boxes {
  display: flex;
  gap: 12px;
}

.meta-box {
  flex: 1;
  background: #F8F9FA;
  border-radius: 8px;
  padding: 12px 16px;
  border-right: 3px solid #29ABE2;
}

.meta-box .label {
  font-size: 8px;
  color: #B2BEC3;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 4px;
}

.meta-box .value {
  font-size: 13px;
  font-weight: 700;
  color: #2D3436;
}

.meta-box .value.ltr {
  font-family: 'Inter', sans-serif;
  direction: ltr;
  text-align: right;
}

/* Section 3: Items */
.section-items {
  position: relative;
  margin-bottom: 24px;
}

.section-title {
  font-size: 10px;
  font-weight: 700;
  color: #29ABE2;
  margin-bottom: 10px;
  padding-right: 10px;
  border-right: 3px solid #29ABE2;
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead th {
  background: transparent;
  color: #29ABE2;
  padding: 8px 12px;
  font-size: 9px;
  font-weight: 700;
  text-align: right;
  white-space: nowrap;
  border-bottom: 1px solid #E8E8E8;
  border-right: 3px solid #29ABE2;
}

thead th:first-child { text-align: center; width: 28px; border-right: none; }
thead th:nth-child(2) { border-right: 3px solid #29ABE2; }
thead th:last-child { text-align: left; border-right: none; }
thead th:nth-child(3), thead th:nth-child(4) { border-right: none; }

tbody td {
  padding: 7px 12px;
  border-bottom: 1px solid #F1F2F6;
  white-space: nowrap;
  font-size: 10px;
}

.idx { text-align: center; color: #B2BEC3; font-size: 9px; }
.desc { white-space: normal !important; font-weight: 600; max-width: 240px; }
.qty { text-align: center; }
.price { text-align: center; font-family: 'Inter', monospace; }
.amt { text-align: left; font-family: 'Inter', monospace; font-weight: 700; }

/* Section 4: Totals */
.section-totals {
  position: relative;
}

.totals-box {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  width: 240px;
}

.tot-row {
  display: flex;
  justify-content: space-between;
  width: 100%;
  padding: 8px 14px;
  background: #F8F9FA;
  border-radius: 6px;
}

.tot-row .lbl {
  font-size: 9px;
  color: #636E72;
  font-weight: 600;
}

.tot-row .val {
  font-family: 'Inter', monospace;
  font-size: 10px;
  font-weight: 700;
}

.tot-row.grand {
  background: #29ABE2;
  margin-top: 4px;
}

.tot-row.grand .lbl { color: rgba(255,255,255,0.8); font-size: 10px; }
.tot-row.grand .val { color: #FFFFFF; font-size: 15px; }

/* ── Footer: ribbon end circle ── */
.ribbon-end {
  position: fixed;
  bottom: 20px;
  right: 2px;
  width: 16px;
  height: 16px;
  background: #FFFFFF;
  border-radius: 50%;
  z-index: 12;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  color: #29ABE2;
}

.footer-text {
  position: fixed;
  bottom: 24px;
  left: 48px;
  right: 48px;
  text-align: center;
  font-size: 7.5px;
  color: #B2BEC3;
}
</style>
</head>
<body>

<div class="ribbon"></div>
<div class="dot dot-1"></div>
<div class="dot dot-2"></div>
<div class="dot dot-3"></div>
<div class="dot dot-4"></div>

<div class="page-content">

  <!-- Section 1: Company -->
  <div class="section-company">
    <div class="brand-row">
      <img src="http://localhost:3001/logo-black.png" onerror="this.outerHTML=''" />
      <div>
        <div class="company-name">برينتكس</div>
        <div class="company-sub">PRINTIX — INKS & PRINTING SUPPLIES</div>
      </div>
    </div>
    <div class="company-address">الجميلية - حلب - سوريا &nbsp;|&nbsp; 00905465301000 &nbsp;|&nbsp; kamalreklam.ist@gmail.com</div>
  </div>

  <!-- Section 2: Invoice Meta -->
  <div class="section-meta">
    <div class="meta-boxes">
      <div class="meta-box">
        <div class="label">رقم الفاتورة</div>
        <div class="value ltr">${inv.invoice_number}</div>
      </div>
      <div class="meta-box">
        <div class="label">التاريخ</div>
        <div class="value ltr">${dateStr}</div>
      </div>
      <div class="meta-box">
        <div class="label">العميل</div>
        <div class="value">${inv.client_name}</div>
      </div>
      <div class="meta-box">
        <div class="label">الحالة</div>
        <div class="value" style="color:#29ABE2">${inv.status === 'paid' ? 'مدفوعة' : 'معلّقة'}</div>
      </div>
    </div>
  </div>

  <!-- Section 3: Items -->
  <div class="section-items">
    <div class="section-title">بنود الفاتورة</div>
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

  <!-- Section 4: Totals -->
  <div class="section-totals">
    <div class="section-title">الإجمالي</div>
    <div class="totals-box">
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

<div class="ribbon-end">&#10003;</div>
<div class="footer-text">شكراً لتعاملكم معنا</div>

</body>
</html>`;

  console.log("Generating Design H (Left Ribbon Timeline) PDF via API...");
  const res = await fetch("http://localhost:3001/api/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ html, filename: "design_H_ribbon.pdf" }),
  });

  if (!res.ok) { console.log("ERROR:", res.status, await res.text()); return; }

  const buffer = await res.arrayBuffer();
  const outPath = "C:/Users/ihima/Downloads/design_H_ribbon.pdf";
  fs.writeFileSync(outPath, Buffer.from(buffer));
  console.log(`SUCCESS! ${(buffer.byteLength / 1024).toFixed(1)} KB -> ${outPath}`);
}

main().catch(console.error);
