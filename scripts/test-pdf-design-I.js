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
  padding: 40px 44px 32px;
}

/* ── Masthead ── */
.masthead {
  text-align: center;
  padding-bottom: 12px;
}

.masthead-name {
  font-size: 48px;
  font-weight: 800;
  color: #2D3436;
  line-height: 1.1;
  letter-spacing: -1px;
}

.masthead-sub {
  font-size: 11px;
  color: #636E72;
  font-weight: 600;
  letter-spacing: 2px;
  margin-top: 2px;
}

.masthead-logo {
  margin-top: 8px;
}

.masthead-logo img {
  height: 32px;
  opacity: 0.6;
}

/* Double line separator */
.double-line {
  border: none;
  border-top: 2px solid #2D3436;
  margin: 0 0 3px 0;
}

.double-line-2 {
  border: none;
  border-top: 0.5px solid #2D3436;
  margin: 0 0 20px 0;
}

/* ── Two-Column Layout ── */
.columns {
  display: flex;
  gap: 28px;
  min-height: 680px;
}

.col-right {
  flex: 6;
  border-left: 1px solid #DFE6E9;
  padding-left: 24px;
}

.col-left {
  flex: 4;
}

/* Article sections */
.article {
  margin-bottom: 20px;
}

.article-heading {
  font-size: 10px;
  font-weight: 700;
  color: #29ABE2;
  margin-bottom: 6px;
  padding-bottom: 4px;
  border-bottom: 1px solid #DFE6E9;
  letter-spacing: 0.5px;
}

.article-body {
  font-size: 10px;
  line-height: 1.8;
  color: #2D3436;
}

.article-body .field {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
}

.article-body .field .label {
  color: #636E72;
  font-size: 9px;
}

.article-body .field .value {
  font-weight: 700;
  font-family: 'Inter', sans-serif;
  direction: ltr;
}

.article-body .field .value.ar {
  font-family: 'Cairo', sans-serif;
  direction: rtl;
}

/* ── Table (right column) ── */
table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 4px;
}

thead th {
  background: transparent;
  color: #29ABE2;
  padding: 8px 8px;
  font-size: 8px;
  font-weight: 700;
  text-align: right;
  white-space: nowrap;
  border-bottom: 1px solid #2D3436;
  text-transform: uppercase;
  letter-spacing: 1px;
}

thead th:first-child { text-align: center; width: 24px; }
thead th:last-child { text-align: left; }

tbody td {
  padding: 7px 8px;
  border-bottom: 1px solid #F1F2F6;
  white-space: nowrap;
  font-size: 10px;
}

.idx { text-align: center; color: #B2BEC3; font-size: 9px; }
.desc { white-space: normal !important; font-weight: 600; max-width: 200px; }
.qty { text-align: center; font-family: 'Inter', monospace; }
.price { text-align: center; font-family: 'Inter', monospace; }
.amt { text-align: left; font-family: 'Inter', monospace; font-weight: 700; }

/* ── Grand Total Headline ── */
.grand-headline {
  margin-top: 20px;
  padding-top: 12px;
  border-top: 1px solid #2D3436;
  text-align: left;
}

.grand-label {
  font-size: 9px;
  color: #636E72;
  font-weight: 600;
}

.grand-value {
  font-size: 32px;
  font-weight: 800;
  color: #29ABE2;
  font-family: 'Inter', sans-serif;
  direction: ltr;
  text-align: left;
  letter-spacing: -1px;
}

/* Totals detail in left column */
.totals-detail .tot-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid #F1F2F6;
}

