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
}

/* ── Layout: content + sidebar ── */
.page {
  position: relative;
  min-height: 100vh;
  display: flex;
}

.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  width: 60px;
  height: 100%;
  background: #1a1a2e;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 20px 0;
  z-index: 10;
}

.sidebar .accent-strip {
  width: 4px;
  height: 80px;
  background: #29ABE2;
  border-radius: 2px;
}

.sidebar .company-vertical {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  color: rgba(255,255,255,0.3);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 3px;
  transform: rotate(180deg);
}

.sidebar .bottom-mark {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid #29ABE2;
}

.content {
  margin-left: 60px;
  flex: 1;
  padding: 36px 40px 24px 40px;
}

/* ── Logo ── */
.logo-area {
  margin-bottom: 8px;
}

.logo-area img {
  height: 44px;
}

/* ── Invoice number hero ── */
.inv-hero {
  margin-bottom: 24px;
}

.inv-hero .label-above {
  font-size: 10px;
  font-weight: 700;
  color: #29ABE2;
  margin-bottom: 2px;
}

.inv-hero .inv-number {
  font-family: 'Inter', sans-serif;
  font-size: 24px;
  font-weight: 700;
  color: #1a1a2e;
  direction: ltr;
  display: inline-block;
}

.inv-hero .inv-date {
  font-size: 10px;
  color: #636E72;
  margin-top: 4px;
}

/* ── Client info two-column ── */
.client-info {
  display: flex;
  gap: 40px;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #EDF2F7;
}

.client-info .field {
  display: flex;
  gap: 8px;
  font-size: 10px;
}

.client-info .field .label {
  color: #636E72;
  font-weight: 600;
}

.client-info .field .value {
  font-weight: 700;
  color: #2D3436;
}

/* ── Table ── */
table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 0;
}

thead th {
  background: #1a1a2e;
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
  border-bottom: 1px solid #EDF2F7;
  white-space: nowrap;
  font-size: 10px;
}

tbody tr:nth-child(even) {
  background: #F0F9FF;
}

tbody tr:nth-child(odd) {
  background: #FFFFFF;
}

.idx { text-align: center; color: #B2BEC3; font-size: 9px; }
.desc { white-space: normal !important; font-weight: 600; max-width: 240px; }
.qty { text-align: center; }
.price { text-align: center; font-family: 'Inter', monospace; font-size: 10px; }
.amt { text-align: left; font-family: 'Inter', monospace; font-weight: 700; font-size: 10px; }

/* ── Totals ── */
.totals-section {
  margin-top: 0;
}

.tot-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid #EDF2F7;
  width: 260px;
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

.grand-bar {
  background: #1a1a2e;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  margin-top: 4px;
}

.grand-bar .lbl {
  color: rgba(255,255,255,0.8);
  font-size: 11px;
  font-weight: 700;
}

.grand-bar .val {
  color: #FFFFFF;
  font-family: 'Inter', sans-serif;
  font-size: 18px;
  font-weight: 700;
}

/* ── Footer ── */
.footer {
  margin-top: 28px;
  text-align: center;
}

.cmyk-bar {
  display: flex;
  height: 5px;
  margin-bottom: 10px;
}

.cmyk-bar .c { flex: 1; background: #00AEEF; }
.cmyk-bar .m { flex: 1; background: #EC008C; }
.cmyk-bar .y { flex: 1; background: #FFF200; }
.cmyk-bar .k { flex: 1; background: #1a1a2e; }

.footer-text {
  font-size: 7.5px;
  color: #B2BEC3;
}
</style>
</head>
<body>

<div class="page">
  <div class="sidebar">
    <div class="accent-strip"></div>
    <div class="company-vertical">PRINTIX</div>
    <div class="bottom-mark"></div>
  </div>

  <div class="content">
    <div class="logo-area">
      <img src="http://localhost:3001/logo.png" onerror="this.outerHTML=''" />
    </div>

    <div class="inv-hero">
      <div class="label-above">فاتورة</div>
      <div class="inv-number">${inv.invoice_number}</div>
      <div class="inv-date">${dateStr}</div>
    </div>

    <div class="client-info">
      <div class="field">
        <span class="label">العميل:</span>
        <span class="value">${inv.client_name}</span>
      </div>
      <div class="field">
        <span class="label">الحالة:</span>
        <span class="value">${inv.status}</span>
      </div>
      <div class="field">
        <span class="label">المندوب:</span>
        <span class="value">BILAL TARRAB</span>
      </div>
    </div>

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

    <div class="totals-section">
      <div class="tot-row">
        <span class="lbl">المجموع الفرعي</span>
        <span class="val">${fmt(inv.subtotal)}</span>
      </div>
    </div>

    <div class="grand-bar">
      <span class="lbl">الإجمالي &nbsp; Total</span>
      <span class="val">${fmt(inv.total)}</span>
    </div>

    <div class="footer">
      <div class="cmyk-bar">
        <div class="c"></div>
        <div class="m"></div>
        <div class="y"></div>
        <div class="k"></div>
      </div>
      <div class="footer-text">
        برينتكس للأحبار ولوازم الطباعة &nbsp;&bull;&nbsp; الجميلية - حلب - سوريا &nbsp;&bull;&nbsp; 00905465301000 &nbsp;&bull;&nbsp; kamalreklam.ist@gmail.com
      </div>
    </div>
  </div>
</div>

</body>
</html>`;

  console.log("Generating Design B (Bold Sidebar) PDF via API...");
  const res = await fetch("http://localhost:3001/api/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ html, filename: "design_B_sidebar.pdf" }),
  });

  if (!res.ok) { console.log("ERROR:", res.status, await res.text()); return; }

  const buffer = await res.arrayBuffer();
  const outPath = "C:/Users/ihima/Downloads/design_B_sidebar.pdf";
  fs.writeFileSync(outPath, Buffer.from(buffer));
  console.log(`SUCCESS! ${(buffer.byteLength / 1024).toFixed(1)} KB -> ${outPath}`);
}

main().catch(console.error);
