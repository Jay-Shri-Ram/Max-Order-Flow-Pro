import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Order, StoreSettings } from '../types';
import { formatDateDDMMYYYY } from '../utils/formatters';

/**
 * Clean currency string safe for jsPDF standard fonts (avoids unicode symbol corruptions)
 */
function safePdfCurrency(amount: number, symbol: string = 'Rs.'): string {
  if (isNaN(amount)) return '0.00';
  const prefix = symbol === '₹' ? 'Rs. ' : (symbol === '$' ? '$ ' : (symbol ? `${symbol} ` : 'Rs. '));
  const numStr = Number(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${prefix}${numStr}`;
}

function safePdfNumber(amount: number): string {
  if (isNaN(amount)) return '0.00';
  return Number(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Two-sheet Excel Export:
 * Sheet 1 ("Orders Summary") and Sheet 2 ("Order Line Items")
 */
export function exportOrdersTwoSheetExcel(orders: Order[], filenamePrefix: string = 'OrderFlow_Orders_Export') {
  // Sheet 1: Orders Summary
  const summaryRows = orders.map((order) => ({
    'Order ID': order.id,
    'Date (DD-MM-YYYY)': order.displayDate,
    'Customer Name': order.customerName,
    'Shop Name': order.shopName,
    'Phone': order.customerPhone,
    'Area': order.area,
    'Address': order.customerAddress,
    'Items Count': order.items.length,
    'Subtotal': order.subtotal,
    'Tax Amount': order.taxAmount,
    'Discount': order.discount,
    'Grand Total': order.grandTotal,
    'Order Status': order.status,
    'Payment Mode': order.paymentMode,
    'Payment Status': order.paymentStatus,
    'Created By': order.createdBy,
    'Notes': order.notes || ''
  }));

  // Sheet 2: Order Line Items
  const itemRows: any[] = [];
  orders.forEach((order) => {
    order.items.forEach((item, index) => {
      itemRows.push({
        'Order ID': order.id,
        'Order Date': order.displayDate,
        'Customer Name': order.customerName,
        'Shop Name': order.shopName,
        'Item #': index + 1,
        'Product Name': item.productName,
        'SKU': item.sku,
        'Category': item.category,
        'Unit': item.unit,
        'Quantity': item.quantity,
        'Rate': item.rate,
        'Discount %': item.discountPercent,
        'Total Amount': item.total
      });
    });
  });

  const wb = XLSX.utils.book_new();

  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Orders Summary');

  const wsItems = XLSX.utils.json_to_sheet(itemRows);
  XLSX.utils.book_append_sheet(wb, wsItems, 'Order Line Items');

  const fileName = `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Export generic data to Excel
 */
export function exportDataToExcel(data: any[], sheetName: string, fileName: string) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

/**
 * Export data to CSV
 */
export function exportDataToCSV(data: any[], fileName: string) {
  const ws = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export Product Demand Summary to formatted PDF via jsPDF & autoTable
 */
export function exportDemandSummaryPDF(
  demandData: Array<{
    productName: string;
    category: string;
    unit: string;
    totalQuantity: number;
    orderCount: number;
    currentStock: number;
  }>,
  storeSettings: StoreSettings
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(storeSettings.storeName, 14, 18);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('KITCHEN & WAREHOUSE DISPATCH DEMAND SUMMARY', 14, 25);
  doc.text(`Generated On: ${formatDateDDMMYYYY(new Date())} | Active Orders Only`, 14, 31);

  // Table
  const tableData = demandData.map((d, i) => [
    i + 1,
    d.productName,
    d.category,
    `${d.totalQuantity} ${d.unit}`,
    `${d.orderCount} Orders`,
    `${d.currentStock} ${d.unit}`,
    d.currentStock >= d.totalQuantity ? 'Sufficient' : 'Shortage Alert'
  ]);

  autoTable(doc, {
    startY: 36,
    head: [['#', 'Product Name', 'Category', 'Required Qty', 'Orders Count', 'In Stock', 'Status']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'left' },
      2: { halign: 'left', cellWidth: 32 },
      3: { halign: 'center', cellWidth: 26 },
      4: { halign: 'center', cellWidth: 24 },
      5: { halign: 'center', cellWidth: 24 },
      6: { halign: 'center', cellWidth: 28 },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] }
  });

  doc.save(`Warehouse_Demand_Summary_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * Export Vector A4 Tax Invoice PDF with crisp, clean numbers
 */
export function exportA4InvoicePDF(order: Order, settings: StoreSettings) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Company Brand Box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(settings.storeName, 14, 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(settings.address, 14, 24);
  doc.text(`Phone: ${settings.phone} | Email: ${settings.email}`, 14, 29);
  doc.text(`GSTIN / Tax ID: ${settings.taxId}`, 14, 34);

  // Invoice Title Right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('TAX INVOICE', 196, 18, { align: 'right' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Invoice No: ${order.id}`, 196, 24, { align: 'right' });
  doc.text(`Date: ${order.displayDate}`, 196, 29, { align: 'right' });
  doc.text(`Status: ${order.status.toUpperCase()}`, 196, 34, { align: 'right' });

  doc.setDrawColor(203, 213, 225);
  doc.line(14, 38, 196, 38);

  // Bill To Box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Billed To Customer:', 14, 44);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`${order.customerName} - ${order.shopName}`, 14, 50);
  doc.text(`Address: ${order.customerAddress}`, 14, 55);
  doc.text(`Phone: ${order.customerPhone} | Area: ${order.area}`, 14, 60);

  // Currency label to use in header
  const currLabel = settings.currencySymbol === '₹' ? 'Rs.' : settings.currencySymbol;

  // Items Table with strict clean number formatting
  const tableData = order.items.map((item, idx) => [
    idx + 1,
    item.productName,
    item.sku,
    `${item.quantity} ${item.unit}`,
    safePdfNumber(item.rate),
    `${item.discountPercent}%`,
    safePdfNumber(item.total)
  ]);

  autoTable(doc, {
    startY: 66,
    head: [['#', 'Item Description', 'SKU', 'Qty & Unit', `Rate (${currLabel})`, 'Disc %', `Amount (${currLabel})`]],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'left' },
      2: { halign: 'left', cellWidth: 28 },
      3: { halign: 'center', cellWidth: 24 },
      4: { halign: 'right', cellWidth: 26 },
      5: { halign: 'center', cellWidth: 18 },
      6: { halign: 'right', cellWidth: 32 },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] }
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 130;

  // Totals Box
  const startTotalsY = finalY + 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Subtotal:', 140, startTotalsY);
  doc.text(safePdfCurrency(order.subtotal, settings.currencySymbol), 196, startTotalsY, { align: 'right' });

  let curY = startTotalsY + 5;
  if (order.taxAmount > 0) {
    doc.text(`Tax / GST (${order.taxRate}%):`, 140, curY);
    doc.text(safePdfCurrency(order.taxAmount, settings.currencySymbol), 196, curY, { align: 'right' });
    curY += 5;
  }
  if (order.discount > 0) {
    doc.text('Discount:', 140, curY);
    doc.text(`-${safePdfCurrency(order.discount, settings.currencySymbol)}`, 196, curY, { align: 'right' });
    curY += 5;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Grand Total:', 140, curY + 2);
  doc.text(safePdfCurrency(order.grandTotal, settings.currencySymbol), 196, curY + 2, { align: 'right' });

  // Payment Settlement Info (Left column)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('Payment & Settlement Details:', 14, startTotalsY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Payment Mode: ${order.paymentMode} (${order.paymentStatus})`, 14, startTotalsY + 5);
  doc.text(`Bank: ${settings.bankName} | A/C: ${settings.bankAccount}`, 14, startTotalsY + 10);
  doc.text(`IFSC: ${settings.bankIfsc} | UPI: ${settings.upiId}`, 14, startTotalsY + 15);

  // Terms and Signature
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(settings.terms, 14, curY + 22, { maxWidth: 120 });

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Authorized Signatory', 196, curY + 32, { align: 'right' });

  doc.save(`Invoice_${order.id}.pdf`);
}
