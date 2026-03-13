"use client";

import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

/**
 * Export invoice as PDF — high-quality silent auto-download.
 * Uses PNG (not JPEG) for crisp Arabic text, scale 3x for retina quality,
 * and supports multi-page for long invoices.
 */
export async function exportInvoicePDF(elementId: string, invoiceNumber: string) {
  const element = document.getElementById(elementId);
  if (!element) return;

  // A4 dimensions in mm
  const a4Width = 210;
  const a4Height = 297;
  const margin = 8;
  const contentWidth = a4Width - margin * 2;
  const contentHeight = a4Height - margin * 2;

  const canvas = await html2canvas(element, {
    scale: 3,
    useCORS: true,
    backgroundColor: "#ffffff",
    width: element.scrollWidth,
    height: element.scrollHeight,
    logging: false,
  });

  const imgWidth = contentWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  const pdf = new jsPDF("p", "mm", "a4");

  if (imgHeight <= contentHeight) {
    // Single page
    const imgData = canvas.toDataURL("image/png");
    pdf.addImage(imgData, "PNG", margin, margin, imgWidth, imgHeight);
  } else {
    // Multi-page: slice the canvas into page-sized chunks
    const pageCanvasHeight = (contentHeight * canvas.width) / contentWidth;
    let remainingHeight = canvas.height;
    let srcY = 0;
    let page = 0;

    while (remainingHeight > 0) {
      if (page > 0) pdf.addPage();

      const sliceHeight = Math.min(pageCanvasHeight, remainingHeight);
      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeight;

      const ctx = pageCanvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(
          canvas,
          0, srcY, canvas.width, sliceHeight,
          0, 0, canvas.width, sliceHeight
        );
      }

      const pageImgData = pageCanvas.toDataURL("image/png");
      const pageImgHeight = (sliceHeight * imgWidth) / canvas.width;
      pdf.addImage(pageImgData, "PNG", margin, margin, imgWidth, pageImgHeight);

      srcY += sliceHeight;
      remainingHeight -= sliceHeight;
      page++;
    }
  }

  pdf.save(`${invoiceNumber}.pdf`);
}

/**
 * Share invoice text summary via WhatsApp.
 */
export function shareInvoiceWhatsApp(message: string) {
  const text = encodeURIComponent(message);
  window.open(`https://wa.me/?text=${text}`, "_blank");
}
