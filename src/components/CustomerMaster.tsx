import React, { useState, useMemo } from 'react';
import { Customer, StoreSettings, Language } from '../types';
import { translations } from '../utils/i18n';
import { formatCurrency, formatDateDDMMYYYY } from '../utils/formatters';
import { exportDataToExcel } from '../services/exportService';
import * as XLSX from 'xlsx';
import { 
  Users, 
  Search, 
  Plus, 
  FileSpreadsheet, 
  Upload, 
  Trash2, 
  Edit2, 
  CheckSquare, 
  Square, 
  MapPin, 
  Phone, 
  Building2,
  DollarSign
} from 'lucide-react';

interface CustomerMasterProps {
  customers: Customer[];
  settings: StoreSettings;
  lang: Language;
  onSaveCustomer: (customer: Customer) => Promise<void>;
  onBulkUpdateLocation: (customerIds: string[], newArea: string) => Promise<void>;
  onBulkDeleteCustomers: (customerIds: string[]) => Promise<void>;
  onImportCustomers: (customers: Customer[]) => Promise<void>;
  onShowToast: (title: string, message: string, type: 'success' | 'warning' | 'error' | 'info') => void;
}

export const CustomerMaster: React.FC<CustomerMasterProps> = ({
  customers,
  settings,
  lang,
  onSaveCustomer,
  onBulkUpdateLocation,
  onBulkDeleteCustomers,
  onImportCustomers,
  onShowToast
}) => {
  const t = translations[lang];

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [areaFilter, setAreaFilter] = useState<string>('ALL');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal State for Add / Edit
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formName, setFormName] = useState<string>('');
  const [formShop, setFormShop] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formAddress, setFormAddress] = useState<string>('');
  const [formArea, setFormArea] = useState<string>('');
  const [formCreditLimit, setFormCreditLimit] = useState<number>(100000);
  const [formBalance, setFormBalance] = useState<number>(0);

  // Bulk Location Modal
  const [showBulkAreaModal, setShowBulkAreaModal] = useState<boolean>(false);
  const [bulkNewArea, setBulkNewArea] = useState<string>('');

  const distinctAreas = useMemo(() => {
    const set = new Set<string>();
    customers.forEach((c) => {
      if (c.area) set.add(c.area.trim());
    });
    return Array.from(set).sort();
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchArea = areaFilter === 'ALL' || c.area === areaFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchQ =
        !q ||
        c.shopName.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.area.toLowerCase().includes(q);
      return matchArea && matchQ;
    });
  }, [customers, areaFilter, searchQuery]);

  const isAllSelected = filteredCustomers.length > 0 && selectedIds.size === filteredCustomers.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCustomers.map((c) => c.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormName('');
    setFormShop('');
    setFormPhone('');
    setFormAddress('');
    setFormArea(distinctAreas[0] || 'General Market');
    setFormCreditLimit(100000);
    setFormBalance(0);
    setShowModal(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setFormName(c.name);
    setFormShop(c.shopName);
    setFormPhone(c.phone);
    setFormAddress(c.address);
    setFormArea(c.area);
    setFormCreditLimit(c.creditLimit);
    setFormBalance(c.outstandingBalance);
    setShowModal(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formShop.trim() || !formPhone.trim()) {
      onShowToast('Validation', 'Shop name and phone are required.', 'error');
      return;
    }

    const now = new Date().toISOString();
    const customer: Customer = {
      id: editingCustomer ? editingCustomer.id : `cust_${Date.now()}`,
      name: formName.trim() || formShop.trim(),
      shopName: formShop.trim(),
      phone: formPhone.trim(),
      address: formAddress.trim(),
      area: formArea.trim() || 'General',
      creditLimit: Number(formCreditLimit) || 0,
      outstandingBalance: Number(formBalance) || 0,
      createdAt: editingCustomer ? editingCustomer.createdAt : now,
      updatedAt: now,
      tenantId: settings.storeName
    };

    await onSaveCustomer(customer);
    setShowModal(false);
    onShowToast('Customer Saved', `${customer.shopName} profile updated!`, 'success');
  };

  const handleBulkAreaUpdate = async () => {
    if (!bulkNewArea.trim() || selectedIds.size === 0) return;
    await onBulkUpdateLocation(Array.from(selectedIds), bulkNewArea.trim());
    onShowToast('Location Updated', `${selectedIds.size} customers assigned to ${bulkNewArea}.`, 'success');
    setShowBulkAreaModal(false);
    setBulkNewArea('');
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedIds.size} selected customer accounts?`)) {
      await onBulkDeleteCustomers(Array.from(selectedIds));
      onShowToast('Deleted', `${selectedIds.size} customer accounts removed.`, 'info');
      setSelectedIds(new Set());
    }
  };

  // Excel Template & Import
  const handleDownloadTemplate = () => {
    const templateRows = [
      {
        'Shop Name': 'Gupta Provisions',
        'Customer Name': 'Ramesh Gupta',
        'Phone': '9812345678',
        'Area': 'Karol Bagh',
        'Address': 'Shop 12, Main Bazar',
        'Credit Limit': 150000,
        'Outstanding Balance': 0
      }
    ];
    exportDataToExcel(templateRows, 'Customer Template', 'Customers_Import_Template');
    onShowToast('Template Downloaded', 'Use this Excel layout for batch customer imports.', 'info');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        if (!data || data.length === 0) {
          onShowToast('Empty File', 'No rows found in uploaded sheet.', 'warning');
          return;
        }

        const now = new Date().toISOString();
        const parsed: Customer[] = data.map((row, i) => ({
          id: `cust_imp_${Date.now()}_${i}`,
          shopName: String(row['Shop Name'] || row['Shop'] || `Shop ${i + 1}`).trim(),
          name: String(row['Customer Name'] || row['Name'] || row['Shop Name'] || 'Customer').trim(),
          phone: String(row['Phone'] || row['Mobile'] || '').replace(/[^0-9]/g, ''),
          area: String(row['Area'] || 'General').trim(),
          address: String(row['Address'] || '').trim(),
          creditLimit: Number(row['Credit Limit']) || 100000,
          outstandingBalance: Number(row['Outstanding Balance']) || 0,
          createdAt: now,
          updatedAt: now,
          tenantId: settings.storeName
        }));

        await onImportCustomers(parsed);
        onShowToast('Import Success', `${parsed.length} customers imported into database!`, 'success');
      } catch (err: any) {
        onShowToast('Import Failed', err.message, 'error');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleExportCustomers = () => {
    if (customers.length === 0) return;
    const rows = customers.map((c) => ({
      'ID': c.id,
      'Shop Name': c.shopName,
      'Contact Person': c.name,
      'Phone': c.phone,
      'Area': c.area,
      'Address': c.address,
      'Credit Limit': c.creditLimit,
      'Outstanding Balance': c.outstandingBalance,
      'Created Date': formatDateDDMMYYYY(c.createdAt)
    }));
    exportDataToExcel(rows, 'Customers', 'OrderFlow_Customers_Master');
    onShowToast('Exported', 'Customer directory exported to Excel.', 'success');
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300 pb-16 md:pb-6">
      
      {/* Top Banner */}
      <div className="bg-slate-900/60 border border-slate-800/80 p-4.5 rounded-2xl backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <span>Customer Master & B2B Retailer Directory</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage wholesale retailers, credit limits, area distribution clusters, and batch Excel synchronization.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Customer</span>
          </button>

          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-sky-400" />
            <span>Import Excel</span>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" />
          </label>

          <button
            onClick={handleExportCustomers}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={handleDownloadTemplate}
            className="text-xs text-slate-400 hover:text-indigo-300 underline font-medium ml-1"
          >
            Download Template
          </button>
        </div>
      </div>

      {/* Filter & Batch Actions Bar */}
      <div className="bg-slate-900/60 border border-slate-800/80 p-3.5 rounded-2xl backdrop-blur-md space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-8 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search customers by shop name, contact person, area, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="sm:col-span-4">
            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Market Areas ({distinctAreas.length})</option>
              {distinctAreas.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Batch Controls */}
        {selectedIds.size > 0 && (
          <div className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/40 flex items-center justify-between gap-2 text-xs animate-in fade-in">
            <span className="text-indigo-300 font-medium">
              {selectedIds.size} customer accounts selected
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowBulkAreaModal(true)}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
              >
                Bulk Edit Location
              </button>

              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Bulk Delete</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Customers Table */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 pl-4 w-10">
                  <button onClick={toggleSelectAll} className="text-slate-400 hover:text-white cursor-pointer">
                    {isAllSelected ? <CheckSquare className="w-4 h-4 text-indigo-400" /> : <Square className="w-4 h-4" />}
                  </button>
                </th>
                <th className="py-3">Shop / Business</th>
                <th className="py-3">Contact Person</th>
                <th className="py-3">Phone</th>
                <th className="py-3">Area Cluster</th>
                <th className="py-3">Credit Limit</th>
                <th className="py-3">Outstanding Balance</th>
                <th className="py-3 text-right pr-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No customers found matching the search.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => {
                  const isSelected = selectedIds.has(cust.id);
                  return (
                    <tr
                      key={cust.id}
                      className={`hover:bg-slate-800/30 transition-colors ${isSelected ? 'bg-indigo-950/20' : ''}`}
                    >
                      <td className="py-3 pl-4">
                        <button onClick={() => toggleSelect(cust.id)} className="text-slate-400 hover:text-white cursor-pointer">
                          {isSelected ? <CheckSquare className="w-4 h-4 text-indigo-400" /> : <Square className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="py-3">
                        <div className="font-semibold text-white">{cust.shopName}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">{cust.address}</div>
                      </td>
                      <td className="py-3 text-slate-200 font-medium">{cust.name}</td>
                      <td className="py-3 font-mono text-slate-300">{cust.phone}</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">
                          {cust.area}
                        </span>
                      </td>
                      <td className="py-3 font-mono text-slate-300">
                        {formatCurrency(cust.creditLimit, settings.currencySymbol)}
                      </td>
                      <td className="py-3 font-mono font-semibold">
                        <span className={cust.outstandingBalance > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                          {formatCurrency(cust.outstandingBalance, settings.currencySymbol)}
                        </span>
                      </td>
                      <td className="py-3 text-right pr-4">
                        <button
                          onClick={() => handleOpenEdit(cust)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-indigo-400" />
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

      {/* ADD / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {editingCustomer ? 'Edit Customer Account' : 'Add New Customer'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400">✕</button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Shop / Business Name *</label>
                <input
                  type="text"
                  required
                  value={formShop}
                  onChange={(e) => setFormShop(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Contact Person Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Mobile / WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Area / Market Cluster</label>
                  <input
                    type="text"
                    value={formArea}
                    onChange={(e) => setFormArea(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Physical Delivery Address</label>
                <input
                  type="text"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Credit Limit ({settings.currencySymbol})</label>
                  <input
                    type="number"
                    value={formCreditLimit}
                    onChange={(e) => setFormCreditLimit(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Outstanding Balance ({settings.currencySymbol})</label>
                  <input
                    type="number"
                    value={formBalance}
                    onChange={(e) => setFormBalance(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK EDIT LOCATION MODAL */}
      {showBulkAreaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-5 space-y-4">
            <h3 className="text-sm font-bold text-white">
              Bulk Update Location for {selectedIds.size} Customers
            </h3>
            <div>
              <label className="text-xs text-slate-400 block mb-1">New Market / Area Name</label>
              <input
                type="text"
                placeholder="e.g. Connaught Place"
                value={bulkNewArea}
                onChange={(e) => setBulkNewArea(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowBulkAreaModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkAreaUpdate}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold text-xs"
              >
                Apply to All
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
