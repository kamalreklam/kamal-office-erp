import { NextRequest, NextResponse } from "next/server";

// Increase serverless function timeout for PDF generation
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { html, filename } = await req.json();

    if (!html) {
      return NextResponse.json({ error: "Missing html" }, { status: 400 });
    }

    let browser;

    // Use @sparticuz/chromium on Vercel (serverless), full puppeteer locally
    const isVercel = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;

    if (isVercel) {
      const chromium = (await import("@sparticuz/chromium")).default;
      const puppeteerCore = await import("puppeteer-core");
      browser = await puppeteerCore.default.launch({
        args: chromium.args,
        defaultViewport: { width: 794, height: 1123 },
        executablePath: await chromium.executablePath(),
        headless: true,
      } as any);
    } else {
      // Local development — use full puppeteer
      const puppeteer = await import("puppeteer");
      browser = await puppeteer.default.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
      });
    }

    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123 });
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 15000 });
    await page.evaluateHandle("document.fonts.ready");

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });

    await browser.close();

    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename || "invoice.pdf")}"`,
      },
    });
  } catch (error: any) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "PDF generation failed", details: error.message },
      { status: 500 }
    );
  }
}
