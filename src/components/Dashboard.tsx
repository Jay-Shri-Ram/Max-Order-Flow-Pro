import React, { useMemo } from 'react';
import { Order, Product, Customer, StoreSettings, Language } from '../types';
import { translations } from '../utils/i18n';
import { formatCurrency } from '../utils/formatters';
import { 
  TrendingUp, 
  ShoppingBag, 
  Users, 
  AlertTriangle, 
  ArrowUpRight, 
  PlusCircle, 
  FileSpreadsheet, 
  Smartphone, 
  Boxes, 
  Clock, 
  CheckCircle2, 
  Printer, 
  Sparkles,
  DollarSign
} from 'lucide-react';
import { NavTab } from './Navigation';

interface DashboardProps {
  orders: Order[];
  products: Product[];
  customers: Customer[];
  settings: StoreSettings;
  lang: Language;
  onNavigate: (tab: NavTab) => void;
  onPrintInvoice: (order: Order) => void;
  onUpdateOrderStatus: (orderId: string, newStatus: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  orders,
  products,
  customers,
  settings,
  lang,
  onNavigate,
  onPrintInvoice,
  onUpdateOrderStatus
}) => {
  const t = translations[lang];

  // Calculated Stats
  const stats = useMemo(() => {
    const liveOrders = orders.filter((o) => !o.isDeleted);
    const activeOrders = liveOrders.filter((o) => o.status === 'Pending' || o.status === 'In Process');
    const completedOrders = liveOrders.filter((o) => o.status === 'Complete');
    
    const totalRevenue = liveOrders
      .filter((o) => o.status !== 'Cancelled')
      .reduce((sum, o) => sum + (o.grandTotal || 0), 0);

    const pendingRevenue = activeOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);

    const lowStockItems = products.filter((p) => p.stock <= p.reorderLevel);

    const totalOutstanding = customers.reduce((sum, c) => sum + (c.outstandingBalance || 0), 0);

    const averageOrderValue = liveOrders.length > 0 ? totalRevenue / liveOrders.length : 0;
    const fulfillmentRate = liveOrders.length > 0 ? Math.round((completedOrders.length / liveOrders.length) * 100) : 0;

    return {
      totalRevenue,
      activeOrdersCount: activeOrders.length,
      pendingRevenue,
      totalCustomers: customers.length,
      lowStockCount: lowStockItems.length,
      totalOutstanding,
      averageOrderValue,
      fulfillmentRate,
      recentOrders: liveOrders.slice(0, 6)
    };
  }, [orders, products, customers]);

  // Area distribution calculations
  const areaDistribution = useMemo(() => {
    const map: { [area: string]: { count: number; revenue: number } } = {};
    orders.filter(o => !o.isDeleted && o.status !== 'Cancelled').forEach(o => {
      const area = o.area || 'Other';
      if (!map[area]) map[area] = { count: 0, revenue: 0 };
      map[area].count += 1;
      map[area].revenue += o.grandTotal;
    });

    const totalRev = stats.totalRevenue || 1;
    return Object.entries(map)
      .map(([area, data]) => ({
        area,
        count: data.count,
        revenue: data.revenue,
        percent: Math.min(100, Math.round((data.revenue / totalRev) * 100))
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [orders, stats.totalRevenue]);

  // Top Products Demand
  const topProducts = useMemo(() => {
    const counts: { [name: string]: { qty: number; revenue: number; unit: string } } = {};
    orders.filter(o => !o.isDeleted && o.status !== 'Cancelled').forEach(o => {
      o.items.forEach(i => {
        if (!counts[i.productName]) counts[i.productName] = { qty: 0, revenue: 0, unit: i.unit };
        counts[i.productName].qty += i.quantity;
        counts[i.productName].revenue += i.total;
      });
    });

    return Object.entries(counts)
      .map(([name, d]) => ({ name, ...d }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 4);
  }, [orders]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Banner & Quick Action Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800/80 p-5 rounded-2xl backdrop-blur-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
        
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Operational Command Hub
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Engine Active
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Multi-tenant wholesale & retail POS engine. Instant offline IndexedDB, thermal receipt dispatcher, and field order synchronization.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('new_order')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New POS Order</span>
          </button>

          <button
            onClick={() => onNavigate('salesman_mode')}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 font-medium text-xs transition-all cursor-pointer"
          >
            <Smartphone className="w-4 h-4" />
            <span>Field Booking</span>
          </button>

          <button
            onClick={() => onNavigate('demand_summary')}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium text-xs transition-all cursor-pointer"
          >
            <Boxes className="w-4 h-4 text-amber-400" />
            <span>Dispatch Demand</span>
          </button>
        </div>
      </div>

      {/* Bento Grid Stat Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Revenue */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4.5 backdrop-blur-md relative overflow-hidden group hover:border-indigo-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">{t.totalRevenue}</span>
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono-numbers text-white tracking-tight">
              {formatCurrency(stats.totalRevenue, settings.currencySymbol)}
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="inline-flex items-center text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                <ArrowUpRight className="w-3 h-3 mr-0.5" /> +14.8%
              </span>
              <span className="text-[11px] text-slate-400">vs last 30d</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
            <span>Pending Pipeline:</span>
            <span className="font-mono text-amber-400 font-medium">
              {formatCurrency(stats.pendingRevenue, settings.currencySymbol)}
            </span>
          </div>
        </div>

        {/* Card 2: Active Orders */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4.5 backdrop-blur-md relative overflow-hidden group hover:border-sky-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">{t.activeOrders}</span>
            <span className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <ShoppingBag className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono-numbers text-white tracking-tight">
              {stats.activeOrdersCount} <span className="text-xs font-normal text-slate-400 font-sans">orders in queue</span>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="inline-flex items-center text-[11px] font-medium text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
                Fulfillment: {stats.fulfillmentRate}%
              </span>
              <span className="text-[11px] text-slate-400">dispatch ready</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
            <span>Average Order Value:</span>
            <span className="font-mono text-slate-200 font-medium">
              {formatCurrency(stats.averageOrderValue, settings.currencySymbol)}
            </span>
          </div>
        </div>

        {/* Card 3: Customers & Credit */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4.5 backdrop-blur-md relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">{t.totalCustomers}</span>
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono-numbers text-white tracking-tight">
              {stats.totalCustomers} <span className="text-xs font-normal text-slate-400 font-sans">registered shops</span>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[11px] text-slate-400">Total Outstanding Balance:</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
            <span>Market Credit:</span>
            <span className="font-mono text-emerald-400 font-semibold">
              {formatCurrency(stats.totalOutstanding, settings.currencySymbol)}
            </span>
          </div>
        </div>

        {/* Card 4: Inventory Alerts */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4.5 backdrop-blur-md relative overflow-hidden group hover:border-rose-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">{t.lowStockItems}</span>
            <span className={`p-2 rounded-xl border ${
              stats.lowStockCount > 0 
                ? 'bg-rose-500/15 text-rose-400 border-rose-500/30 animate-pulse' 
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono-numbers text-white tracking-tight flex items-center gap-2">
              <span>{stats.lowStockCount}</span>
              <span className="text-xs font-normal text-slate-400 font-sans">SKUs reorder level</span>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded border ${
                stats.lowStockCount > 0
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}>
                {stats.lowStockCount > 0 ? 'Replenishment Needed' : 'Inventory Healthy'}
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
            <span>Active Catalog Items:</span>
            <span className="font-mono text-slate-200 font-medium">
              {products.length} Products
            </span>
          </div>
        </div>

      </div>

      {/* Middle Grid: Area Distribution & Top Moving SKUs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Area Distribution */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Cluster & Area Sales Distribution</h2>
              <p className="text-xs text-slate-400">Revenue concentration across wholesale regions</p>
            </div>
            <button
              onClick={() => onNavigate('customer_analytics')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              Full Analytics →
            </button>
          </div>

          <div className="space-y-3.5">
            {areaDistribution.map((item) => (
              <div key={item.area} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-200">{item.area}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">{item.count} orders</span>
                    <span className="font-mono text-white font-medium">
                      {formatCurrency(item.revenue, settings.currencySymbol)}
                    </span>
                  </div>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                    style={{ width: `${Math.max(6, item.percent)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fast-Moving SKUs */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Top Velocity Products</h2>
              <p className="text-xs text-slate-400">Most requested items across active and fulfilled orders</p>
            </div>
            <button
              onClick={() => onNavigate('demand_summary')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              Demand Report →
            </button>
          </div>

          <div className="divide-y divide-slate-800/60">
            {topProducts.map((p, idx) => (
              <div key={p.name} className="py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-300 text-xs font-mono font-semibold flex items-center justify-center shrink-0">
                    #{idx + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-slate-200 truncate">{p.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {p.qty} {p.unit} booked
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-mono font-semibold text-emerald-400">
                    {formatCurrency(p.revenue, settings.currencySymbol)}
                  </div>
                  <div className="text-[10px] text-slate-400">gross booked</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Recent Live Orders Table */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Recent Orders Stream</h2>
            <p className="text-xs text-slate-400">Live feed with quick status pills and instant invoice print</p>
          </div>
          <button
            onClick={() => onNavigate('order_history')}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors cursor-pointer"
          >
            View All ({orders.filter(o => !o.isDeleted).length}) →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-medium">
                <th className="pb-3 pl-1">Order ID</th>
                <th className="pb-3">Customer & Shop</th>
                <th className="pb-3">Area</th>
                <th className="pb-3">Date (DD-MM-YYYY)</th>
                <th className="pb-3">Grand Total</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right pr-1">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {stats.recentOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 pl-1 font-mono font-medium text-indigo-400">
                    {order.id}
                  </td>
                  <td className="py-3">
                    <div className="font-medium text-slate-200">{order.shopName}</div>
                    <div className="text-[11px] text-slate-400">{order.customerName}</div>
                  </td>
                  <td className="py-3 text-slate-400">{order.area}</td>
                  <td className="py-3 font-mono text-slate-300">{order.displayDate}</td>
                  <td className="py-3 font-mono font-semibold text-white">
                    {formatCurrency(order.grandTotal, settings.currencySymbol)}
                  </td>
                  <td className="py-3">
                    <select
                      value={order.status}
                      onChange={(e) => onUpdateOrderStatus(order.id, e.target.value)}
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border cursor-pointer bg-slate-900 ${
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
                  <td className="py-3 text-right pr-1">
                    <button
                      onClick={() => onPrintInvoice(order)}
                      title="Print A4 / Thermal Invoice"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium border border-slate-700 transition-colors cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Print</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
