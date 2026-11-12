import { jsPDF } from 'jspdf';
import type { QuoteWithCustomer, QuoteLineItem, Invoice, Customer, Workspace } from '../types/database';

export interface InvoiceWithCustomer extends Invoice {
  customer?: Customer | null;
  customers?: Customer | null;
  line_items?: QuoteLineItem[];
}

/**
 * Clean one-page PDF generator for Quotes and Invoices.
 */
export function exportQuotePDF(
  quote: QuoteWithCustomer,
  workspace: Workspace | null,
  lineItems: QuoteLineItem[] = []
): void {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const margin = 16;
  let y = 18;

  // 1. Header: Business Info (Left) & Document Meta (Right)
  // Business Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(30, 58, 138); // Blue 900
  doc.text(workspace?.business_name || 'TradeQuote AI', margin, y);

  // Document Type Header (Right)
  doc.setFontSize(22);
  doc.setTextColor(17, 24, 39); // Gray 900
  doc.text('QUOTE / ESTIMATE', pageWidth - margin, y, { align: 'right' });

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128); // Gray 500
  if (workspace?.trade_type) {
    doc.text(`${workspace.trade_type} Trade Specialists`, margin, y);
  }
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235); // Blue 600
  doc.text(quote.quote_number, pageWidth - margin, y, { align: 'right' });

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  if (workspace?.phone) {
    doc.text(`Phone: ${workspace.phone}`, margin, y);
  }
  const createdDate = new Date(quote.created_at || Date.now()).toLocaleDateString();
  doc.text(`Date: ${createdDate}`, pageWidth - margin, y, { align: 'right' });

  y += 5;
  if (workspace?.email) {
    doc.text(`Email: ${workspace.email}`, margin, y);
  }
  const statusUpper = (quote.status || 'draft').toUpperCase();
  doc.setFont('helvetica', 'bold');
  if (statusUpper === 'ACCEPTED') {
    doc.setTextColor(16, 185, 129); // Emerald 500
  } else if (statusUpper === 'SENT') {
    doc.setTextColor(59, 130, 246); // Blue 500
  } else {
    doc.setTextColor(107, 114, 128);
  }
  doc.text(`Status: ${statusUpper}`, pageWidth - margin, y, { align: 'right' });

  // Divider
  y += 8;
  doc.setDrawColor(229, 231, 235); // Gray 200
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);

  // 2. Client Section
  y += 8;
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.roundedRect(margin, y, pageWidth - margin * 2, 24, 2, 2, 'F');

  const customer = quote.customer || quote.customers;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.text('CLIENT / ESTIMATE FOR:', margin + 4, y + 6);

  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39);
  doc.text(customer?.name || 'Valued Customer', margin + 4, y + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  const clientContact = [customer?.phone, customer?.email].filter(Boolean).join('  |  ');
  if (clientContact) {
    doc.text(clientContact, margin + 4, y + 17);
  }
  if (customer?.address) {
    doc.text(customer.address, margin + 4, y + 21);
  }

  // Quote Title / Work Summary
  y += 28;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 58, 138);
  doc.text('Job Title / Scope:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(17, 24, 39);
  doc.text(quote.title || 'HVAC Maintenance & Services', margin + 35, y);

  // 3. Line Items Table
  y += 6;
  const colDesc = margin;
  const colQty = margin + 105;
  const colUnit = margin + 120;
  const colPrice = margin + 142;
  const colTotal = pageWidth - margin;

  // Table Header
  doc.setFillColor(241, 245, 249); // Slate 100
  doc.rect(margin, y, pageWidth - margin * 2, 7, 'F');
  doc.setDrawColor(203, 213, 225); // Slate 300
  doc.line(margin, y + 7, pageWidth - margin, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('ITEM & DESCRIPTION', colDesc + 2, y + 5);
  doc.text('QTY', colQty, y + 5, { align: 'center' });
  doc.text('UNIT', colUnit, y + 5, { align: 'center' });
  doc.text('UNIT PRICE', colPrice, y + 5, { align: 'right' });
  doc.text('TOTAL', colTotal - 2, y + 5, { align: 'right' });

  y += 7;
  const items = lineItems.length > 0 ? lineItems : (quote.quote_line_items || []);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);

  items.forEach((item, index) => {
    const rowY = y + index * 7;
    // Alternate row fill
    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, rowY, pageWidth - margin * 2, 7, 'F');
    }
    doc.setTextColor(17, 24, 39);
    doc.text(item.description.substring(0, 50), colDesc + 2, rowY + 5);
    doc.setTextColor(71, 85, 105);
    doc.text(String(item.quantity), colQty, rowY + 5, { align: 'center' });
    doc.text(item.unit || 'each', colUnit, rowY + 5, { align: 'center' });
    doc.text(`$${Number(item.unit_price).toFixed(2)}`, colPrice, rowY + 5, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(17, 24, 39);
    doc.text(`$${Number(item.line_total).toFixed(2)}`, colTotal - 2, rowY + 5, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    doc.setDrawColor(241, 245, 249);
    doc.line(margin, rowY + 7, pageWidth - margin, rowY + 7);
  });

  y += Math.max(items.length * 7 + 4, 15);

  // 4. Totals Box (Right aligned)
  const boxWidth = 75;
  const boxX = pageWidth - margin - boxWidth;
  const subtotal = Number(quote.subtotal) || items.reduce((acc, it) => acc + Number(it.line_total), 0);
  const taxPercent = Number(quote.tax_percent) || 0;
  const taxAmount = (subtotal * taxPercent) / 100;
  const total = Number(quote.total) || subtotal + taxAmount;

  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('Subtotal:', boxX, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39);
  doc.text(`$${subtotal.toFixed(2)}`, pageWidth - margin - 2, y, { align: 'right' });

  if (taxPercent > 0) {
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Tax (${taxPercent}%):`, boxX, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(17, 24, 39);
    doc.text(`$${taxAmount.toFixed(2)}`, pageWidth - margin - 2, y, { align: 'right' });
  }

  y += 6;
  doc.setFillColor(30, 58, 138); // Blue 900
  doc.roundedRect(boxX - 2, y - 4, boxWidth + 2, 10, 1.5, 1.5, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL:', boxX + 2, y + 2.5);
  doc.text(`$${total.toFixed(2)} ${workspace?.currency || 'USD'}`, pageWidth - margin - 2, y + 2.5, { align: 'right' });

  // 5. Notes / Terms (Left side)
  y += 14;
  if (quote.notes) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text('TERMS & NOTES:', margin, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    const splitNotes = doc.splitTextToSize(quote.notes, 120);
    doc.text(splitNotes, margin, y);
    y += splitNotes.length * 4;
  }

  // Footer
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // Slate 400
  doc.text('Thank you for choosing TradeQuote AI. Please contact us with any questions.', pageWidth / 2, 285, { align: 'center' });

  // Trigger Save/Download
  doc.save(`Quote-${quote.quote_number || 'TQ-1001'}.pdf`);
}

/**
 * Clean one-page PDF generator for Invoices.
 */
export function exportInvoicePDF(
  invoice: InvoiceWithCustomer,
  workspace: Workspace | null,
  lineItems: QuoteLineItem[] = []
): void {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  let y = 18;

  // 1. Header: Business Info (Left) & Document Meta (Right)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text(workspace?.business_name || 'TradeQuote AI Services', margin, y);

  doc.setFontSize(24);
  doc.setTextColor(30, 58, 138); // Blue 900
  doc.text('INVOICE', pageWidth - margin, y, { align: 'right' });

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  if (workspace?.trade_type) {
    doc.text(`${workspace.trade_type} Licensed Contractor`, margin, y);
  }
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235); // Blue 600
  doc.text(invoice.invoice_number, pageWidth - margin, y, { align: 'right' });

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  if (workspace?.phone) {
    doc.text(`Phone: ${workspace.phone}`, margin, y);
  }
  const createdDate = new Date(invoice.created_at || Date.now()).toLocaleDateString();
  doc.text(`Invoice Date: ${createdDate}`, pageWidth - margin, y, { align: 'right' });

  y += 5;
  if (workspace?.email) {
    doc.text(`Email: ${workspace.email}`, margin, y);
  }
  const dueDate = invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'Upon Receipt';
  doc.text(`Due Date: ${dueDate}`, pageWidth - margin, y, { align: 'right' });

  // Status Stamp
  y += 5;
  const isPaid = invoice.status === 'paid';
  doc.setFont('helvetica', 'bold');
  if (isPaid) {
    doc.setTextColor(16, 185, 129); // Emerald 500
    doc.text('STATUS: PAID', pageWidth - margin, y, { align: 'right' });
  } else {
    doc.setTextColor(239, 68, 68); // Red 500
    doc.text('STATUS: UNPAID', pageWidth - margin, y, { align: 'right' });
  }

  // Divider
  y += 7;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);

  // 2. Bill To Section
  y += 7;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 25, 2, 2, 'F');

  const customer = invoice.customer || invoice.customers;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('BILLED TO:', margin + 4, y + 6);

  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(customer?.name || 'Customer Name', margin + 4, y + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  const clientContact = [customer?.phone, customer?.email].filter(Boolean).join('  |  ');
  if (clientContact) {
    doc.text(clientContact, margin + 4, y + 17);
  }
  if (customer?.address) {
    doc.text(customer.address, margin + 4, y + 21);
  }

  // 3. Line Items Table
  y += 31;
  const colDesc = margin;
  const colQty = margin + 105;
  const colUnit = margin + 120;
  const colPrice = margin + 142;
  const colTotal = pageWidth - margin;

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, pageWidth - margin * 2, 7, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y + 7, pageWidth - margin, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('DESCRIPTION / SERVICES', colDesc + 2, y + 5);
  doc.text('QTY', colQty, y + 5, { align: 'center' });
  doc.text('UNIT', colUnit, y + 5, { align: 'center' });
  doc.text('PRICE', colPrice, y + 5, { align: 'right' });
  doc.text('AMOUNT', colTotal - 2, y + 5, { align: 'right' });

  y += 7;
  const items = lineItems.length > 0 ? lineItems : (invoice.line_items || []);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);

  if (items.length === 0) {
    // Default line item if none specified
    doc.setTextColor(17, 24, 39);
    doc.text(`Services and repairs as agreed (${invoice.invoice_number})`, colDesc + 2, y + 5);
    doc.text('1', colQty, y + 5, { align: 'center' });
    doc.text('job', colUnit, y + 5, { align: 'center' });
    doc.text(`$${Number(invoice.amount).toFixed(2)}`, colPrice, y + 5, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(`$${Number(invoice.amount).toFixed(2)}`, colTotal - 2, y + 5, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    y += 10;
  } else {
    items.forEach((item, index) => {
      const rowY = y + index * 7;
      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, rowY, pageWidth - margin * 2, 7, 'F');
      }
      doc.setTextColor(17, 24, 39);
      doc.text(item.description.substring(0, 50), colDesc + 2, rowY + 5);
      doc.setTextColor(71, 85, 105);
      doc.text(String(item.quantity), colQty, rowY + 5, { align: 'center' });
      doc.text(item.unit || 'each', colUnit, rowY + 5, { align: 'center' });
      doc.text(`$${Number(item.unit_price).toFixed(2)}`, colPrice, rowY + 5, { align: 'right' });
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(17, 24, 39);
      doc.text(`$${Number(item.line_total).toFixed(2)}`, colTotal - 2, rowY + 5, { align: 'right' });
      doc.setFont('helvetica', 'normal');

      doc.setDrawColor(241, 245, 249);
      doc.line(margin, rowY + 7, pageWidth - margin, rowY + 7);
    });
    y += items.length * 7 + 4;
  }

  // 4. Totals Box
  const boxWidth = 75;
  const boxX = pageWidth - margin - boxWidth;
  const totalAmount = Number(invoice.amount) || 0;

  y += 4;
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('Subtotal:', boxX, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39);
  doc.text(`$${totalAmount.toFixed(2)}`, pageWidth - margin - 2, y, { align: 'right' });

  y += 6;
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.roundedRect(boxX - 2, y - 4, boxWidth + 2, 10, 1.5, 1.5, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('BALANCE DUE:', boxX + 2, y + 2.5);
  doc.text(isPaid ? '$0.00' : `$${totalAmount.toFixed(2)}`, pageWidth - margin - 2, y + 2.5, { align: 'right' });

  // 5. Payment details or online pay info
  y += 16;
  if (isPaid) {
    doc.setFillColor(236, 253, 245); // Emerald 50
    doc.setDrawColor(167, 243, 208); // Emerald 200
    doc.roundedRect(margin, y, pageWidth - margin * 2, 18, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(6, 95, 70); // Emerald 800
    doc.text('✓ PAYMENT RECEIVED IN FULL', margin + 4, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(4, 120, 87);
    const paidDate = invoice.paid_at ? new Date(invoice.paid_at).toLocaleString() : 'Confirmed';
    doc.text(`Paid on: ${paidDate} via Stripe Secure Checkout`, margin + 4, y + 11);
    if (invoice.stripe_payment_id) {
      doc.text(`Transaction Reference: ${invoice.stripe_payment_id}`, margin + 4, y + 15);
    }
  } else if (invoice.stripe_checkout_url) {
    doc.setFillColor(238, 242, 255); // Indigo 50
    doc.setDrawColor(199, 210, 254);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 14, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(67, 56, 202);
    doc.text('Online Payment Link Active', margin + 4, y + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(79, 70, 229);
    doc.text(invoice.stripe_checkout_url.substring(0, 95), margin + 4, y + 10.5);
  }

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('Payment terms: Net 7 days. Thank you for your business!', pageWidth / 2, 285, { align: 'center' });

  // Save/Download
  doc.save(`Invoice-${invoice.invoice_number || 'INV-1001'}.pdf`);
}
