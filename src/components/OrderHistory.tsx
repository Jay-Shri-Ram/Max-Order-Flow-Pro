import React, { useState, useMemo } from 'react';
import { 
  Order, 
  OrderStatus, 
  StoreSettings, 
  Language, 
  PaymentStatus 
} from '../types';
import { translations } from '../utils/i18n';
import { 
  formatCurrency, 
  formatDateDDMMYYYY, 
  buildWhatsAppLink 
} from '../utils/formatters';
import { exportOrdersTwoSheetExcel } from '../services/exportService';
import { 
  Search, 
  Filter, 
  Printer, 
  Share2, 
  Trash2, 
  CheckSquare, 
  Square, 
  FileSpreadsheet, 
  Eye, 
  RefreshCw, 
  ChevronRight,
  Clock,
  ArrowUpDown
} from 'lucide-react';

interface OrderHistoryProps {
  orders: Order[];
  settings: StoreSettings;
  lang: Language;
  onUpdateOrderStatus: (orderId: string, newStatus: OrderStatus) => Promise<void>;
  onBulkUpdateStatus: (orderIds: string[], newStatus: OrderStatus) => Promise<void>;
  onSoftDeleteOrder: (order: Order, reason?: string) => Promise<void>;
  onBulkSoftDelete: (orders: Order[], reason?: string) => Promise<void>;
  onPrintInvoice: (order: Order) => void;
  onShowToast: (title: string, message: string, type: 'success' | 'warning' | 'error' | 'info') => void;
}

