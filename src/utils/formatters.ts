import { Order, StoreSettings } from '../types';

/**
 * Format date strictly as DD-MM-YYYY
 */
export function formatDateDDMMYYYY(inputDate?: string | Date | number | null): string {
  if (!inputDate) return '--';
  const d = new Date(inputDate);
  if (isNaN(d.getTime())) return String(inputDate);
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

export function formatDateTime(inputDate?: string | Date | number | null): string {
  if (!inputDate) return '--';
  const d = new Date(inputDate);
  if (isNaN(d.getTime())) return String(inputDate);
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${day}-${month}-${year} ${hours}:${mins}`;
}

export function formatCurrency(amount: number, symbol: string = '₹'): string {
  if (isNaN(amount)) return `${symbol} 0.00`;
  return `${symbol} ${Number(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function generateNextOrderId(prefix: string, middle: string, counter: number): string {
  const p = (prefix || 'MT').trim();
  const m = (middle || 'ORD').trim();
  return `${p}-${m}-${counter}`;
}

export function buildWhatsAppLink(order: Order, settings: StoreSettings): string {
  const phone = order.customerPhone.replace(/[^0-9]/g, '');
  const lines: string[] = [
    `*${settings.storeName.toUpperCase()}*`,
    `Invoice / Order Confirmation: *${order.id}*`,
    `Date: ${order.displayDate}`,
    `----------------------------------------`,
    `Customer: ${order.customerName} (${order.shopName})`,
    `Status: ${order.status.toUpperCase()}`,
    ``,
    `*Ordered Items:*`,
  ];

  order.items.forEach((item, idx) => {
    lines.push(
      `${idx + 1}. ${item.productName} - ${item.quantity} ${item.unit} @ ${settings.currencySymbol}${item.rate} = ${settings.currencySymbol}${item.total.toFixed(2)}`
    );
  });

  lines.push(`----------------------------------------`);
  lines.push(`Subtotal: ${settings.currencySymbol}${order.subtotal.toFixed(2)}`);
  if (order.taxAmount > 0) {
    lines.push(`Tax (${order.taxRate}%): ${settings.currencySymbol}${order.taxAmount.toFixed(2)}`);
  }
  if (order.discount > 0) {
    lines.push(`Discount: -${settings.currencySymbol}${order.discount.toFixed(2)}`);
  }
  lines.push(`*Grand Total: ${settings.currencySymbol}${order.grandTotal.toFixed(2)}*`);
  lines.push(`Payment Mode: ${order.paymentMode} (${order.paymentStatus})`);
  lines.push(``);
  if (settings.upiId) {
    lines.push(`Pay via UPI: ${settings.upiId}`);
  }
  lines.push(`Thank you for doing business with us!`);

  const text = encodeURIComponent(lines.join('\n'));
  return `https://api.whatsapp.com/send?phone=${phone.length === 10 ? '91' + phone : phone}&text=${text}`;
}

export function generateUPIQrUrl(upiId: string, storeName: string, amount: number, orderId: string): string {
  if (!upiId) return '';
  const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(storeName)}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Order ${orderId}`)}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiUri)}&margin=4`;
}
