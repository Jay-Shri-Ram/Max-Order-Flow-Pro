import React from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Smartphone, 
  History, 
  Boxes, 
  Users, 
  BarChart3, 
  PackageCheck, 
  AlertOctagon, 
  ShieldCheck 
} from 'lucide-react';
import { Language, UserRole } from '../types';
import { translations } from '../utils/i18n';

export type NavTab = 
  | 'dashboard' 
  | 'new_order' 
  | 'salesman_mode' 
  | 'order_history' 
  | 'demand_summary' 
  | 'customers' 
  | 'customer_analytics' 
  | 'products' 
  | 'exceptions' 
  | 'admin';

interface NavigationProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  lang: Language;
  userRole: UserRole;
  exceptionCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  lang,
  userRole,
  exceptionCount = 0
}) => {
  const t = translations[lang];

  const navItems: { id: NavTab; label: string; icon: React.ReactNode; roles?: UserRole[]; badge?: number }[] = [
    { id: 'dashboard', label: t.dashboard, icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'new_order', label: t.newOrder, icon: <ShoppingCart className="w-4 h-4" /> },
    { id: 'salesman_mode', label: t.salesmanMode, icon: <Smartphone className="w-4 h-4 text-emerald-400" /> },
    { id: 'order_history', label: t.orderHistory, icon: <History className="w-4 h-4" /> },
    { id: 'demand_summary', label: t.demandSummary, icon: <Boxes className="w-4 h-4" /> },
    { id: 'products', label: t.productMaster, icon: <PackageCheck className="w-4 h-4" /> },
    { id: 'customers', label: t.customerMaster, icon: <Users className="w-4 h-4" /> },
    { id: 'customer_analytics', label: t.customerAnalytics, icon: <BarChart3 className="w-4 h-4 text-sky-400" /> },
    { id: 'exceptions', label: t.exceptions, icon: <AlertOctagon className="w-4 h-4 text-amber-400" />, badge: exceptionCount },
    { id: 'admin', label: t.adminPanel, icon: <ShieldCheck className="w-4 h-4 text-purple-400" />, roles: ['Admin'] },
  ];

  // Mobile quick items (top 5 most used)
  const mobileItems: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Home', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'new_order', label: 'POS', icon: <ShoppingCart className="w-5 h-5" /> },
    { id: 'salesman_mode', label: 'Field', icon: <Smartphone className="w-5 h-5" /> },
    { id: 'order_history', label: 'Orders', icon: <History className="w-5 h-5" /> },
    { id: 'demand_summary', label: 'Demand', icon: <Boxes className="w-5 h-5" /> },
  ];

  return (
    <>
      {/* Desktop & Tablet Navigation Bar */}
      <nav className="hidden md:block w-full border-b border-slate-800/60 bg-slate-900/40 backdrop-blur-sm sticky top-16 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-1 py-1.5 overflow-x-auto no-scrollbar">
            {navItems.map((item) => {
              if (item.roles && !item.roles.includes(userRole)) {
                return null;
              }
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`relative flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-slate-800 text-white shadow-sm shadow-indigo-500/10 border border-slate-700/80'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
                  }`}
                >
                  <span className={`${isActive ? 'text-indigo-400' : 'text-slate-400'}`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-amber-500 text-[10px] font-bold text-slate-950">
                      {item.badge}
                    </span>
                  )}
                  {isActive && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-indigo-500 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Floating Bottom Mobile Bar with active glow states */}
      <div className="md:hidden fixed bottom-3 left-3 right-3 z-40 bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-1.5 flex items-center justify-around">
        {mobileItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all duration-200 cursor-pointer relative ${
                isActive
                  ? 'text-indigo-400 bg-indigo-500/10 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className={`transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}>
                {item.icon}
              </span>
              <span className="text-[10px] font-medium mt-1 tracking-tight">
                {item.label}
              </span>
              {isActive && (
                <span className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_#818cf8]" />
              )}
            </button>
          );
        })}
      </div>
    </>
  );
};