.totals-detail .tot-row:last-child { border-bottom: none; }
.totals-detail .lbl { font-size: 9px; color: #636E72; }
.totals-detail .val { font-family: 'Inter', monospace; font-weight: 700; font-size: 11px; }

/* ── Footer ── */
.footer {
  position: fixed;
  bottom: 28px;
  left: 44px;
  right: 44px;
}

.footer .double-line { margin-bottom: 3px; }
.footer .double-line-2 { margin-bottom: 8px; }

.footer-text {
  text-align: center;
  font-size: 7.5px;
  color: #B2BEC3;
}
</style>
</head>
<body>

<!-- Masthead -->
<div class="masthead">
  <div class="masthead-logo"><img src="http://localhost:3001/logo-black.png" onerror="this.outerHTML=''" /></div>
  <div class="masthead-name">برينتكس</div>
  <div class="masthead-sub">للأحبار ولوازم الطباعة</div>
</div>

<hr class="double-line">
<hr class="double-line-2">

<!-- Two-Column Content -->
<div class="columns">

  <!-- Right Column: Items + Grand Total -->
  <div class="col-right">
    <div class="article">
      <div class="article-heading">بنود الفاتورة</div>
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

    <div class="grand-headline">
      <div class="grand-label">الإجمالي الكلّي</div>
      <div class="grand-value">${fmt(inv.total)}</div>
    </div>
  </div>

  <!-- Left Column: Meta + Client + Totals -->
  <div class="col-left">

    <div class="article">
      <div class="article-heading">بيانات الفاتورة</div>
      <div class="article-body">
        <div class="field">
          <span class="label">رقم الفاتورة</span>
          <span class="value">${inv.invoice_number}</span>
        </div>
        <div class="field">
          <span class="label">التاريخ</span>
          <span class="value">${dateStr}</span>
        </div>
        <div class="field">
          <span class="label">الحالة</span>
          <span class="value ar" style="color:#29ABE2">${inv.status === 'paid' ? 'مدفوعة' : 'معلّقة'}</span>
        </div>
      </div>
    </div>

    <div class="article">
      <div class="article-heading">العميل</div>
      <div class="article-body">
        <div class="field">
          <span class="label">الاسم</span>
          <span class="value ar">${inv.client_name}</span>
        </div>
        <div class="field">
          <span class="label">المدينة</span>
          <span class="value ar">${inv.client_city || 'حلب'}</span>
        </div>
      </div>
    </div>

    <div class="article">
      <div class="article-heading">ملخّص الحساب</div>
      <div class="totals-detail">
        <div class="tot-row">
          <span class="lbl">المجموع الفرعي</span>
          <span class="val">${fmt(inv.subtotal)}</span>
        </div>
        <div class="tot-row">
          <span class="lbl">الإجمالي</span>
          <span class="val" style="color:#29ABE2; font-size:14px">${fmt(inv.total)}</span>
        </div>
      </div>
    </div>

    <div class="article">
      <div class="article-heading">معلومات الشركة</div>
      <div class="article-body" style="font-size:8px; color:#636E72; line-height:2">
        برينتكس للأحبار ولوازم الطباعة<br>
        الجميلية - حلب - سوريا<br>
        00905465301000<br>
        kamalreklam.ist@gmail.com
      </div>
    </div>

  </div>

</div>

<!-- Footer -->
<div class="footer">
  <hr class="double-line">
  <hr class="double-line-2">
  <div class="footer-text">PRINTIX — INKS & PRINTING SUPPLIES &nbsp;&bull;&nbsp; شكراً لتعاملكم معنا</div>
</div>

</body>
</html>`;

  console.log("Generating Design I (Newspaper Column) PDF via API...");
  const res = await fetch("http://localhost:3001/api/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ html, filename: "design_I_newspaper.pdf" }),
  });

  if (!res.ok) { console.log("ERROR:", res.status, await res.text()); return; }

  const buffer = await res.arrayBuffer();
  const outPath = "C:/Users/ihima/Downloads/design_I_newspaper.pdf";
  fs.writeFileSync(outPath, Buffer.from(buffer));
  console.log(`SUCCESS! ${(buffer.byteLength / 1024).toFixed(1)} KB -> ${outPath}`);
}

main().catch(console.error);
