import React, { useState, useEffect } from 'react';
import { 
  AccentTheme, 
  Language, 
  StoreSettings, 
  UserAccount, 
  UserRole 
} from '../types';
import { 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  Trash2, 
  BookOpen, 
  User as UserIcon, 
  ChevronDown, 
  LogOut, 
  KeyRound, 
  ShieldCheck, 
  Clock, 
  Layers, 
  Sparkles,
  Palette,
  Sun,
  Moon
} from 'lucide-react';
import { translations } from '../utils/i18n';

interface HeaderProps {
  settings: StoreSettings;
  accent: AccentTheme;
  onAccentChange: (accent: AccentTheme) => void;
  lang: Language;
  onLangChange: (lang: Language) => void;
  currentUser: UserAccount;
  onSwitchUserRole: (role: UserRole) => void;
  syncStatus: 'synced' | 'syncing' | 'offline';
  onTriggerSync: () => void;
  deletedOrdersCount: number;
  onOpenRecycleBin: () => void;
  themeMode: 'light' | 'dark';
  onToggleThemeMode: () => void;
  onOpenDocs: () => void;
  onOpenAuth: () => void;
  onOpenPasswordUpdate: () => void;
  onOpenCloudSettings: () => void;
  onLogout: () => void;
}

const ACCENT_PALETTES: { id: AccentTheme; name: string; bgClass: string; hex: string }[] = [
  { id: 'indigo', name: 'Indigo Linear', bgClass: 'bg-indigo-500', hex: '#6366f1' },
  { id: 'emerald', name: 'Emerald Peak', bgClass: 'bg-emerald-500', hex: '#10b981' },
  { id: 'ocean', name: 'Ocean Cyan', bgClass: 'bg-sky-500', hex: '#0ea5e9' },
  { id: 'rose', name: 'Rose Velvet', bgClass: 'bg-rose-500', hex: '#f43f5e' },
  { id: 'amber', name: 'Sunset Amber', bgClass: 'bg-amber-500', hex: '#f59e0b' },
  { id: 'violet', name: 'Royal Violet', bgClass: 'bg-purple-500', hex: '#a855f7' },
  { id: 'teal', name: 'Nordic Teal', bgClass: 'bg-teal-500', hex: '#14b8a6' },
  { id: 'slate', name: 'Charcoal Slate', bgClass: 'bg-slate-500', hex: '#64748b' },
];

