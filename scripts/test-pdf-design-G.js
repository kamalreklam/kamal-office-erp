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

  const discount = inv.subtotal - inv.total;
  const hasDiscount = discount > 0.01;

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
  overflow: hidden;
}

/* ── Diagonal Slice ── */
.diagonal-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 260px;
  background: #29ABE2;
  clip-path: polygon(0 0, 100% 0, 100% 55%, 0 100%);
  z-index: 1;
}

.header-content {
  position: relative;
  z-index: 3;
  padding: 40px 48px 0;
  color: #FFFFFF;
}

.company-ar {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.5px;
}

.company-en {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 3px;
  opacity: 0.85;
  margin-top: 2px;
}

.contact-line {
  font-size: 8px;
  opacity: 0.7;
  margin-top: 8px;
  letter-spacing: 0.5px;
}

/* ── Logo on diagonal edge ── */
.logo-edge {
  position: absolute;
  top: 155px;
  left: 48px;
  z-index: 5;
  background: #FFFFFF;
  border-radius: 50%;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(0,0,0,0.12);
}

.logo-edge img {
  height: 48px;
}

/* ── Invoice Meta ── */
.meta-section {
  position: relative;
  z-index: 2;
  padding: 80px 48px 0 160px;
}

.inv-number {
  font-size: 32px;
  font-weight: 800;
  color: #2D3436;
  font-family: 'Inter', sans-serif;
  direction: ltr;
  text-align: right;
}

.inv-label {
  font-size: 10px;
  color: #B2BEC3;
  font-weight: 600;
  margin-bottom: 4px;
}

.meta-row {
  display: flex;
  gap: 40px;
  margin-top: 12px;
  align-items: flex-start;
}

.meta-item .label {
  font-size: 8px;
  color: #B2BEC3;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.meta-item .value {
  font-size: 12px;
  font-weight: 700;
  color: #2D3436;
  margin-top: 2px;
}

.meta-item .value.ltr {
  font-family: 'Inter', sans-serif;
  direction: ltr;
}

/* ── Table ── */
.table-section {
  padding: 28px 48px 0;
  position: relative;
  z-index: 2;
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead th {
  color: #29ABE2;
  padding: 10px 12px;
  font-size: 9px;
  font-weight: 700;
  text-align: right;
  white-space: nowrap;
  border-top: 2px solid #29ABE2;
  background: transparent;
}

thead th:first-child { text-align: center; width: 28px; }
thead th:last-child { text-align: left; }

tbody td {
  padding: 7px 12px;
  border-bottom: 1px solid #EDEDED;
  white-space: nowrap;
  font-size: 10px;
}

.idx { text-align: center; color: #B2BEC3; font-size: 9px; }
.desc { white-space: normal !important; font-weight: 600; max-width: 240px; }
.qty { text-align: center; }
.price { text-align: center; font-family: 'Inter', monospace; }
.amt { text-align: left; font-family: 'Inter', monospace; font-weight: 700; }

/* ── Pill Totals ── */
.totals-wrap {
  padding: 24px 48px 0;
  display: flex;
  justify-content: flex-start;
}

.pills {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 220px;
}

.pill {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  border-radius: 24px;
  font-size: 10px;
}

.pill .lbl { font-weight: 600; }
.pill .val { font-family: 'Inter', monospace; font-weight: 700; font-size: 11px; }

.pill-sub {
  background: #F1F2F6;
  color: #636E72;
}

.pill-disc {
  background: #FFEAEA;
  color: #D63031;
}

.pill-total {
  background: #29ABE2;
  color: #FFFFFF;
}

.pill-total .val { font-size: 15px; }

/* ── Footer ── */
.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: #29ABE2;
}
</style>
</head>
<body>

<div class="diagonal-bg"></div>

<div class="header-content">
  <div class="company-ar">برينتكس للأحبار ولوازم الطباعة</div>
  <div class="company-en">PRINTIX — INKS & PRINTING SUPPLIES</div>
  <div class="contact-line">الجميلية - حلب - سوريا &nbsp;|&nbsp; 00905465301000 &nbsp;|&nbsp; kamalreklam.ist@gmail.com</div>
</div>

<div class="logo-edge">
  <img src="http://localhost:3001/logo-black.png" onerror="this.outerHTML=''" />
</div>

<div class="meta-section">
  <div class="inv-label">فاتورة</div>
  <div class="inv-number">${inv.invoice_number}</div>
  <div class="meta-row">
    <div class="meta-item">
      <div class="label">التاريخ</div>
      <div class="value ltr">${dateStr}</div>
    </div>
    <div class="meta-item">
      <div class="label">العميل</div>
      <div class="value">${inv.client_name}</div>
    </div>
    <div class="meta-item">
      <div class="label">الحالة</div>
      <div class="value" style="color:#29ABE2">${inv.status === 'paid' ? 'مدفوعة' : 'معلّقة'}</div>
    </div>
  </div>
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
  <div class="pills">
    <div class="pill pill-sub">
      <span class="lbl">المجموع الفرعي</span>
      <span class="val">${fmt(inv.subtotal)}</span>
    </div>
    ${hasDiscount ? `<div class="pill pill-disc">
      <span class="lbl">الخصم</span>
      <span class="val">-${fmt(discount)}</span>
    </div>` : ''}
    <div class="pill pill-total">
      <span class="lbl">الإجمالي</span>
      <span class="val">${fmt(inv.total)}</span>
    </div>
  </div>
</div>

<div class="footer"></div>

</body>
</html>`;

  console.log("Generating Design G (Diagonal Slice) PDF via API...");
  const res = await fetch("http://localhost:3001/api/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ html, filename: "design_G_diagonal.pdf" }),
  });

  if (!res.ok) { console.log("ERROR:", res.status, await res.text()); return; }

  const buffer = await res.arrayBuffer();
  const outPath = "C:/Users/ihima/Downloads/design_G_diagonal.pdf";
  fs.writeFileSync(outPath, Buffer.from(buffer));
  console.log(`SUCCESS! ${(buffer.byteLength / 1024).toFixed(1)} KB -> ${outPath}`);
}

main().catch(console.error);
