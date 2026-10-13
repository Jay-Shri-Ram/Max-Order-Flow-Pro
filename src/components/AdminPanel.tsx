import React, { useState } from 'react';
import { 
  UserAccount, 
  UserRole, 
  StoreSettings, 
  Customer, 
  Product, 
  Order, 
  Language 
} from '../types';
import { translations } from '../utils/i18n';
import { exportOrdersTwoSheetExcel, exportDataToExcel } from '../services/exportService';
import { 
  ShieldCheck, 
  Users, 
  Download, 
  Settings, 
  KeyRound, 
  Trash2, 
  UserPlus, 
  FileSpreadsheet, 
  Database, 
  Save, 
  RotateCcw,
  Cloud, 
  CheckCircle2,
  Lock,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Play
} from 'lucide-react';
import { 
  testFirestoreConnection, 
  syncLocalToFirestore, 
  syncFirestoreToLocal, 
  getActiveFirebaseConfig, 
  DEFAULT_FIREBASE_CONFIG 
} from '../services/firebaseSync';

interface AdminPanelProps {
  users: UserAccount[];
  settings: StoreSettings;
  customers: Customer[];
  products: Product[];
  orders: Order[];
  lang: Language;
  onSaveUser: (user: UserAccount) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
  onSaveSettings: (settings: StoreSettings) => Promise<void>;
  onResetDatabase: () => Promise<void>;
  onShowToast: (title: string, message: string, type: 'success' | 'warning' | 'error' | 'info') => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  users,
  settings,
  customers,
  products,
  orders,
  lang,
  onSaveUser,
  onDeleteUser,
  onSaveSettings,
  onResetDatabase,
  onShowToast
}) => {
  const t = translations[lang];

  const [activeSubTab, setActiveSubTab] = useState<'users' | 'reports' | 'config' | 'cloud'>('users');

  // New User Form State
  const [showAddUserModal, setShowAddUserModal] = useState<boolean>(false);
  const [newUserName, setNewUserName] = useState<string>('');
  const [newUserEmail, setNewUserEmail] = useState<string>('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('Salesman');
  const [newUserPhone, setNewUserPhone] = useState<string>('');

  // Settings Form State
  const [storeName, setStoreName] = useState<string>(settings.storeName);
  const [tagline, setTagline] = useState<string>(settings.tagline);
  const [phone, setPhone] = useState<string>(settings.phone);
  const [email, setEmail] = useState<string>(settings.email);
  const [address, setAddress] = useState<string>(settings.address);
  const [taxId, setTaxId] = useState<string>(settings.taxId);
  const [upiId, setUpiId] = useState<string>(settings.upiId);
  const [bankName, setBankName] = useState<string>(settings.bankName);
  const [bankAccount, setBankAccount] = useState<string>(settings.bankAccount);
  const [bankIfsc, setBankIfsc] = useState<string>(settings.bankIfsc);
  const [orderPrefix, setOrderPrefix] = useState<string>(settings.orderPrefix);
  const [orderMiddle, setOrderMiddle] = useState<string>(settings.orderMiddle);
  const [orderCounter, setOrderCounter] = useState<number>(settings.orderCounter);
  const [defaultTaxRate, setDefaultTaxRate] = useState<number>(settings.defaultTaxRate);
  const [defaultPrintFormat, setDefaultPrintFormat] = useState<any>(settings.defaultPrintFormat);
  const [terms, setTerms] = useState<string>(settings.terms);

  // Firebase Cloud Test & Sync State
  const [testingFirebase, setTestingFirebase] = useState<boolean>(false);
  const [connectionMessage, setConnectionMessage] = useState<string | null>(null);
  const [syncingCloud, setSyncingCloud] = useState<boolean>(false);
  const [copiedSnippet, setCopiedSnippet] = useState<boolean>(false);

  const handleTestConnection = async () => {
    setTestingFirebase(true);
    setConnectionMessage(null);
    const res = await testFirestoreConnection();
    setTestingFirebase(false);
    setConnectionMessage(res.message);
    if (res.success) {
      onShowToast('Firebase Connected', res.message, 'success');
    } else {
      onShowToast('Firebase Status', res.message, 'info');
    }
  };

  const handlePushToCloud = async () => {
    setSyncingCloud(true);
    const res = await syncLocalToFirestore(orders, products, customers);
    setSyncingCloud(false);
    if (res.success) {
      onShowToast('Cloud Synced', res.message, 'success');
    } else {
      onShowToast('Sync Status', res.message, 'warning');
    }
  };

  const handlePullFromCloud = async () => {
    setSyncingCloud(true);
    const res = await syncFirestoreToLocal();
    setSyncingCloud(false);
    if (res.success) {
      onShowToast('Cloud Pulled', res.message, 'success');
    } else {
      onShowToast('Sync Status', res.message, 'warning');
    }
  };

  // Handle Add Staff User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) {
      onShowToast('Validation', 'Name and email are required.', 'error');
      return;
    }

    const newUser: UserAccount = {
      id: `usr_${Date.now()}`,
      name: newUserName.trim(),
      email: newUserEmail.trim(),
      role: newUserRole,
      phone: newUserPhone.trim(),
      tenantId: settings.storeName
    };

    await onSaveUser(newUser);
    setShowAddUserModal(false);
    setNewUserName('');
    setNewUserEmail('');
    setNewUserPhone('');
    onShowToast('User Added', `${newUser.name} created with role ${newUser.role}.`, 'success');
  };

  // Handle Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated: StoreSettings = {
      ...settings,
      storeName: storeName.trim(),
      tagline: tagline.trim(),
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      taxId: taxId.trim(),
      upiId: upiId.trim(),
      bankName: bankName.trim(),
      bankAccount: bankAccount.trim(),
      bankIfsc: bankIfsc.trim(),
      orderPrefix: orderPrefix.trim(),
      orderMiddle: orderMiddle.trim(),
      orderCounter: Number(orderCounter) || 1000,
      defaultTaxRate: Number(defaultTaxRate) || 0,
      defaultPrintFormat,
      terms: terms.trim()
    };

    await onSaveSettings(updated);
    onShowToast('Settings Saved', 'System configuration updated successfully!', 'success');
  };

  // Download Full JSON Backup
  const handleDownloadFullJson = () => {
    const backup = {
      exportedAt: new Date().toISOString(),
      storeSettings: settings,
      customers,
      products,
      orders,
      users
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute('download', `OrderFlow_Pro_Full_Backup_${new Date().toISOString().slice(0, 10)}.json`);
    dlAnchorElem.click();
    onShowToast('Backup Downloaded', 'Full database snapshot JSON generated.', 'success');
  };

  // Download Full System Master Dump in Excel
  const handleDownloadFullExcelDump = () => {
    exportOrdersTwoSheetExcel(orders, 'OrderFlow_Full_System_Orders_Master');
    onShowToast('Excel Dump Ready', 'Master order data downloaded.', 'success');
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300 pb-16 md:pb-6">
      
      {/* Top Banner */}
      <div className="bg-slate-900/60 border border-slate-800/80 p-4.5 rounded-2xl backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-purple-400" />
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Administrative Control & User Management
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Role-based access control, analytics master report downloads, and cloud database settings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadFullJson}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>Download JSON Backup</span>
          </button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab('users')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
            activeSubTab === 'users'
              ? 'bg-purple-600 text-white'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>User Accounts & Staff ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('reports')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
            activeSubTab === 'reports'
              ? 'bg-purple-600 text-white'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Analytics Reports Download</span>
        </button>

        <button
          onClick={() => setActiveSubTab('config')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
            activeSubTab === 'config'
              ? 'bg-purple-600 text-white'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Store & Order Config</span>
        </button>

        <button
          onClick={() => setActiveSubTab('cloud')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
            activeSubTab === 'cloud'
              ? 'bg-purple-600 text-white'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Cloud className="w-3.5 h-3.5" />
          <span>Firebase Cloud Sync</span>
        </button>
      </div>

      {/* SUB-TAB 1: USER MANAGEMENT */}
      {activeSubTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">Staff Credentials & Roles</h2>
              <p className="text-xs text-slate-400">Manage internal employees for Admin, Salesman, Cashier, and Warehouse roles.</p>
            </div>
            <button
              onClick={() => setShowAddUserModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Staff User</span>
            </button>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-md overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 pl-4">Staff Member</th>
                  <th className="py-3">Email Address</th>
                  <th className="py-3">Role</th>
                  <th className="py-3 font-mono">Mobile</th>
                  <th className="py-3 text-right pr-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/30">
                    <td className="py-3 pl-4 font-semibold text-white">{u.name}</td>
                    <td className="py-3 text-slate-300 font-mono">{u.email}</td>
                    <td className="py-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                        u.role === 'Admin'
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                          : u.role === 'Salesman'
                          ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                          : u.role === 'Cashier'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 font-mono text-slate-400">{u.phone || '--'}</td>
                    <td className="py-3 text-right pr-4">
                      {users.length > 1 && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete user ${u.name}?`)) onDeleteUser(u.id);
                          }}
                          className="p-1 rounded text-slate-500 hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: REPORTS DOWNLOAD */}
      {activeSubTab === 'reports' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl backdrop-blur-md space-y-3">
            <FileSpreadsheet className="w-8 h-8 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Full Two-Sheet Order Dump (.xlsx)</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Generates multi-tab workbook with Sheet 1 for order headers and Sheet 2 for individual product line items.
            </p>
            <button
              onClick={handleDownloadFullExcelDump}
              className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs"
            >
              Export Excel Workbook
            </button>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl backdrop-blur-md space-y-3">
            <Database className="w-8 h-8 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">Full Database JSON Archive</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Complete raw JSON dump of customers, products, categories, orders, audit logs, and settings.
            </p>
            <button
              onClick={handleDownloadFullJson}
              className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs"
            >
              Export JSON Archive
            </button>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl backdrop-blur-md space-y-3">
            <RotateCcw className="w-8 h-8 text-rose-400" />
            <h3 className="text-sm font-bold text-white">Database Reset & Clean Fixtures</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Clear local IndexedDB storage and reload pristine demonstration dataset.
            </p>
            <button
              onClick={async () => {
                if (window.confirm('Reset database to clean initial state?')) {
                  await onResetDatabase();
                  onShowToast('Database Reset', 'Sample data restored successfully.', 'info');
                }
              }}
              className="w-full py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 font-semibold text-xs"
            >
              Reset to Clean State
            </button>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: STORE CONFIG */}
      {activeSubTab === 'config' && (
        <form onSubmit={handleSaveSettings} className="bg-slate-900/60 border border-slate-800/80 p-6 rounded-2xl backdrop-blur-md space-y-5 text-xs">
          <div>
            <h2 className="text-sm font-semibold text-white">Store Profile & Invoicing Parameters</h2>
            <p className="text-slate-400 mt-0.5">These parameters populate A4 Tax Invoices and thermal POS receipts.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-slate-400 block mb-1">Company / Store Name *</label>
              <input
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Tagline</label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Phone *</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-white"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-slate-400 block mb-1">Warehouse Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">GSTIN / Tax ID Number</label>
              <input
                type="text"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-white"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Merchant UPI ID (for QR Code)</label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="merchant@upi"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-white"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Bank Name</label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Bank Account Number</label>
              <input
                type="text"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-white"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">IFSC Code</label>
              <input
                type="text"
                value={bankIfsc}
                onChange={(e) => setBankIfsc(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-white"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Default Print Format</label>
              <select
                value={defaultPrintFormat}
                onChange={(e) => setDefaultPrintFormat(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              >
                <option value="thermal">Thermal POS Slip (80mm)</option>
                <option value="a4">Standard A4 Tax Invoice</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Order ID Sequence Rules</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">Prefix</label>
                <input
                  type="text"
                  value={orderPrefix}
                  onChange={(e) => setOrderPrefix(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Middle</label>
                <input
                  type="text"
                  value={orderMiddle}
                  onChange={(e) => setOrderMiddle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Next Counter</label>
                <input
                  type="number"
                  value={orderCounter}
                  onChange={(e) => setOrderCounter(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-white"
                />
              </div>
            </div>
            <div className="text-[11px] text-slate-400 mt-1.5">
              Next Generated ID Sample: <span className="font-mono text-indigo-400 font-bold">{orderPrefix}-{orderMiddle}-{orderCounter}</span>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save System Settings</span>
            </button>
          </div>
        </form>
      )}

      {/* SUB-TAB 4: FIREBASE CLOUD SYNC */}
      {activeSubTab === 'cloud' && (
        <div className="bg-slate-900/60 border border-slate-800/80 p-6 rounded-2xl backdrop-blur-md space-y-5 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Cloud className="w-8 h-8 text-sky-400 shrink-0" />
              <div>
                <h2 className="text-sm font-semibold text-white">Firebase Cloud Database & Sync Center</h2>
                <p className="text-slate-400">Integrated Firebase Firestore for live cloud backups and multi-device persistence.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={testingFirebase}
                onClick={handleTestConnection}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold text-xs shadow-md transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testingFirebase ? 'animate-spin' : ''}`} />
                <span>Test Connection</span>
              </button>

              <button
                type="button"
                disabled={syncingCloud}
                onClick={handlePushToCloud}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs shadow-md transition-colors cursor-pointer"
              >
                <Cloud className="w-3.5 h-3.5" />
                <span>Push to Cloud</span>
              </button>

              <button
                type="button"
                disabled={syncingCloud}
                onClick={handlePullFromCloud}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-semibold text-xs border border-slate-700 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-indigo-400" />
                <span>Pull from Cloud</span>
              </button>
            </div>
          </div>

          {/* Connection Result Banner */}
          {connectionMessage && (
            <div className="p-3 rounded-xl bg-slate-950 border border-sky-500/40 text-sky-300 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
                <span>{connectionMessage}</span>
              </div>
              <button onClick={() => setConnectionMessage(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
          )}

          {/* Active Config Parameters */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">Active Firebase Project Credentials</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                CONNECTED
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-[11px]">
              <div>
                <label className="text-slate-500 block mb-0.5">Project ID:</label>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-white font-semibold">
                  {DEFAULT_FIREBASE_CONFIG.projectId}
                </div>
              </div>
              <div>
                <label className="text-slate-500 block mb-0.5">Auth Domain:</label>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                  {DEFAULT_FIREBASE_CONFIG.authDomain}
                </div>
              </div>
              <div>
                <label className="text-slate-500 block mb-0.5">API Key:</label>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 truncate">
                  {DEFAULT_FIREBASE_CONFIG.apiKey.slice(0, 14)}... (Protected)
                </div>
              </div>
              <div>
                <label className="text-slate-500 block mb-0.5">App ID:</label>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                  {DEFAULT_FIREBASE_CONFIG.appId}
                </div>
              </div>
            </div>
          </div>

          {/* CDN & HTML Script Integration Guide (Requested by User) */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-xs">How to Add Firebase via CDN vs NPM</h3>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  OrderFlow Pro uses the official modular SDK package (`firebase/app`, `firebase/firestore`). If you ever need to embed via CDN in standalone HTML:
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`<script type="module">\n  import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";\n  import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";\n\n  const firebaseConfig = {\n    apiKey: "${DEFAULT_FIREBASE_CONFIG.apiKey}",\n    authDomain: "${DEFAULT_FIREBASE_CONFIG.authDomain}",\n    projectId: "${DEFAULT_FIREBASE_CONFIG.projectId}",\n    storageBucket: "${DEFAULT_FIREBASE_CONFIG.storageBucket}",\n    messagingSenderId: "${DEFAULT_FIREBASE_CONFIG.messagingSenderId}",\n    appId: "${DEFAULT_FIREBASE_CONFIG.appId}",\n    measurementId: "${DEFAULT_FIREBASE_CONFIG.measurementId}"\n  };\n\n  const app = initializeApp(firebaseConfig);\n  const db = getFirestore(app);\n<\/script>`);
                  setCopiedSnippet(true);
                  setTimeout(() => setCopiedSnippet(false), 2500);
                  onShowToast('Copied', 'Firebase CDN code snippet copied to clipboard!', 'info');
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold border border-slate-700 cursor-pointer"
              >
                {copiedSnippet ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                <span>{copiedSnippet ? 'Copied!' : 'Copy CDN Code'}</span>
              </button>
            </div>

            <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-indigo-300 overflow-x-auto leading-relaxed">
{`<script type="module">
  import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
  import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

  const firebaseConfig = {
    apiKey: "${DEFAULT_FIREBASE_CONFIG.apiKey}",
    authDomain: "${DEFAULT_FIREBASE_CONFIG.authDomain}",
    projectId: "${DEFAULT_FIREBASE_CONFIG.projectId}",
    storageBucket: "${DEFAULT_FIREBASE_CONFIG.storageBucket}",
    messagingSenderId: "${DEFAULT_FIREBASE_CONFIG.messagingSenderId}",
    appId: "${DEFAULT_FIREBASE_CONFIG.appId}",
    measurementId: "${DEFAULT_FIREBASE_CONFIG.measurementId}"
  };

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
</script>`}
            </pre>
          </div>

        </div>
      )}

      {/* ADD STAFF MODAL */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-white">Add Staff User</h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-slate-400">✕</button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Work Email *</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Role Permission</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  <option value="Admin">Administrator (Full Access)</option>
                  <option value="Salesman">Field Salesman (Booking Mode)</option>
                  <option value="Cashier">POS Cashier (Billing & Invoices)</option>
                  <option value="Warehouse">Warehouse Dispatch Manager</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={newUserPhone}
                  onChange={(e) => setNewUserPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-purple-600 text-white font-semibold"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