export const Header: React.FC<HeaderProps> = ({
  settings,
  accent,
  onAccentChange,
  lang,
  onLangChange,
  themeMode,
  onToggleThemeMode,
  currentUser,
  onSwitchUserRole,
  syncStatus,
  onTriggerSync,
  deletedOrdersCount,
  onOpenRecycleBin,
  onOpenDocs,
  onOpenAuth,
  onOpenPasswordUpdate,
  onOpenCloudSettings,
  onLogout
}) => {
  const t = translations[lang];
  const [showPaletteMenu, setShowPaletteMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [remainingTime, setRemainingTime] = useState<string>('59:30');

  useEffect(() => {
    if (!currentUser.demoExpiresAt) return;
    const interval = setInterval(() => {
      const diff = Math.max(0, (currentUser.demoExpiresAt || 0) - Date.now());
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setRemainingTime(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [currentUser.demoExpiresAt]);

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'Admin':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'Salesman':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
      case 'Cashier':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'Warehouse':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Brand & Store */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 shadow-md shadow-indigo-500/20 shrink-0">
            <Layers className="w-5 h-5 text-white" />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-white tracking-tight truncate">
                {t.appName}
              </span>
              <span className="hidden md:inline-flex text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                v2.6 Cloud
              </span>
            </div>
            <div className="text-xs text-slate-400 truncate flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
              <span className="font-medium text-slate-300">{settings.storeName}</span>
            </div>
          </div>
        </div>

        {/* Action Controls & Indicators */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">

          {/* Demo Countdown Timer (if demo mode) */}
          {currentUser.isDemoUser && (
            <div 
              title="Temporary demo session valid for 1 hour with full access"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono font-medium animate-pulse"
            >
              <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="hidden sm:inline">Demo:</span>
              <span>{remainingTime}</span>
            </div>
          )}

          {/* Cloud Sync Status Indicator */}
          <button
            onClick={onOpenCloudSettings}
            title={`Cloud Sync Status: ${syncStatus}. Click to inspect Firebase cloud sync & settings.`}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
              syncStatus === 'synced'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                : syncStatus === 'syncing'
                ? 'bg-sky-500/10 border-sky-500/30 text-sky-300 hover:bg-sky-500/20'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
            }`}
          >
            {syncStatus === 'synced' && <Cloud className="w-3.5 h-3.5 text-emerald-400" />}
            {syncStatus === 'syncing' && <RefreshCw className="w-3.5 h-3.5 text-sky-400 animate-spin" />}
            {syncStatus === 'offline' && <CloudOff className="w-3.5 h-3.5 text-amber-400" />}
            <span className="hidden lg:inline capitalize">
              {syncStatus === 'synced' ? t.synced : syncStatus === 'syncing' ? t.syncing : t.offline}
            </span>
          </button>

          {/* Recycle Bin Trigger */}
          <button
            onClick={onOpenRecycleBin}
            title="Recycle Bin (Soft Deleted Orders)"
            className="relative p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
          >
            <Trash2 className="w-4 h-4 text-slate-400 hover:text-rose-400" />
            {deletedOrdersCount > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-rose-500 text-[10px] font-bold text-white leading-none">
                {deletedOrdersCount}
              </span>
            )}
          </button>

          {/* Swappable Accent Theme Picker */}
          <div className="relative">
            <button
              onClick={() => setShowPaletteMenu(!showPaletteMenu)}
              title="Change Accent Theme (8 Linear Palettes)"
              className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              <Palette className="w-4 h-4 text-slate-400" />
              <span className={`w-2.5 h-2.5 rounded-full ${ACCENT_PALETTES.find(p => p.id === accent)?.bgClass || 'bg-indigo-500'}`} />
            </button>

            {showPaletteMenu && (
              <div 
                className="absolute right-0 mt-2 w-48 rounded-xl bg-slate-900/95 border border-slate-800 shadow-2xl p-2 z-50 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
                onMouseLeave={() => setShowPaletteMenu(false)}
              >
                <div className="text-[11px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider">
                  Accent Palettes
                </div>
                <div className="space-y-1">
                  {ACCENT_PALETTES.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        onAccentChange(p.id);
                        setShowPaletteMenu(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        accent === p.id ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded-full ${p.bgClass} shadow-sm`} />
                      <span>{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Light / Dark Mode Toggle */}
          <button
            onClick={onToggleThemeMode}
            title={`Switch to ${themeMode === 'dark' ? 'Light' : 'Dark'} Mode`}
            className="flex items-center p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            {themeMode === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-400" />
            )}
          </button>

          {/* Multilingual Switcher (EN / हिन्दी) */}
          <button
            onClick={() => onLangChange(lang === 'en' ? 'hi' : 'en')}
            title="Toggle Language: English / हिन्दी"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-700 transition-colors cursor-pointer"
          >
            <span className="font-bold text-indigo-400">{lang === 'en' ? 'EN' : 'हिन्दी'}</span>
          </button>

          {/* Documentation Modal Trigger */}
          <button
            onClick={onOpenDocs}
            title="Open Technical Guide & Operator Documentation"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
            <span>Guide</span>
          </button>

          {/* User Account / Role Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-slate-300">
                <UserIcon className="w-3.5 h-3.5" />
              </div>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${getRoleBadgeColor(currentUser.role)}`}>
                {currentUser.role}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showUserMenu && (
              <div 
                className="absolute right-0 mt-2 w-60 rounded-xl bg-slate-900/95 border border-slate-800 shadow-2xl p-2 z-50 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
                onMouseLeave={() => setShowUserMenu(false)}
              >
                <div className="px-2.5 py-2 border-b border-slate-800">
                  <div className="text-xs font-semibold text-white">{currentUser.name}</div>
                  <div className="text-[11px] text-slate-400 truncate">{currentUser.email}</div>
                </div>

                <div className="py-1">
                  <div className="text-[10px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider">
                    Quick Role Switch:
                  </div>
                  {(['Admin', 'Salesman', 'Cashier', 'Warehouse'] as UserRole[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        onSwitchUserRole(r);
                        setShowUserMenu(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                        currentUser.role === r ? 'bg-indigo-600/30 text-indigo-300' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span>{r}</span>
                      {currentUser.role === r && <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />}
                    </button>
                  ))}
                </div>

                <div className="border-t border-slate-800 pt-1 space-y-0.5">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onOpenPasswordUpdate();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                    <span>Change Password</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-rose-300 hover:text-rose-200 hover:bg-rose-950/40 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-400" />
                    <span>Sign Out / Switch Store</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
