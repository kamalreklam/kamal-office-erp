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

:root {
  --brand: #29ABE2;
  --brand-dark: #1B8AC2;
  --brand-light: #E8F6FC;
  --ink: #2D3436;
  --ink-soft: #636E72;
  --ink-muted: #B2BEC3;
  --bg: #FAFBFC;
  --border: #EDF2F7;
  --white: #FFFFFF;
}

body {
  font-family: 'Cairo', 'Inter', sans-serif;
  font-size: 10px;
  color: var(--ink);
  background: var(--white);
  direction: rtl;
}

/* ── Accent top bar ── */
.top-bar { height: 6px; background: linear-gradient(to left, var(--brand), var(--brand-dark), #1a1a2e); }

/* ── Header ── */
.header {
  padding: 24px 32px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.brand { display: flex; align-items: center; gap: 14px; }
.brand img { height: 48px; }
.brand-text .name-ar { font-size: 16px; font-weight: 800; color: var(--ink); }
.brand-text .name-en { font-size: 9px; font-weight: 600; color: var(--ink-soft); letter-spacing: 1px; margin-top: 1px; }
.brand-text .addr { font-size: 7.5px; color: var(--ink-muted); margin-top: 3px; }

.inv-badge {
  background: var(--brand-light);
  border: 1px solid #C8E6F5;
  border-radius: 10px;
  padding: 12px 20px;
  text-align: center;
}
.inv-badge .lbl { font-size: 7px; color: var(--brand-dark); font-weight: 700; letter-spacing: 1.5px; margin-bottom: 3px; }
.inv-badge .num { font-family: 'Inter', sans-serif; font-size: 18px; font-weight: 700; color: var(--brand-dark); direction: ltr; }
.inv-badge .date { font-size: 9px; color: var(--ink-muted); margin-top: 3px; }

/* ── Divider ── */
.divider { height: 1px; background: var(--border); margin: 0 32px; }

/* ── Client & Meta ── */
.info-section {
  padding: 16px 32px;
  display: flex;
  gap: 24px;
}
.info-card {
  flex: 1;
  padding: 12px 16px;
  background: var(--bg);
  border-radius: 8px;
  border: 1px solid var(--border);
}
.info-card .card-label { font-size: 7px; font-weight: 700; color: var(--ink-muted); letter-spacing: 1px; margin-bottom: 4px; }
.info-card .card-value { font-size: 13px; font-weight: 700; color: var(--ink); }
.info-card .card-sub { font-size: 8px; color: var(--ink-soft); margin-top: 2px; }
.status {
  display: inline-block;
  padding: 3px 12px;
  border-radius: 20px;
  font-size: 8px;
  font-weight: 700;
}
.status-paid { background: #D4EFDF; color: #27AE60; }
.status-unpaid { background: #FDEBD0; color: #E67E22; }
.status-draft { background: #EAECEE; color: #7F8C8D; }

/* ── Table ── */
.table-wrap { padding: 12px 32px; }
table { width: 100%; border-collapse: collapse; }
thead th {
  background: var(--brand);
  color: var(--white);
  padding: 9px 12px;
  font-size: 8px;
  font-weight: 700;
  text-align: right;
  white-space: nowrap;
}
thead th:first-child { border-radius: 0 6px 0 0; text-align: center; width: 28px; }
thead th:last-child { border-radius: 6px 0 0 0; text-align: left; }
tbody td { padding: 8px 12px; border-bottom: 1px solid var(--border); white-space: nowrap; font-size: 10px; }
tbody tr:nth-child(even) { background: #F8FCFE; }
.idx { text-align: center; color: var(--ink-muted); font-size: 9px; }
.desc { white-space: normal !important; font-weight: 600; max-width: 240px; }
.qty { text-align: center; }
.price { text-align: center; font-family: 'Inter', monospace; font-size: 10px; }
.amt { text-align: left; font-family: 'Inter', monospace; font-weight: 700; font-size: 10px; }

/* ── Totals ── */
.totals-wrap { padding: 10px 32px; display: flex; justify-content: flex-start; }
.totals {
  width: 240px;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}
.tot-row { display: flex; justify-content: space-between; padding: 8px 14px; border-bottom: 1px solid var(--border); }
.tot-row:last-child { border-bottom: none; }
.tot-row .lbl { font-size: 9px; color: var(--ink-soft); }
.tot-row .val { font-family: 'Inter', monospace; font-size: 10px; font-weight: 700; }
.tot-row.grand {
  background: var(--brand);
  padding: 10px 14px;
}
.tot-row.grand .lbl { color: rgba(255,255,255,.85); font-weight: 700; }
.tot-row.grand .val { color: var(--white); font-size: 15px; }
.discount { color: #E74C3C; }

/* ── Notes ── */
.notes-box {
  margin: 10px 32px;
  padding: 10px 14px;
  background: var(--bg);
  border-right: 3px solid var(--brand);
  border-radius: 0 6px 6px 0;
}
.notes-box .n-lbl { font-size: 7px; font-weight: 700; color: var(--ink-muted); letter-spacing: 1px; margin-bottom: 2px; }
.notes-box .n-txt { font-size: 9px; color: var(--ink-soft); }

/* ── Footer ── */
.footer {
  margin-top: 16px;
  padding: 10px 32px;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.footer span { font-size: 7px; color: var(--ink-muted); }

/* ── Bottom bar ── */
.bottom-bar { height: 4px; background: linear-gradient(to left, var(--brand), var(--brand-dark), #1a1a2e); }
</style>
</head>
<body>

<div class="top-bar"></div>

<div class="header">
  <div class="brand">
    <img src="http://localhost:3001/logo.png" onerror="this.outerHTML=''" />
    <div class="brand-text">
      <div class="name-ar">برينتكس للأحبار ولوازم الطباعة</div>
      <div class="name-en">PRINTIX — INKS & PRINTING SUPPLIES</div>
      <div class="addr">الجميلية - حلب - سوريا &nbsp;|&nbsp; 00905465301000 &nbsp;|&nbsp; kamalreklam.ist@gmail.com</div>
    </div>
  </div>
  <div class="inv-badge">
    <div class="lbl">فاتورة &nbsp; INVOICE</div>
    <div class="num">${inv.invoice_number}</div>
    <div class="date">${dateStr}</div>
  </div>
</div>

<div class="divider"></div>

<div class="info-section">
  <div class="info-card">
    <div class="card-label">العميل &nbsp; CUSTOMER</div>
    <div class="card-value">${inv.client_name}</div>
    <div class="card-sub">حلب</div>
  </div>
  <div class="info-card">
    <div class="card-label">مندوب المبيعات &nbsp; SALESPERSON</div>
    <div class="card-value">BILAL TARRAB</div>
  </div>
  <div class="info-card" style="flex:0.6">
    <div class="card-label">الحالة &nbsp; STATUS</div>
    <div class="status status-paid">${inv.status}</div>
  </div>
</div>

<div class="table-wrap">
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>الوصف &nbsp;<span style="font-weight:400;opacity:.6">Description</span></th>
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
      <span class="lbl">المجموع الفرعي &nbsp; Subtotal</span>
      <span class="val">${fmt(inv.subtotal)}</span>
    </div>
    <div class="tot-row grand">
      <span class="lbl">الإجمالي &nbsp; Total</span>
      <span class="val">${fmt(inv.total)}</span>
    </div>
  </div>
</div>

<div class="footer">
  <span>شكراً لتعاملكم معنا &nbsp;|&nbsp; Thank you for your business</span>
  <span>kamalreklam.ist@gmail.com &nbsp;|&nbsp; 00905465301000 &nbsp;|&nbsp; الجميلية - حلب - سوريا</span>
</div>

<div class="bottom-bar"></div>

</body>
</html>`;

  console.log("Generating PDF via API...");
  const res = await fetch("http://localhost:3001/api/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ html, filename: "S00047_modern.pdf" }),
  });

  if (!res.ok) { console.log("ERROR:", res.status, await res.text()); return; }

  const buffer = await res.arrayBuffer();
  const outPath = "C:/Users/ihima/Downloads/S00047_modern_invoice.pdf";
  fs.writeFileSync(outPath, Buffer.from(buffer));
  console.log(`SUCCESS! ${(buffer.byteLength / 1024).toFixed(1)} KB -> ${outPath}`);
}

main().catch(console.error);
