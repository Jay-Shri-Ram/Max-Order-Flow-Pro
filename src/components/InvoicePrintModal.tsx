import React, { useState } from 'react';
import { Order, StoreSettings, PrintFormat } from '../types';
import { 
  formatCurrency, 
  formatDateDDMMYYYY, 
  generateUPIQrUrl, 
  buildWhatsAppLink 
} from '../utils/formatters';
import { exportA4InvoicePDF } from '../services/exportService';
import { 
  Printer, 
  Share2, 
  Download, 
  X, 
  FileText, 
  Receipt, 
  QrCode, 
  Check, 
  Building2 
} from 'lucide-react';

interface InvoicePrintModalProps {
  order: Order | null;
  settings: StoreSettings;
  onClose: () => void;
  onShowToast: (title: string, message: string, type: 'success' | 'warning' | 'error' | 'info') => void;
}

export const InvoicePrintModal: React.FC<InvoicePrintModalProps> = ({
  order,
  settings,
  onClose,
  onShowToast
}) => {
  if (!order) return null;

  const [format, setFormat] = useState<PrintFormat>(settings.defaultPrintFormat || 'thermal');

  const upiQrUrl = generateUPIQrUrl(
    settings.upiId,
    settings.storeName,
    order.grandTotal,
    order.id
  );

  const handleBrowserPrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    exportA4InvoicePDF(order, settings);
    onShowToast('PDF Downloaded', `Invoice ${order.id} saved as PDF.`, 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* Modal Controls Header (Hidden on print) */}
        <div className="no-print p-4 border-b border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
              <Printer className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Print Invoice Preview</span>
                <span className="font-mono text-indigo-400">({order.id})</span>
              </h2>
              <div className="text-[11px] text-slate-400">
                Customer: {order.shopName} ({order.customerName})
              </div>
            </div>
          </div>

          {/* Toggle A4 vs Thermal 80mm */}
          <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl">
            <button
              onClick={() => setFormat('thermal')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                format === 'thermal'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Thermal 80mm Slip</span>
            </button>

            <button
              onClick={() => setFormat('a4')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                format === 'a4'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Standard A4 Tax Invoice</span>
            </button>
          </div>

          {/* Action Trigger Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleBrowserPrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Now</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              <span>PDF</span>
            </button>

            <a
              href={buildWhatsAppLink(order, settings)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </a>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Container Canvas */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-950/90 flex justify-center">
          
          <div id="printable-invoice-area" className="transition-all duration-200">
            
            {/* OPTION 1: THERMAL 80MM SLIP LAYOUT */}
            {format === 'thermal' && (
              <div 
                className="bg-white text-black font-mono text-[11px] leading-tight p-4 shadow-2xl rounded-sm mx-auto"
                style={{ width: '80mm', minHeight: '120mm' }}
              >
                {/* Header */}
                <div className="text-center pb-2 border-b border-black border-dashed">
                  <div className="text-sm font-bold uppercase tracking-tight">{settings.storeName}</div>
                  <div className="text-[10px] mt-0.5">{settings.address}</div>
                  <div className="text-[10px]">Ph: {settings.phone}</div>
                  <div className="text-[10px]">GSTIN: {settings.taxId}</div>
                </div>

                {/* Slip Meta */}
                <div className="py-2 border-b border-black border-dashed text-[10px] space-y-0.5">
                  <div className="flex justify-between">
                    <span>RECEIPT NO:</span>
                    <span className="font-bold">{order.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>DATE:</span>
                    <span>{order.displayDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SHOP:</span>
                    <span className="font-bold truncate max-w-36">{order.shopName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CUST PH:</span>
                    <span>{order.customerPhone}</span>
                  </div>
                </div>

                {/* Items Table */}
                <div className="py-2 border-b border-black border-dashed">
                  <div className="flex justify-between font-bold border-b border-black pb-1 mb-1 text-[10px]">
                    <span className="w-32">ITEM</span>
                    <span className="w-10 text-center">QTY</span>
                    <span className="w-14 text-right">TOTAL</span>
                  </div>
                  <div className="space-y-1">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-baseline text-[10px]">
                        <div className="w-32 truncate">
                          {idx + 1}. {item.productName}
                        </div>
                        <div className="w-10 text-center">
                          {item.quantity}{item.unit}
                        </div>
                        <div className="w-14 text-right font-bold">
                          {item.total.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="py-2 border-b border-black border-dashed space-y-0.5 text-[10px]">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{settings.currencySymbol} {order.subtotal.toFixed(2)}</span>
                  </div>
                  {order.taxAmount > 0 && (
                    <div className="flex justify-between">
                      <span>Tax / GST ({order.taxRate}%):</span>
                      <span>{settings.currencySymbol} {order.taxAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {order.discount > 0 && (
                    <div className="flex justify-between">
                      <span>Discount:</span>
                      <span>-{settings.currencySymbol} {order.discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs font-bold pt-1 border-t border-black">
                    <span>GRAND TOTAL:</span>
                    <span>{settings.currencySymbol} {order.grandTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] pt-0.5">
                    <span>Payment Mode:</span>
                    <span className="font-bold">{order.paymentMode} ({order.paymentStatus})</span>
                  </div>
                </div>

                {/* UPI QR Slip Center */}
                {upiQrUrl && (
                  <div className="py-2.5 text-center flex flex-col items-center">
                    <img src={upiQrUrl} alt="UPI QR" className="w-24 h-24 border border-black p-0.5" />
                    <span className="text-[9px] mt-1">Scan to Pay via UPI</span>
                    <span className="text-[9px] font-bold">{settings.upiId}</span>
                  </div>
                )}

                {/* Footer Notes */}
                <div className="text-center pt-2 border-t border-black border-dashed text-[9px] leading-tight">
                  <div>Thank you for your business!</div>
                  <div className="mt-0.5">Goods received in good condition.</div>
                  <div className="mt-1 font-bold">*** ORDERFLOW PRO POS ENGINE ***</div>
                </div>
              </div>
            )}

            {/* OPTION 2: STANDARD A4 TAX INVOICE LAYOUT */}
            {format === 'a4' && (
              <div 
                className="bg-white text-slate-900 font-sans p-8 shadow-2xl rounded-sm mx-auto text-xs"
                style={{ width: '210mm', minHeight: '297mm' }}
              >
                {/* A4 Top Header */}
                <div className="flex justify-between items-start border-b border-slate-300 pb-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                        OP
                      </div>
                      <h1 className="text-xl font-bold tracking-tight text-slate-900">
                        {settings.storeName}
                      </h1>
                    </div>
                    <div className="text-[11px] text-slate-600 mt-1">{settings.address}</div>
                    <div className="text-[11px] text-slate-600">
                      Phone: <span className="font-mono">{settings.phone}</span> | Email: {settings.email}
                    </div>
                    <div className="text-[11px] text-slate-700 font-semibold mt-0.5">
                      GSTIN / TAX ID: <span className="font-mono">{settings.taxId}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-black tracking-wide text-slate-900">TAX INVOICE</div>
                    <div className="text-xs font-mono font-bold text-indigo-600 mt-1">
                      INVOICE NO: {order.id}
                    </div>
                    <div className="text-xs text-slate-600">
                      DATE: <span className="font-mono font-semibold">{order.displayDate}</span>
                    </div>
                    <div className="inline-block mt-1 px-2.5 py-0.5 rounded bg-slate-100 text-slate-800 font-bold uppercase text-[10px] border border-slate-300">
                      STATUS: {order.status}
                    </div>
                  </div>
                </div>

                {/* Billed To Customer Box */}
                <div className="my-5 p-4 rounded-lg bg-slate-50 border border-slate-200 grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                      BILLED TO CUSTOMER:
                    </div>
                    <div className="text-sm font-bold text-slate-900 mt-0.5">
                      {order.customerName}
                    </div>
                    <div className="text-xs font-semibold text-slate-700">
                      {order.shopName}
                    </div>
                    <div className="text-[11px] text-slate-600 mt-1">
                      {order.customerAddress}
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Area: <span className="font-medium text-slate-800">{order.area}</span>
                    </div>
                    <div className="text-[11px] text-slate-600 font-mono">
                      Phone: {order.customerPhone}
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                      DISPATCH & SETTLEMENT:
                    </div>
                    <div className="text-xs">
                      Payment Mode: <span className="font-bold">{order.paymentMode}</span>
                    </div>
                    <div className="text-xs">
                      Payment Status: <span className="font-bold text-emerald-700">{order.paymentStatus}</span>
                    </div>
                    <div className="text-[11px] text-slate-600 font-mono">
                      Logged by: {order.createdBy}
                    </div>
                    {order.notes && (
                      <div className="text-[10px] text-amber-800 italic mt-1">
                        Note: {order.notes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Items Table */}
                <table className="w-full border-collapse my-4">
                  <thead>
                    <tr className="bg-slate-900 text-white text-[11px] font-bold uppercase">
                      <th className="p-2.5 text-left w-10">#</th>
                      <th className="p-2.5 text-left">Item Description</th>
                      <th className="p-2.5 text-left w-24">SKU</th>
                      <th className="p-2.5 text-center w-24">Qty & Unit</th>
                      <th className="p-2.5 text-right w-24">Rate ({settings.currencySymbol})</th>
                      <th className="p-2.5 text-center w-20">Disc %</th>
                      <th className="p-2.5 text-right w-28">Amount ({settings.currencySymbol})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {order.items.map((item, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                        <td className="p-2.5 text-slate-500">{idx + 1}</td>
                        <td className="p-2.5 font-semibold text-slate-900">{item.productName}</td>
                        <td className="p-2.5 font-mono text-slate-500">{item.sku}</td>
                        <td className="p-2.5 text-center font-bold text-slate-800 font-mono">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="p-2.5 text-right font-mono text-slate-700">
                          {item.rate.toFixed(2)}
                        </td>
                        <td className="p-2.5 text-center font-mono text-slate-500">
                          {item.discountPercent}%
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                          {item.total.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals & Bank Details Row */}
                <div className="grid grid-cols-12 gap-6 my-6 pt-2 border-t border-slate-300">
                  {/* Left: Bank & UPI QR */}
                  <div className="col-span-7 space-y-3">
                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-start gap-4">
                      {upiQrUrl && (
                        <img src={upiQrUrl} alt="UPI QR" className="w-20 h-20 border border-slate-300 p-1 bg-white shrink-0" />
                      )}
                      <div className="text-[11px] space-y-0.5">
                        <div className="font-bold text-slate-900">Bank Settlement Details:</div>
                        <div>Bank Name: <span className="font-semibold">{settings.bankName}</span></div>
                        <div>Account No: <span className="font-mono font-bold">{settings.bankAccount}</span></div>
                        <div>IFSC Code: <span className="font-mono font-bold">{settings.bankIfsc}</span></div>
                        <div>UPI ID: <span className="font-mono text-indigo-700 font-bold">{settings.upiId}</span></div>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-500 leading-relaxed">
                      <span className="font-bold text-slate-700">Terms & Conditions: </span>
                      {settings.terms}
                    </div>
                  </div>

                  {/* Right: Calculations Breakdown */}
                  <div className="col-span-5 space-y-1.5 text-xs text-right">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal:</span>
                      <span className="font-mono font-semibold text-slate-900">
                        {formatCurrency(order.subtotal, settings.currencySymbol)}
                      </span>
                    </div>

                    {order.taxAmount > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Tax / GST ({order.taxRate}%):</span>
                        <span className="font-mono text-slate-900">
                          +{formatCurrency(order.taxAmount, settings.currencySymbol)}
                        </span>
                      </div>
                    )}

                    {order.discount > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Discount:</span>
                        <span className="font-mono text-slate-900">
                          -{formatCurrency(order.discount, settings.currencySymbol)}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-300">
                      <span>Grand Total:</span>
                      <span className="font-mono text-indigo-700">
                        {formatCurrency(order.grandTotal, settings.currencySymbol)}
                      </span>
                    </div>

                    {/* Authorized Signature Box */}
                    <div className="pt-12 text-center">
                      <div className="border-t border-slate-400 w-44 ml-auto pt-1 text-[11px] font-bold text-slate-800">
                        Authorized Signatory
                      </div>
                      <div className="text-[10px] text-slate-500 ml-auto">{settings.storeName}</div>
                    </div>
                  </div>
                </div>

              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
};