export const OrderHistory: React.FC<OrderHistoryProps> = ({
  orders,
  settings,
  lang,
  onUpdateOrderStatus,
  onBulkUpdateStatus,
  onSoftDeleteOrder,
  onBulkSoftDelete,
  onPrintInvoice,
  onShowToast
}) => {
  const t = translations[lang];

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [areaFilter, setAreaFilter] = useState<string>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');

  // Selected Order IDs for Batch Actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Viewing Order Details Modal
  const [inspectingOrder, setInspectingOrder] = useState<Order | null>(null);

  // Distinct Areas
  const distinctAreas = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => {
      if (o.area) set.add(o.area);
    });
    return Array.from(set).sort();
  }, [orders]);

  // Filtered Orders (excluding deleted)
  const filteredOrders = useMemo(() => {
    return orders
      .filter((o) => !o.isDeleted)
      .filter((order) => {
        // Status filter
        if (statusFilter !== 'ALL' && order.status !== statusFilter) return false;
        // Area filter
        if (areaFilter !== 'ALL' && order.area !== areaFilter) return false;
        // Payment filter
        if (paymentFilter !== 'ALL' && order.paymentStatus !== paymentFilter) return false;

        // Search query
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        return (
          order.id.toLowerCase().includes(q) ||
          order.customerName.toLowerCase().includes(q) ||
          order.shopName.toLowerCase().includes(q) ||
          order.customerPhone.includes(q) ||
          order.area.toLowerCase().includes(q)
        );
      });
  }, [orders, searchQuery, statusFilter, areaFilter, paymentFilter]);

  // Selection Checkbox helpers
  const isAllSelected = filteredOrders.length > 0 && selectedIds.size === filteredOrders.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredOrders.map((o) => o.id)));
    }
  };

  const toggleSelectOrder = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // Batch Status Update
  const handleBulkStatus = async (status: OrderStatus) => {
    if (selectedIds.size === 0) return;
    await onBulkUpdateStatus(Array.from(selectedIds), status);
    onShowToast('Batch Updated', `${selectedIds.size} orders updated to ${status}.`, 'success');
    setSelectedIds(new Set());
  };

  // Batch Delete
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const targetOrders = orders.filter((o) => selectedIds.has(o.id));
    await onBulkSoftDelete(targetOrders, 'Bulk soft delete from orders table');
    onShowToast('Orders Deleted', `${selectedIds.size} orders moved to Recycle Bin.`, 'info');
    setSelectedIds(new Set());
  };

  // 2-Sheet Excel Export
  const handleExportTwoSheet = () => {
    if (filteredOrders.length === 0) {
      onShowToast('No Data', 'No orders available to export.', 'warning');
      return;
    }
    exportOrdersTwoSheetExcel(filteredOrders, 'OrderFlow_Wholesale_Orders');
    onShowToast('Excel Exported', 'Two-sheet Excel file generated successfully!', 'success');
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300 pb-16 md:pb-6">
      
      {/* Top Banner & Search Controls */}
      <div className="bg-slate-900/60 border border-slate-800/80 p-4.5 rounded-2xl backdrop-blur-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>{t.orderHistory}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                {filteredOrders.length} records
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Strict DD-MM-YYYY audit dates, instant status switches, two-sheet Excel exports, and direct thermal/A4 printing.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportTwoSheet}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 font-medium text-xs transition-all cursor-pointer shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>{t.exportExcel}</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1">
          
          {/* Main Real-time Search Box */}
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={t.searchOrders}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">{t.allStatuses}</option>
              <option value="Pending">Pending</option>
              <option value="In Process">In Process</option>
              <option value="Complete">Complete</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Area Filter */}
          <div className="sm:col-span-2">
            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">{t.allAreas}</option>
              {distinctAreas.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Status Filter */}
          <div className="sm:col-span-2">
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">Payment: All</option>
              <option value="Paid">Paid</option>
              <option value="Unpaid">Unpaid</option>
              <option value="Partial">Partial</option>
            </select>
          </div>

        </div>

        {/* Batch Actions Bar (when checkboxes selected) */}
        {selectedIds.size > 0 && (
          <div className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/40 flex flex-wrap items-center justify-between gap-2 text-xs animate-in fade-in">
            <div className="flex items-center gap-2 text-indigo-300 font-medium">
              <CheckSquare className="w-4 h-4 text-indigo-400" />
              <span>{selectedIds.size} orders selected for batch operation</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="text-slate-400 text-[11px]">Mark as:</span>
                {(['Pending', 'In Process', 'Complete', 'Cancelled'] as OrderStatus[]).map((st) => (
                  <button
                    key={st}
                    onClick={() => handleBulkStatus(st)}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold border border-slate-700 transition-colors cursor-pointer"
                  >
                    {st}
                  </button>
                ))}
              </div>

              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 text-[11px] font-semibold transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Soft Delete</span>
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Main Orders Table */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 pl-4 w-10">
                  <button
                    onClick={toggleSelectAll}
                    className="text-slate-400 hover:text-white cursor-pointer"
                  >
                    {isAllSelected ? (
                      <CheckSquare className="w-4 h-4 text-indigo-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3">{t.orderId}</th>
                <th className="py-3">{t.date}</th>
                <th className="py-3">{t.customerShop}</th>
                <th className="py-3">{t.area}</th>
                <th className="py-3">{t.itemsCount}</th>
                <th className="py-3">{t.grandTotal}</th>
                <th className="py-3">Payment</th>
                <th className="py-3">{t.status}</th>
                <th className="py-3 text-right pr-4">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    No orders match your active filter criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const isSelected = selectedIds.has(order.id);
                  return (
                    <tr
                      key={order.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isSelected ? 'bg-indigo-950/20' : ''
                      }`}
                    >
                      <td className="py-3 pl-4">
                        <button
                          onClick={() => toggleSelectOrder(order.id)}
                          className="text-slate-400 hover:text-white cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Order ID */}
                      <td className="py-3 font-mono font-bold text-indigo-400">
                        {order.id}
                      </td>

                      {/* Date strictly DD-MM-YYYY */}
                      <td className="py-3 font-mono text-slate-300 whitespace-nowrap">
                        {order.displayDate}
                      </td>

                      {/* Customer & Shop */}
                      <td className="py-3">
                        <div className="font-semibold text-white">{order.shopName}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                          <span>{order.customerName}</span>
                          <span>•</span>
                          <span className="font-mono">{order.customerPhone}</span>
                        </div>
                      </td>

                      {/* Area */}
                      <td className="py-3 text-slate-300 font-medium">
                        {order.area}
                      </td>

                      {/* Items */}
                      <td className="py-3">
                        <span className="font-mono font-semibold text-slate-200">
                          {order.items.length} items
                        </span>
                        <div className="text-[10px] text-slate-400 truncate max-w-36">
                          {order.items.map((i) => i.productName).join(', ')}
                        </div>
                      </td>

                      {/* Grand Total */}
                      <td className="py-3 font-mono font-bold text-white whitespace-nowrap">
                        {formatCurrency(order.grandTotal, settings.currencySymbol)}
                      </td>

                      {/* Payment */}
                      <td className="py-3 whitespace-nowrap">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {order.paymentMode}
                        </span>
                        <span
                          className={`ml-1 text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                            order.paymentStatus === 'Paid'
                              ? 'text-emerald-300 bg-emerald-500/10'
                              : 'text-amber-300 bg-amber-500/10'
                          }`}
                        >
                          {order.paymentStatus}
                        </span>
                      </td>

                      {/* Direct Status Switcher */}
                      <td className="py-3">
                        <select
                          value={order.status}
                          onChange={(e) => onUpdateOrderStatus(order.id, e.target.value as OrderStatus)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-lg border cursor-pointer bg-slate-900 ${
                            order.status === 'Pending'
                              ? 'text-amber-300 border-amber-500/40 bg-amber-500/10'
                              : order.status === 'In Process'
                              ? 'text-sky-300 border-sky-500/40 bg-sky-500/10'
                              : order.status === 'Complete'
                              ? 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10'
                              : 'text-rose-300 border-rose-500/40 bg-rose-500/10'
                          }`}
                        >
                          <option value="Pending">Pending</option>
                          <option value="In Process">In Process</option>
                          <option value="Complete">Complete</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3 text-right pr-4 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          
                          {/* Print Invoice Modal Trigger */}
                          <button
                            onClick={() => onPrintInvoice(order)}
                            title="Direct Invoice Print (A4 / Thermal)"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5 text-indigo-400" />
                          </button>

                          {/* WhatsApp Deep Link */}
                          <a
                            href={buildWhatsAppLink(order, settings)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Send Formatted WhatsApp Invoice"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-emerald-950 text-slate-300 hover:text-emerald-400 border border-slate-700 transition-colors inline-flex"
                          >
                            <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                          </a>

                          {/* View Full Order Details */}
                          <button
                            onClick={() => setInspectingOrder(order)}
                            title="View Details"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-400" />
                          </button>

                          {/* Soft Delete */}
                          <button
                            onClick={() => onSoftDeleteOrder(order)}
                            title="Soft Delete (Move to Recycle Bin)"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-700 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Order Details Modal */}
      {inspectingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Order Inspection: {inspectingOrder.id}</span>
                  <span className="text-xs font-mono font-medium text-slate-400">({inspectingOrder.displayDate})</span>
                </h3>
                <div className="text-xs text-slate-400 mt-0.5">
                  Logged by: {inspectingOrder.createdBy} ({inspectingOrder.creatorRole})
                </div>
              </div>
              <button
                onClick={() => setInspectingOrder(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div>
                <span className="text-slate-400">Customer:</span> <span className="font-semibold text-white">{inspectingOrder.customerName}</span>
              </div>
              <div>
                <span className="text-slate-400">Shop:</span> <span className="font-semibold text-white">{inspectingOrder.shopName}</span>
              </div>
              <div>
                <span className="text-slate-400">Phone:</span> <span className="font-mono text-slate-200">{inspectingOrder.customerPhone}</span>
              </div>
              <div>
                <span className="text-slate-400">Area:</span> <span className="text-slate-200">{inspectingOrder.area}</span>
              </div>
              <div className="col-span-2 text-slate-400">
                <span>Address:</span> {inspectingOrder.customerAddress}
              </div>
              {inspectingOrder.notes && (
                <div className="col-span-2 text-amber-300/90 pt-1 border-t border-slate-800/60">
                  <span className="text-slate-400">Notes:</span> {inspectingOrder.notes}
                </div>
              )}
            </div>

            <div className="max-h-56 overflow-y-auto divide-y divide-slate-800/60 text-xs pr-1">
              {inspectingOrder.items.map((item, idx) => (
                <div key={idx} className="py-2 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-white">{item.productName}</div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {item.quantity} {item.unit} @ {formatCurrency(item.rate, settings.currencySymbol)} (Disc: {item.discountPercent}%)
                    </div>
                  </div>
                  <div className="font-mono font-bold text-emerald-400">
                    {formatCurrency(item.total, settings.currencySymbol)}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400">Grand Total: </span>
                <span className="text-lg font-bold font-mono text-white">
                  {formatCurrency(inspectingOrder.grandTotal, settings.currencySymbol)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    onPrintInvoice(inspectingOrder);
                    setInspectingOrder(null);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Invoice</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
