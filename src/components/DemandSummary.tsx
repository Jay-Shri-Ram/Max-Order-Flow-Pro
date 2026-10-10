import React, { useState, useMemo } from 'react';
import { Order, Product, StoreSettings, Language } from '../types';
import { translations } from '../utils/i18n';
import { 
  exportDemandSummaryPDF, 
  exportDataToExcel, 
  exportDataToCSV 
} from '../services/exportService';
import { 
  Boxes, 
  Search, 
  FileSpreadsheet, 
  FileText, 
  FileDown, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  ExternalLink, 
  Layers 
} from 'lucide-react';

interface DemandSummaryProps {
  orders: Order[];
  products: Product[];
  settings: StoreSettings;
  lang: Language;
  onShowToast: (title: string, message: string, type: 'success' | 'warning' | 'error' | 'info') => void;
}

interface AggregatedItem {
  productId: string;
  productName: string;
  sku: string;
  category: string;
  unit: string;
  totalQuantity: number;
  orderCount: number;
  currentStock: number;
  orders: Array<{
    orderId: string;
    customerName: string;
    shopName: string;
    area: string;
    quantity: number;
    unit: string;
    date: string;
    status: string;
  }>;
}

export const DemandSummary: React.FC<DemandSummaryProps> = ({
  orders,
  products,
  settings,
  lang,
  onShowToast
}) => {
  const t = translations[lang];

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [inspectingItem, setInspectingItem] = useState<AggregatedItem | null>(null);

  // Strictly aggregate demand from active orders ('Pending' and 'In Process')
  const aggregatedData = useMemo(() => {
    const activeOrders = orders.filter(
      (o) => !o.isDeleted && (o.status === 'Pending' || o.status === 'In Process')
    );

    const map = new Map<string, AggregatedItem>();

    activeOrders.forEach((order) => {
      order.items.forEach((item) => {
        const key = `${item.productId}_${item.unit}`;
        const prod = products.find((p) => p.id === item.productId);
        const currentStock = prod ? prod.stock : 0;

        if (!map.has(key)) {
          map.set(key, {
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            category: item.category,
            unit: item.unit,
            totalQuantity: 0,
            orderCount: 0,
            currentStock,
            orders: []
          });
        }

        const entry = map.get(key)!;
        entry.totalQuantity += item.quantity;
        entry.orderCount += 1;
        entry.orders.push({
          orderId: order.id,
          customerName: order.customerName,
          shopName: order.shopName,
          area: order.area,
          quantity: item.quantity,
          unit: item.unit,
          date: order.displayDate,
          status: order.status
        });
      });
    });

    return Array.from(map.values()).sort((a, b) => b.totalQuantity - a.totalQuantity);
  }, [orders, products]);

  // Categories present in demand
  const demandCategories = useMemo(() => {
    const set = new Set<string>();
    aggregatedData.forEach((item) => set.add(item.category));
    return Array.from(set).sort();
  }, [aggregatedData]);

  // Filtered view
  const filteredData = useMemo(() => {
    return aggregatedData.filter((item) => {
      const matchCat = categoryFilter === 'ALL' || item.category === categoryFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchQ =
        !q ||
        item.productName.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [aggregatedData, categoryFilter, searchQuery]);

  // Export handlers
  const handleExportPDF = () => {
    if (aggregatedData.length === 0) {
      onShowToast('No Active Demand', 'There are no Pending or In Process orders right now.', 'warning');
      return;
    }
    exportDemandSummaryPDF(aggregatedData, settings);
    onShowToast('PDF Exported', 'Kitchen & Warehouse Dispatch PDF generated successfully!', 'success');
  };

  const handleExportExcel = () => {
    if (aggregatedData.length === 0) return;
    const rows = aggregatedData.map((d, i) => ({
      '#': i + 1,
      'Product Name': d.productName,
      'SKU': d.sku,
      'Category': d.category,
      'Total Demand Qty': d.totalQuantity,
      'Unit': d.unit,
      'Orders Requesting': d.orderCount,
      'Current Warehouse Stock': d.currentStock,
      'Fulfillment Status': d.currentStock >= d.totalQuantity ? 'Sufficient' : 'Shortage Alert'
    }));
    exportDataToExcel(rows, 'Demand Dispatch', 'Warehouse_Dispatch_Summary');
    onShowToast('Excel Exported', 'Demand dispatch Excel sheet downloaded.', 'success');
  };

  const handleExportCSV = () => {
    if (aggregatedData.length === 0) return;
    const rows = aggregatedData.map((d) => ({
      productName: d.productName,
      sku: d.sku,
      category: d.category,
      demandQty: d.totalQuantity,
      unit: d.unit,
      orderCount: d.orderCount,
      stock: d.currentStock
    }));
    exportDataToCSV(rows, 'Warehouse_Dispatch_Summary');
    onShowToast('CSV Exported', 'Demand dispatch CSV file downloaded.', 'success');
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300 pb-16 md:pb-6">
      
      {/* Header Banner */}
      <div className="bg-slate-900/60 border border-slate-800/80 p-4.5 rounded-2xl backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Boxes className="w-5 h-5 text-amber-400" />
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              {t.demandSummary} (Kitchen & Warehouse Dispatch)
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time aggregate item counts derived strictly from <span className="text-amber-300 font-semibold">Pending</span> and <span className="text-sky-300 font-semibold">In Process</span> orders.
          </p>
        </div>

        {/* Multi-Format Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5 text-rose-400" />
            <span>jsPDF Export</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Excel (.xlsx)</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-sky-400" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900/60 border border-slate-800/80 p-3.5 rounded-2xl backdrop-blur-md grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-8 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search dispatch demand by item name, SKU, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="sm:col-span-4">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">All Categories ({demandCategories.length})</option>
            {demandCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Demand Summary Table */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 pl-4">Product Name</th>
                <th className="py-3">SKU</th>
                <th className="py-3">Category</th>
                <th className="py-3 font-mono">Total Required Qty</th>
                <th className="py-3">Orders Count</th>
                <th className="py-3 font-mono">Current Stock</th>
                <th className="py-3">Fulfillment Status</th>
                <th className="py-3 text-right pr-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No active product demand currently in queue.
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => {
                  const hasShortage = item.currentStock < item.totalQuantity;
                  return (
                    <tr key={`${item.productId}-${item.unit}`} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 pl-4">
                        <div className="font-semibold text-white">{item.productName}</div>
                      </td>
                      <td className="py-3 font-mono text-slate-400">
                        {item.sku}
                      </td>
                      <td className="py-3 text-slate-300">
                        {item.category}
                      </td>
                      <td className="py-3 font-mono font-bold text-amber-400 text-sm">
                        {item.totalQuantity} <span className="text-xs font-normal text-slate-400">{item.unit}</span>
                      </td>
                      <td className="py-3">
                        <span className="font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">
                          {item.orderCount} orders
                        </span>
                      </td>
                      <td className="py-3 font-mono font-medium text-slate-200">
                        {item.currentStock} {item.unit}
                      </td>
                      <td className="py-3">
                        {hasShortage ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Shortage: -{item.totalQuantity - item.currentStock} {item.unit}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Stock Ready</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right pr-4">
                        <button
                          onClick={() => setInspectingItem(item)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>Who Ordered?</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* "WHO ORDERED" MODAL */}
      {inspectingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <span>Who Ordered This Item?</span>
                </h3>
                <div className="text-xs text-slate-300 font-semibold mt-0.5">
                  {inspectingItem.productName} ({inspectingItem.totalQuantity} {inspectingItem.unit} total)
                </div>
              </div>
              <button
                onClick={() => setInspectingItem(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {inspectingItem.orders.map((ord, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-semibold text-white">{ord.shopName}</div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <span>{ord.customerName}</span>
                      <span>•</span>
                      <span>{ord.area}</span>
                      <span>•</span>
                      <span className="font-mono text-indigo-400 font-medium">{ord.orderId}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono font-bold text-amber-400 text-sm">
                      {ord.quantity} {ord.unit}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">{ord.date}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>{inspectingItem.orders.length} active customer orders</span>
              <button
                onClick={() => setInspectingItem(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:text-white font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
