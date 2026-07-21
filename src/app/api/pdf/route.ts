import { NextRequest, NextResponse } from "next/server";
import type { Page } from "puppeteer-core";

export const maxDuration = 30;

const MAX_HTML_BYTES = 3_000_000; // 3MB — generous for a printable invoice/report, blocks resource-exhaustion abuse

// Only allow the resources the PDF templates actually need (Google Fonts + inline
// data: images/logo). Everything else is blocked at the network layer inside the
// headless browser — this is what actually prevents SSRF via attacker-supplied HTML
// (e.g. <img src="http://169.254.169.254/..."> or requests to internal services).
const ALLOWED_RESOURCE_HOSTS = new Set(["fonts.googleapis.com", "fonts.gstatic.com"]);

async function guardRequests(page: Page, selfOrigin: string) {
  await page.setRequestInterception(true);
  page.on("request", (request) => {
    const url = request.url();
    if (url.startsWith("data:") || url.startsWith("about:")) return request.continue();
    try {
      const parsed = new URL(url);
      if (parsed.origin === selfOrigin && parsed.pathname.startsWith("/logo")) return request.continue();
      if (ALLOWED_RESOURCE_HOSTS.has(parsed.hostname)) return request.continue();
    } catch {
      // fall through to abort
    }
    request.abort();
  });
}

async function generatePdf(html: string, selfOrigin: string) {
  const isVercel = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

  if (isVercel) {
    // Vercel: use puppeteer-core + chromium-min (downloads binary from CDN at runtime)
    const chromium = (await import("@sparticuz/chromium-min")).default;
    const puppeteerCore = await import("puppeteer-core");

    const browser = await puppeteerCore.default.launch({
      args: chromium.args,
      defaultViewport: { width: 794, height: 1123 },
      executablePath: await chromium.executablePath(
        "https://github.com/Sparticuz/chromium/releases/download/v143.0.4/chromium-v143.0.4-pack.x64.tar"
      ),
      headless: true,
    });

    const page = await browser.newPage();
    await guardRequests(page, selfOrigin);
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 20000 });
    await page.evaluateHandle("document.fonts.ready");
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    await browser.close();
    return Buffer.from(pdfBuffer);
  } else {
    // Local dev: use full puppeteer
    const puppeteer = await import("puppeteer");
    const browser = await puppeteer.default.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });

    const page = await browser.newPage();
    await guardRequests(page as unknown as Page, selfOrigin);
    await page.setViewport({ width: 794, height: 1123 });
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 15000 });
    await page.evaluateHandle("document.fonts.ready");
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    await browser.close();
    return Buffer.from(pdfBuffer);
  }
}

// Strip anything unsafe for a Content-Disposition header value: path separators,
// control/CRLF characters (header injection), and cap the length.
function sanitizeFilename(name: unknown): string {
  const base = typeof name === "string" && name.trim() ? name : "document.pdf";
  const cleaned = base
    .replace(/[\r\n]/g, "")
    .replace(/[/\\]/g, "_")
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1f\x7f]/g, "")
    .slice(0, 150)
    .trim();
  return cleaned || "document.pdf";
}

export async function POST(req: NextRequest) {
  try {
    const { html, filename } = await req.json();
    if (!html || typeof html !== "string") {
      return NextResponse.json({ error: "Missing html" }, { status: 400 });
    }
    if (Buffer.byteLength(html, "utf8") > MAX_HTML_BYTES) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    const selfOrigin = req.nextUrl.origin;
    const pdfBuffer = await generatePdf(html, selfOrigin);
    const safeFilename = sanitizeFilename(filename);

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(safeFilename)}"`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("PDF generation error:", message);
    return NextResponse.json(
      { error: "PDF generation failed", details: message },
      { status: 500 }
    );
  }
}
