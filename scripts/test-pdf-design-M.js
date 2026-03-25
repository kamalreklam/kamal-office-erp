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
      <td class="idx">${i + 1}</td>
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
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;800&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
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
  padding: 56px 52px 40px;
  position: relative;
  min-height: 100vh;
  overflow: hidden;
}

/* ── Watercolor Blobs ── */
.blob-top {
  position: fixed;
  top: -40px;
  right: -30px;
  width: 400px;
  height: 400px;
  z-index: 0;
  pointer-events: none;
}

.blob-cyan {
  position: absolute;
  top: 20px;
  right: 30px;
  width: 220px;
  height: 200px;
  background: radial-gradient(ellipse at center, rgba(41,171,226,0.12) 0%, transparent 70%);
  filter: blur(30px);
  border-radius: 50%;
}

.blob-magenta {
  position: absolute;
  top: 80px;
  right: 120px;
  width: 180px;
  height: 160px;
  background: radial-gradient(ellipse at center, rgba(233,30,99,0.08) 0%, transparent 70%);
  filter: blur(30px);
  border-radius: 50%;
}

.blob-yellow {
  position: absolute;
  top: 40px;
  right: 200px;
  width: 120px;
  height: 100px;
  background: radial-gradient(ellipse at center, rgba(255,193,7,0.10) 0%, transparent 70%);
  filter: blur(25px);
  border-radius: 50%;
}

.blob-bottom {
  position: fixed;
  bottom: -30px;
  left: -20px;
  width: 300px;
  height: 300px;
  z-index: 0;
  pointer-events: none;
}

.blob-cyan-b {
  position: absolute;
  bottom: 20px;
  left: 20px;
  width: 160px;
  height: 140px;
  background: radial-gradient(ellipse at center, rgba(41,171,226,0.09) 0%, transparent 70%);
  filter: blur(28px);
  border-radius: 50%;
}

.blob-magenta-b {
  position: absolute;
  bottom: 60px;
  left: 90px;
  width: 120px;
  height: 110px;
  background: radial-gradient(ellipse at center, rgba(233,30,99,0.06) 0%, transparent 70%);
  filter: blur(25px);
  border-radius: 50%;
}

.blob-yellow-b {
  position: absolute;
  bottom: 30px;
  left: 150px;
  width: 80px;
  height: 70px;
  background: radial-gradient(ellipse at center, rgba(255,193,7,0.08) 0%, transparent 70%);
  filter: blur(22px);
  border-radius: 50%;
}

.content {
  position: relative;
  z-index: 1;
}

