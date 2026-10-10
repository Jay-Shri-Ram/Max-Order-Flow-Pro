import React, { useMemo } from 'react';
import { Customer, Order, StoreSettings, Language } from '../types';
import { translations } from '../utils/i18n';
import { formatCurrency, formatDateDDMMYYYY } from '../utils/formatters';
import { exportDataToExcel } from '../services/exportService';
import { 
  BarChart3, 
  Users, 
  TrendingUp, 
  PieChart, 
  Award, 
  CreditCard, 
  FileSpreadsheet, 
  ShieldAlert, 
  Store,
  Sparkles
} from 'lucide-react';

interface CustomerAnalyticsProps {
  customers: Customer[];
  orders: Order[];
  settings: StoreSettings;
  lang: Language;
  onShowToast: (title: string, message: string, type: 'success' | 'warning' | 'error' | 'info') => void;
}

export const CustomerAnalytics: React.FC<CustomerAnalyticsProps> = ({
  customers,
  orders,
  settings,
  lang,
  onShowToast
}) => {
  const t = translations[lang];

  // Compute LTV and stats per customer
  const customerLTV = useMemo(() => {
    const liveOrders = orders.filter((o) => !o.isDeleted && o.status !== 'Cancelled');
    
    return customers.map((c) => {
      const custOrders = liveOrders.filter((o) => o.customerId === c.id || o.shopName === c.shopName);
      const totalSpend = custOrders.reduce((sum, o) => sum + o.grandTotal, 0);
      const totalOrdersCount = custOrders.length;
      const aov = totalOrdersCount > 0 ? totalSpend / totalOrdersCount : 0;
      const creditRatio = c.creditLimit > 0 ? Math.round((c.outstandingBalance / c.creditLimit) * 100) : 0;

      return {
        customer: c,
        totalSpend,
        totalOrdersCount,
        aov,
        creditRatio,
        lastOrderDate: custOrders[0]?.displayDate || '--'
      };
    }).sort((a, b) => b.totalSpend - a.totalSpend);
  }, [customers, orders]);

  // Area aggregations
  const areaBreakdown = useMemo(() => {
    const map: { [area: string]: { shops: number; revenue: number } } = {};
    customers.forEach((c) => {
      const area = c.area || 'General';
      if (!map[area]) map[area] = { shops: 0, revenue: 0 };
      map[area].shops += 1;
    });

    orders.filter((o) => !o.isDeleted && o.status !== 'Cancelled').forEach((o) => {
      const area = o.area || 'General';
      if (!map[area]) map[area] = { shops: 1, revenue: 0 };
      map[area].revenue += o.grandTotal;
    });

    const totalRev = Object.values(map).reduce((sum, d) => sum + d.revenue, 0) || 1;
    return Object.entries(map).map(([area, d]) => ({
      area,
      shops: d.shops,
      revenue: d.revenue,
      percent: Math.min(100, Math.round((d.revenue / totalRev) * 100))
    })).sort((a, b) => b.revenue - a.revenue);
  }, [customers, orders]);

  // Overall key metrics
  const totalLTV = useMemo(() => {
    return customerLTV.reduce((sum, item) => sum + item.totalSpend, 0);
  }, [customerLTV]);

  const top10Customers = useMemo(() => {
    return customerLTV.slice(0, 10);
  }, [customerLTV]);

  const maxSpend = useMemo(() => {
    return top10Customers[0]?.totalSpend || 1;
  }, [top10Customers]);

  const handleExportAnalytics = () => {
    const rows = customerLTV.map((d, idx) => ({
      'Rank': idx + 1,
      'Shop Name': d.customer.shopName,
      'Contact Name': d.customer.name,
      'Phone': d.customer.phone,
      'Area': d.customer.area,
      'Lifetime Spend': d.totalSpend,
      'Orders Placed': d.totalOrdersCount,
      'Average Order Value': Math.round(d.aov),
      'Outstanding Credit': d.customer.outstandingBalance,
      'Credit Limit': d.customer.creditLimit,
      'Credit Utilization %': `${d.creditRatio}%`,
      'Last Order Date': d.lastOrderDate
    }));

    exportDataToExcel(rows, 'Customer Analytics', 'OrderFlow_Customer_LTV_Analytics');
    onShowToast('Analytics Exported', 'Customer visualization metrics exported to Excel.', 'success');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-16 md:pb-6">
      
      {/* Top Banner */}
      <div className="bg-slate-900/60 border border-slate-800/80 p-4.5 rounded-2xl backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-sky-400" />
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Customer Analytics & Data Visualization Hub
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Deep retail buyer insights: Lifetime Value (LTV), credit risk scores, ordering frequency, and cluster penetration.
          </p>
        </div>

        <button
          onClick={handleExportAnalytics}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition-colors cursor-pointer"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
          <span>Export Analytics Report</span>
        </button>
      </div>

      {/* Bento Stat Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4.5 backdrop-blur-md">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Cumulative LTV Revenue</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-2">
            {formatCurrency(totalLTV, settings.currencySymbol)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Across all registered shops</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4.5 backdrop-blur-md">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Active Retailer Base</span>
            <Users className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-2">
            {customers.length} <span className="text-xs font-normal text-slate-400">shops</span>
          </div>
          <div className="text-[11px] text-emerald-400 mt-1">100% verified KYC records</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4.5 backdrop-blur-md">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Top Tier VIP Buyers</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-2">
            {top10Customers.filter((c) => c.totalSpend > 20000).length} <span className="text-xs font-normal text-slate-400">wholesalers</span>
          </div>
          <div className="text-[11px] text-amber-300 mt-1">Contributing {'>'} 80% volume</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4.5 backdrop-blur-md">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Credit Risk Exposure</span>
            <CreditCard className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-2">
            {formatCurrency(customers.reduce((s, c) => s + c.outstandingBalance, 0), settings.currencySymbol)}
          </div>
          <div className="text-[11px] text-purple-300 mt-1">Total market credit extended</div>
        </div>

      </div>

      {/* Visual Chart: Top Buying Retailers Visual Bars */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Top 10 High-Value Wholesale Accounts</h2>
            <p className="text-xs text-slate-400">Visual comparison of gross lifetime buying volume</p>
          </div>
          <span className="text-xs font-mono text-indigo-400 font-semibold">Ranked by Spend</span>
        </div>

        <div className="space-y-3 pt-2">
          {top10Customers.map((d, index) => {
            const barWidth = Math.max(8, Math.round((d.totalSpend / maxSpend) * 100));
            return (
              <div key={d.customer.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-400 w-5">#{index + 1}</span>
                    <span className="font-semibold text-white">{d.customer.shopName}</span>
                    <span className="text-[11px] text-slate-400">({d.customer.area})</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 text-[11px]">{d.totalOrdersCount} orders</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {formatCurrency(d.totalSpend, settings.currencySymbol)}
                    </span>
                  </div>
                </div>

                {/* Progress Visual Bar */}
                <div className="w-full h-2.5 rounded-full bg-slate-950 overflow-hidden border border-slate-800/80">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-700"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid: Area Distribution & Credit Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Area Clusters */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Market Cluster Concentration</h2>
            <p className="text-xs text-slate-400">Distribution of registered retailers across regions</p>
          </div>

          <div className="space-y-3">
            {areaBreakdown.map((item) => (
              <div key={item.area} className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-white">{item.area}</div>
                  <div className="text-[11px] text-slate-400">{item.shops} retail shops</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-white">
                    {formatCurrency(item.revenue, settings.currencySymbol)}
                  </div>
                  <div className="text-[10px] text-indigo-400 font-semibold">{item.percent}% share</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Credit Utilization Heatmap */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Credit Health & Outstanding Exposure</h2>
            <p className="text-xs text-slate-400">Retailers nearing or exceeding sanctioned credit limits</p>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {customerLTV.map((d) => (
              <div key={d.customer.id} className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-white">{d.customer.shopName}</div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      d.creditRatio > 80
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : d.creditRatio > 40
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {d.creditRatio}% Utilized
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>
                    Balance:{' '}
                    <span className="font-mono text-white font-medium">
                      {formatCurrency(d.customer.outstandingBalance, settings.currencySymbol)}
                    </span>
                  </span>
                  <span>
                    Limit: {formatCurrency(d.customer.creditLimit, settings.currencySymbol)}
                  </span>
                </div>

                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      d.creditRatio > 80 ? 'bg-rose-500' : d.creditRatio > 40 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(3, d.creditRatio))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
