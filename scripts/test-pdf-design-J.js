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

  // Generate fake barcode lines
  const barcodeWidths = [2,1,3,1,2,1,1,3,2,1,1,2,3,1,2,1,1,3,1,2,1,2,3,1,1,2,1,3,2,1,1,2,1,3,1,2,2,1,3,1,2,1,1,3,2,1];
  const barcode = barcodeWidths.map(w =>
    `<div style="display:inline-block;width:${w}px;height:36px;background:${Math.random()>0.4?'#2D3436':'transparent'};margin:0 0.5px"></div>`
  ).join('');

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
  padding: 0;
}

/* ── Stub (tear-off top) ── */
.stub {
  background: #F0F9FF;
  padding: 32px 48px 24px;
  border-bottom: 2px dashed #B2BEC3;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stub-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stub-right img {
  height: 44px;
}

.stub-brand {
  font-size: 18px;
  font-weight: 800;
  color: #2D3436;
}

.stub-brand-sub {
  font-size: 7px;
  color: #636E72;
  letter-spacing: 2px;
  font-weight: 600;
}

.stub-left {
  text-align: left;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.stub-invoice-label {
  font-size: 10px;
  color: #29ABE2;
  font-weight: 700;
  letter-spacing: 1px;
}

.stub-invoice-num {
  font-size: 28px;
  font-weight: 800;
  font-family: 'Inter', sans-serif;
  color: #2D3436;
  direction: ltr;
  line-height: 1.1;
}

.stub-meta {
  display: flex;
  gap: 20px;
  margin-top: 4px;
}

.stub-meta span {
  font-size: 9px;
  color: #636E72;
}

.stub-meta span strong {
  color: #2D3436;
  font-weight: 700;
}

/* ── From / To Section ── */
.from-to {
  display: flex;
  padding: 28px 48px 20px;
  gap: 24px;
  align-items: flex-start;
}

.from-box, .to-box {
  flex: 1;
  padding: 16px 20px;
  border-radius: 10px;
  background: #F8F9FA;
}

.ft-label {
  font-size: 9px;
  font-weight: 700;
  color: #29ABE2;
  margin-bottom: 6px;
  letter-spacing: 1px;
}

.ft-name {
  font-size: 14px;
  font-weight: 800;
  color: #2D3436;
  margin-bottom: 4px;
}

.ft-detail {
  font-size: 9px;
  color: #636E72;
  line-height: 1.8;
}

.arrow-col {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 20px;
  font-size: 24px;
  color: #29ABE2;
  min-width: 40px;
}

/* ── Table ── */
.table-section {
  padding: 0 48px;
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead th {
  background: transparent;
  color: #636E72;
  padding: 8px 10px;
  font-size: 9px;
  font-weight: 700;
  text-align: right;
  white-space: nowrap;
  border-bottom: 1px solid #2D3436;
  text-decoration: underline;
  text-underline-offset: 4px;
}

thead th:first-child { text-align: center; width: 24px; }
thead th:last-child { text-align: left; }

tbody td {
  padding: 7px 10px;
  border-bottom: 1px solid #F1F2F6;
  white-space: nowrap;
  font-size: 10px;
}

.idx { text-align: center; color: #B2BEC3; font-size: 9px; }
.desc { white-space: normal !important; font-weight: 600; max-width: 220px; }
.qty { text-align: center; }
.price { text-align: center; font-family: 'Inter', monospace; }
.amt { text-align: left; font-family: 'Inter', monospace; font-weight: 700; }

/* ── Total Badge ── */
.total-section {
  padding: 24px 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.subtotal-line {
  font-size: 9px;
  color: #636E72;
  margin-bottom: 8px;
}

.subtotal-line strong {
  font-family: 'Inter', monospace;
  font-weight: 700;
  color: #2D3436;
  font-size: 11px;
  margin-right: 8px;
}

.total-badge {
  background: #29ABE2;
  color: #FFFFFF;
  padding: 14px 40px;
  border-radius: 32px;
  text-align: center;
}

.total-badge .label {
  font-size: 9px;
  opacity: 0.8;
  font-weight: 600;
}

.total-badge .value {
  font-size: 24px;
  font-weight: 800;
  font-family: 'Inter', sans-serif;
  direction: ltr;
  letter-spacing: -0.5px;
}

/* ── Barcode ── */
.barcode-section {
  position: fixed;
  bottom: 32px;
  left: 48px;
  right: 48px;
  text-align: center;
}

.barcode-lines {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  margin-bottom: 6px;
}

.barcode-number {
  font-family: 'Inter', monospace;
  font-size: 10px;
  color: #636E72;
  letter-spacing: 4px;
  direction: ltr;
}
</style>
</head>
<body>

<!-- Stub / Tear-off Top -->
<div class="stub">
  <div class="stub-right">
    <img src="http://localhost:3001/logo-black.png" onerror="this.outerHTML=''" />
    <div>
      <div class="stub-brand">برينتكس</div>
      <div class="stub-brand-sub">PRINTIX — INKS & PRINTING SUPPLIES</div>
    </div>
  </div>
  <div class="stub-left">
    <div class="stub-invoice-label">فاتورة</div>
    <div class="stub-invoice-num">${inv.invoice_number}</div>
    <div class="stub-meta">
      <span>التاريخ: <strong>${dateStr}</strong></span>
      <span>الحالة: <strong style="color:#29ABE2">${inv.status === 'paid' ? 'مدفوعة' : 'معلّقة'}</strong></span>
    </div>
  </div>
</div>

<!-- From / To -->
<div class="from-to">
  <div class="from-box">
    <div class="ft-label">من</div>
    <div class="ft-name">برينتكس للأحبار</div>
    <div class="ft-detail">
      الجميلية - حلب - سوريا<br>
      00905465301000<br>
      kamalreklam.ist@gmail.com
    </div>
  </div>
  <div class="arrow-col">&#8592;</div>
  <div class="to-box">
    <div class="ft-label">إلى</div>
    <div class="ft-name">${inv.client_name}</div>
    <div class="ft-detail">${inv.client_city || 'حلب'} - سوريا</div>
  </div>
</div>

<!-- Items Table -->
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

<!-- Total Badge -->
<div class="total-section">
  <div class="subtotal-line">المجموع الفرعي: <strong>${fmt(inv.subtotal)}</strong></div>
  <div class="total-badge">
    <div class="label">الإجمالي</div>
    <div class="value">${fmt(inv.total)}</div>
  </div>
</div>

<!-- Barcode -->
<div class="barcode-section">
  <div class="barcode-lines">${barcode}</div>
  <div class="barcode-number">${inv.invoice_number}</div>
</div>

</body>
</html>`;

  console.log("Generating Design J (Boarding Pass) PDF via API...");
  const res = await fetch("http://localhost:3001/api/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ html, filename: "design_J_boarding.pdf" }),
  });

  if (!res.ok) { console.log("ERROR:", res.status, await res.text()); return; }

  const buffer = await res.arrayBuffer();
  const outPath = "C:/Users/ihima/Downloads/design_J_boarding.pdf";
  fs.writeFileSync(outPath, Buffer.from(buffer));
  console.log(`SUCCESS! ${(buffer.byteLength / 1024).toFixed(1)} KB -> ${outPath}`);
}

main().catch(console.error);