/* ── Brand ── */
.brand-area {
  margin-bottom: 48px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.brand-left {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.brand-left img {
  height: 40px;
  margin-bottom: 12px;
}

.company-name {
  font-size: 22px;
  font-weight: 300;
  color: #2D3436;
  line-height: 1.3;
}

.company-en {
  font-family: 'Inter', sans-serif;
  font-size: 9px;
  font-weight: 300;
  color: #999999;
  letter-spacing: 8px;
  text-transform: uppercase;
  margin-top: 4px;
}

/* ── Invoice Meta ── */
.meta-section {
  text-align: left;
  direction: ltr;
}

.meta-label {
  font-family: 'Inter', sans-serif;
  font-size: 7px;
  color: #BBBBBB;
  text-transform: uppercase;
  letter-spacing: 3px;
  margin-bottom: 3px;
}

.meta-value {
  font-family: 'Inter', sans-serif;
  font-size: 9px;
  font-weight: 400;
  color: #555555;
  margin-bottom: 14px;
}

.meta-value.client {
  font-family: 'Cairo', sans-serif;
  direction: rtl;
  text-align: right;
}

/* ── Table ── */
.table-section {
  margin-top: 12px;
  margin-bottom: 32px;
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead th {
  font-family: 'Inter', sans-serif;
  font-size: 7px;
  color: #999999;
  text-align: right;
  padding: 0 8px 12px;
  text-transform: uppercase;
  letter-spacing: 2px;
  font-weight: 400;
  border: none;
  white-space: nowrap;
}

thead th:first-child {
  text-align: center;
  width: 24px;
}

thead th:last-child {
  text-align: left;
}

tbody td {
  padding: 0 8px;
  line-height: 2.2;
  font-size: 10px;
  color: #2D3436;
  border: none;
  white-space: nowrap;
}

.idx {
  text-align: center;
  color: #CCCCCC;
  font-family: 'Inter', sans-serif;
  font-size: 8px;
}

.desc {
  white-space: normal !important;
  font-weight: 400;
  max-width: 260px;
  color: #444444;
}

.qty {
  text-align: center;
  font-family: 'Space Mono', monospace;
  color: #666666;
  font-size: 9px;
}

.price {
  text-align: center;
  font-family: 'Space Mono', monospace;
  color: #666666;
  font-size: 9px;
}

.amt {
  text-align: left;
  font-family: 'Space Mono', monospace;
  font-weight: 400;
  color: #333333;
  font-size: 9px;
}

/* ── Totals ── */
.totals-area {
  display: flex;
  justify-content: flex-start;
  margin-top: 24px;
}

.totals-inner {
  text-align: left;
  direction: ltr;
}

.subtotal-line {
  font-family: 'Inter', sans-serif;
  font-size: 8px;
  color: #999999;
  letter-spacing: 2px;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.subtotal-val {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  color: #666666;
  margin-bottom: 16px;
}

.grand-total {
  font-family: 'Inter', sans-serif;
  font-size: 24px;
  font-weight: 300;
  color: #2D3436;
  direction: ltr;
}

/* ── Footer ── */
.footer {
  position: fixed;
  bottom: 40px;
  left: 52px;
  right: 52px;
  text-align: center;
  z-index: 1;
}

.thanks {
  font-size: 11px;
  font-weight: 300;
  color: #AAAAAA;
  margin-bottom: 8px;
}

.contact {
  font-family: 'Inter', sans-serif;
  font-size: 7px;
  color: #CCCCCC;
  letter-spacing: 1.5px;
}
</style>
</head>
<body>

<!-- Watercolor blobs -->
<div class="blob-top">
  <div class="blob-cyan"></div>
  <div class="blob-magenta"></div>
  <div class="blob-yellow"></div>
</div>
<div class="blob-bottom">
  <div class="blob-cyan-b"></div>
  <div class="blob-magenta-b"></div>
  <div class="blob-yellow-b"></div>
</div>

<div class="content">
  <!-- Brand -->
  <div class="brand-area">
    <div class="brand-left">
      <img src="http://localhost:3001/logo-black.png" onerror="this.outerHTML=''" />
      <div class="company-name">برينتكس للأحبار ولوازم الطباعة</div>
      <div class="company-en">PRINTIX</div>
    </div>
    <div class="meta-section">
      <div class="meta-label">Invoice</div>
      <div class="meta-value">${inv.invoice_number}</div>
      <div class="meta-label">Date</div>
      <div class="meta-value">${dateStr}</div>
      <div class="meta-label">Client</div>
      <div class="meta-value client">${inv.client_name}</div>
      <div class="meta-label">Status</div>
      <div class="meta-value">${inv.status === 'paid' ? 'Paid' : 'Pending'}</div>
    </div>
  </div>

  <!-- Table -->
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

  <!-- Totals -->
  <div class="totals-area">
    <div class="totals-inner">
      <div class="subtotal-line">Subtotal</div>
      <div class="subtotal-val">${fmt(inv.subtotal)}</div>
      <div class="grand-total">${fmt(inv.total)}</div>
    </div>
  </div>
</div>

<!-- Footer -->
<div class="footer">
  <div class="thanks">شكراً لتعاملكم معنا</div>
  <div class="contact">الجميلية - حلب - سوريا &nbsp;&bull;&nbsp; 00905465301000 &nbsp;&bull;&nbsp; kamalreklam.ist@gmail.com</div>
</div>

</body>
</html>`;

  console.log("Generating Design M (Watercolor Ink Art) PDF via API...");
  const res = await fetch("http://localhost:3001/api/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ html, filename: "design_M_watercolor.pdf" }),
  });

  if (!res.ok) { console.log("ERROR:", res.status, await res.text()); return; }

  const buffer = await res.arrayBuffer();
  const outPath = "C:/Users/ihima/Downloads/design_M_watercolor.pdf";
  fs.writeFileSync(outPath, Buffer.from(buffer));
  console.log(`SUCCESS! ${(buffer.byteLength / 1024).toFixed(1)} KB -> ${outPath}`);
}

main().catch(console.error);
