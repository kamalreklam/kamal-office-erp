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

  // Build ASCII table rows with monospace alignment
  const asciiRows = realItems.map((item, i) => {
    const num = String(i + 1).padStart(2, '0');
    const desc = item.productName;
    const qty = String(item.quantity);
    const price = fmt(item.unitPrice);
    const amount = fmt(item.total);
    return `<div class="trow">` +
      `<span class="tcol-idx">${num}</span>` +
      `<span class="tcol-sep">|</span>` +
      `<span class="tcol-desc">${desc}</span>` +
      `<span class="tcol-sep">|</span>` +
      `<span class="tcol-qty">${qty}</span>` +
      `<span class="tcol-sep">|</span>` +
      `<span class="tcol-price">${price}</span>` +
      `<span class="tcol-sep">|</span>` +
      `<span class="tcol-amt">${amount}</span>` +
      `</div>`;
  }).join("\n");

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
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  color: #F8F8F2;
  background: #1E1E2E;
  direction: ltr;
  padding: 36px 40px 28px;
  min-height: 100vh;
}

/* Override RTL for terminal look — we go LTR but Arabic text still renders RTL naturally */

.line {
  line-height: 1.7;
  white-space: nowrap;
}

.green { color: #50FA7B; }
.yellow { color: #F1FA8C; }
.cyan { color: #8BE9FD; }
.purple { color: #BD93F9; }
.white { color: #F8F8F2; }
.gray { color: #6272A4; }
.orange { color: #FFB86C; }
.red { color: #FF5555; }
.pink { color: #FF79C6; }

.dim { opacity: 0.5; }

.prompt { color: #50FA7B; }
.output { color: #F1FA8C; }

.section-gap {
  height: 14px;
}

.small-gap {
  height: 6px;
}

/* ── ASCII Art Title ── */
.ascii-title {
  color: #8BE9FD;
  font-size: 11px;
  line-height: 1.4;
  font-weight: 700;
  letter-spacing: 2px;
}

/* ── Config Block ── */
.config-line {
  line-height: 1.8;
  white-space: nowrap;
}

.config-key {
  color: #BD93F9;
  display: inline-block;
  min-width: 100px;
}

.config-val {
  color: #F8F8F2;
}

.config-val.ar {
  font-family: 'Cairo', sans-serif;
  font-size: 11px;
}

/* ── Items Table ── */
.table-header {
  color: #6272A4;
  font-size: 9px;
  line-height: 1.7;
  white-space: nowrap;
}

.table-sep {
  color: #6272A4;
  font-size: 9px;
  line-height: 1.4;
  white-space: nowrap;
}

.trow {
  line-height: 1.7;
  white-space: nowrap;
  font-size: 9px;
}

.tcol-idx {
  color: #6272A4;
  display: inline-block;
  width: 30px;
  text-align: right;
}

.tcol-sep {
  color: #44475A;
  display: inline-block;
  width: 16px;
  text-align: center;
}

.tcol-desc {
  color: #F8F8F2;
  display: inline-block;
  width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: 'Cairo', sans-serif;
  font-size: 9px;
  direction: rtl;
  text-align: right;
}

.tcol-qty {
  color: #F1FA8C;
  display: inline-block;
  width: 40px;
  text-align: center;
  white-space: nowrap;
}

.tcol-price {
  color: #F1FA8C;
  display: inline-block;
  width: 70px;
  text-align: right;
  white-space: nowrap;
}

.tcol-amt {
  color: #F1FA8C;
  display: inline-block;
  width: 80px;
  text-align: right;
  font-weight: 700;
  white-space: nowrap;
}

/* ── Summary ── */
.summary-line {
  line-height: 1.8;
  white-space: nowrap;
}

.summary-key {
  color: #BD93F9;
  display: inline-block;
  min-width: 120px;
}

.summary-val {
  color: #F8F8F2;
  font-weight: 700;
}

.summary-val.grand {
  color: #50FA7B;
  font-size: 16px;
  font-weight: 700;
}

/* ── Footer ── */
.footer-area {
  position: fixed;
  bottom: 28px;
  left: 40px;
  right: 40px;
}

.footer-line {
  color: #6272A4;
  font-size: 8px;
  line-height: 1.6;
}

.cursor {
  display: inline-block;
  width: 7px;
  height: 12px;
  background: #50FA7B;
  animation: blink 1s step-end infinite;
  vertical-align: middle;
  margin-left: 4px;
}

@keyframes blink {
  50% { opacity: 0; }
}

.contact-footer {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid #44475A;
  text-align: center;
  font-size: 7px;
  color: #44475A;
  letter-spacing: 1px;
}
</style>
</head>
<body>

<!-- Command prompt -->
<div class="line">
  <span class="green">$ </span><span class="white">printix</span> <span class="purple">--invoice</span> <span class="yellow">${inv.invoice_number}</span> <span class="purple">--date</span> <span class="yellow">${dateStr}</span>
</div>
<div class="line">
  <span class="gray">&gt; </span><span class="output">Generating invoice for <span style="font-family:'Cairo',sans-serif; font-size:11px;">${inv.client_name}</span>...</span>
</div>

<div class="section-gap"></div>

<!-- ASCII Art Title -->
<div class="ascii-title">
╔══════════════════════════════════════════════════════╗<br>
║ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; === PRINTIX === &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;║<br>
║ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; INKS &amp; PRINTING SUPPLIES &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;║<br>
╚══════════════════════════════════════════════════════╝
</div>

<div class="section-gap"></div>

<!-- Company Info -->
<div class="line gray">--- COMPANY INFO ---</div>
<div class="small-gap"></div>
<div class="config-line"><span class="config-key">company:</span>  <span class="config-val ar">برينتكس للأحبار ولوازم الطباعة</span></div>
<div class="config-line"><span class="config-key">address:</span>  <span class="config-val ar">الجميلية - حلب - سوريا</span></div>
<div class="config-line"><span class="config-key">phone:</span>    <span class="config-val">00905465301000</span></div>
<div class="config-line"><span class="config-key">email:</span>    <span class="config-val">kamalreklam.ist@gmail.com</span></div>

<div class="section-gap"></div>

<!-- Invoice Details -->
<div class="line gray">--- INVOICE DETAILS ---</div>
<div class="small-gap"></div>
<div class="config-line"><span class="config-key">invoice:</span>  <span class="config-val cyan">${inv.invoice_number}</span></div>
<div class="config-line"><span class="config-key">date:</span>     <span class="config-val">${dateStr}</span></div>
<div class="config-line"><span class="config-key">client:</span>   <span class="config-val ar">${inv.client_name}</span></div>
<div class="config-line"><span class="config-key">status:</span>   <span class="${inv.status === 'paid' ? 'green' : 'orange'}">&#10003; ${inv.status === 'paid' ? 'PAID' : 'PENDING'}</span></div>

<div class="section-gap"></div>

<!-- Items -->
<div class="line cyan">--- ITEMS (${realItems.length}) ---</div>
<div class="small-gap"></div>

<div class="table-header">
  <span style="display:inline-block;width:30px;text-align:right">#</span><span style="display:inline-block;width:16px;text-align:center">|</span><span style="display:inline-block;width:280px;text-align:center">DESCRIPTION</span><span style="display:inline-block;width:16px;text-align:center">|</span><span style="display:inline-block;width:40px;text-align:center">QTY</span><span style="display:inline-block;width:16px;text-align:center">|</span><span style="display:inline-block;width:70px;text-align:center">PRICE</span><span style="display:inline-block;width:16px;text-align:center">|</span><span style="display:inline-block;width:80px;text-align:center">AMOUNT</span>
</div>
<div class="table-sep">
  ------+------------------------------------------------+------+----------+----------
</div>

${asciiRows}

<div class="section-gap"></div>

<!-- Summary -->
<div class="line cyan">--- SUMMARY ---</div>
<div class="small-gap"></div>
<div class="summary-line"><span class="summary-key">SUBTOTAL:</span>  <span class="summary-val">${fmt(inv.subtotal)}</span></div>
<div class="summary-line"><span class="summary-key">TOTAL:</span>     <span class="summary-val grand">${fmt(inv.total)}</span></div>

<div class="section-gap"></div>

<div class="line">
  <span class="gray">[Process completed successfully]</span> <span class="green">EXIT_CODE: 0</span><span class="cursor"></span>
</div>

<!-- Footer -->
<div class="footer-area">
  <div class="footer-line gray">
    // Generated by PRINTIX Invoice System v2.0.0<br>
    // Timestamp: ${new Date().toISOString()}<br>
    // Runtime: node ${process.version}
  </div>
  <div class="contact-footer">
    الجميلية - حلب - سوريا &bull; 00905465301000 &bull; kamalreklam.ist@gmail.com
  </div>
</div>

</body>
</html>`;

  console.log("Generating Design N (Terminal / Code) PDF via API...");
  const res = await fetch("http://localhost:3001/api/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ html, filename: "design_N_terminal.pdf" }),
  });

  if (!res.ok) { console.log("ERROR:", res.status, await res.text()); return; }

  const buffer = await res.arrayBuffer();
  const outPath = "C:/Users/ihima/Downloads/design_N_terminal.pdf";
  fs.writeFileSync(outPath, Buffer.from(buffer));
  console.log(`SUCCESS! ${(buffer.byteLength / 1024).toFixed(1)} KB -> ${outPath}`);
}

main().catch(console.error);
