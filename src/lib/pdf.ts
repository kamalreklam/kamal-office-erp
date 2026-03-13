"use client";

import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

/**
 * Export invoice as PDF — auto-downloads without print dialog.
 * Renders to a single A4 page.
 */
export async function exportInvoicePDF(elementId: string, invoiceNumber: string) {
  const element = document.getElementById(elementId);
  if (!element) return;

  // A4 dimensions in mm
  const a4Width = 210;
  const a4Height = 297;
  const pxPerMm = 3.78; // ~96 DPI

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    width: element.scrollWidth,
    height: element.scrollHeight,
  });

  const imgData = canvas.toDataURL("image/jpeg", 0.95);
  const imgWidth = a4Width - 20; // 10mm margin each side
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  const pdf = new jsPDF("p", "mm", "a4");
  pdf.addImage(imgData, "JPEG", 10, 10, imgWidth, Math.min(imgHeight, a4Height - 20));

  pdf.save(`${invoiceNumber}.pdf`);
}

/**
 * Share invoice text summary via WhatsApp.
 */
export function shareInvoiceWhatsApp(message: string) {
  const text = encodeURIComponent(message);
  window.open(`https://wa.me/?text=${text}`, "_blank");
}
