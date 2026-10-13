import React, { useState, useMemo } from 'react';
import { Product, Category, Unit, StoreSettings, Language } from '../types';
import { translations } from '../utils/i18n';
import { formatCurrency, formatDateDDMMYYYY } from '../utils/formatters';
import { exportDataToExcel } from '../services/exportService';
import * as XLSX from 'xlsx';
import { 
  PackageCheck, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  AlertTriangle, 
  SlidersHorizontal, 
  Layers, 
  Scale, 
  FileSpreadsheet, 
  Barcode, 
  ArrowUpRight, 
  ArrowDownRight, 
  RefreshCw,
  Upload,
  FileDown
} from 'lucide-react';

interface ProductMasterProps {
  products: Product[];
  categories: Category[];
  units: Unit[];
  settings: StoreSettings;
  lang: Language;
  onSaveProduct: (product: Product) => Promise<void>;
  onDeleteProduct: (productId: string) => Promise<void>;
  onSaveCategory: (category: Category) => Promise<void>;
  onDeleteCategory: (categoryId: string) => Promise<void>;
  onSaveUnit: (unit: Unit) => Promise<void>;
  onDeleteUnit: (unitId: string) => Promise<void>;
  onAdjustStock: (productId: string, adjustmentQty: number, reason: string) => Promise<void>;
  onImportProducts?: (products: Product[]) => Promise<void>;
  onShowToast: (title: string, message: string, type: 'success' | 'warning' | 'error' | 'info') => void;
}

export const ProductMaster: React.FC<ProductMasterProps> = ({
  products,
  categories,
  units,
  settings,
  lang,
  onSaveProduct,
  onDeleteProduct,
  onSaveCategory,
  onDeleteCategory,
  onSaveUnit,
  onDeleteUnit,
  onAdjustStock,
  onImportProducts,
  onShowToast
}) => {
  const t = translations[lang];

  const [activeTab, setActiveTab] = useState<'catalog' | 'categories' | 'units'>('catalog');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Product Add / Edit Modal
  const [showProductModal, setShowProductModal] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [pName, setPName] = useState<string>('');
  const [pSku, setPSku] = useState<string>('');
  const [pCat, setPCat] = useState<string>('');
  const [pUnit, setPUnit] = useState<string>('');
  const [pCost, setPCost] = useState<number>(0);
  const [pPrice, setPPrice] = useState<number>(0);
  const [pStock, setPStock] = useState<number>(0);
  const [pReorder, setPReorder] = useState<number>(10);
  const [pBarcode, setPBarcode] = useState<string>('');

  // Stock Adjustment Modal
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [adjustQty, setAdjustQty] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('Shipment Received');

  // Quick Category / Unit Add State
  const [newCatName, setNewCatName] = useState<string>('');
  const [newCatDesc, setNewCatDesc] = useState<string>('');
  const [newUnitName, setNewUnitName] = useState<string>('');
  const [newUnitCode, setNewUnitCode] = useState<string>('');

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = categoryFilter === 'ALL' || p.category === categoryFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchQ =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.includes(q));
      return matchCat && matchQ;
    });
  }, [products, categoryFilter, searchQuery]);

  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setPName('');
    setPSku(`SKU-${Math.floor(1000 + Math.random() * 9000)}`);
    setPCat(categories[0]?.name || 'General');
    setPUnit(units[0]?.shortCode || 'Pcs');
    setPCost(0);
    setPPrice(0);
    setPStock(50);
    setPReorder(10);
    setPBarcode('');
    setShowProductModal(true);
  };

  const handleOpenEditProduct = (p: Product) => {
    setEditingProduct(p);
    setPName(p.name);
    setPSku(p.sku);
    setPCat(p.category);
    setPUnit(p.unit);
    setPCost(p.costPrice);
    setPPrice(p.sellingPrice);
    setPStock(p.stock);
    setPReorder(p.reorderLevel);
    setPBarcode(p.barcode || '');
    setShowProductModal(true);
  };

  const handleSaveProductForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName.trim()) {
      onShowToast('Validation', 'Product name is required.', 'error');
      return;
    }

    const now = new Date().toISOString();
    const prod: Product = {
      id: editingProduct ? editingProduct.id : `p_${Date.now()}`,
      name: pName.trim(),
      sku: pSku.trim(),
      category: pCat || 'General',
      unit: pUnit || 'Pcs',
      costPrice: Number(pCost) || 0,
      sellingPrice: Number(pPrice) || 0,
      stock: Number(pStock) || 0,
      reorderLevel: Number(pReorder) || 10,
      barcode: pBarcode.trim(),
      isActive: true,
      tenantId: settings.storeName,
      updatedAt: now
    };

    await onSaveProduct(prod);
    setShowProductModal(false);
    onShowToast('Product Saved', `${prod.name} inventory master updated!`, 'success');
  };

  const handlePerformStockAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct || adjustQty === 0) return;

    await onAdjustStock(adjustingProduct.id, adjustQty, adjustReason);
    onShowToast(
      'Stock Adjusted',
      `${adjustingProduct.name} stock adjusted by ${adjustQty > 0 ? '+' : ''}${adjustQty} ${adjustingProduct.unit}`,
      'success'
    );
    setAdjustingProduct(null);
    setAdjustQty(0);
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const cat: Category = {
      id: `c_${Date.now()}`,
      name: newCatName.trim(),
      description: newCatDesc.trim(),
      tenantId: settings.storeName
    };
    await onSaveCategory(cat);
    setNewCatName('');
    setNewCatDesc('');
    onShowToast('Category Added', `Category ${cat.name} added!`, 'success');
  };

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnitName.trim() || !newUnitCode.trim()) return;

    const unit: Unit = {
      id: `u_${Date.now()}`,
      name: newUnitName.trim(),
      shortCode: newUnitCode.trim(),
      tenantId: settings.storeName
    };
    await onSaveUnit(unit);
    setNewUnitName('');
    setNewUnitCode('');
    onShowToast('Unit Added', `Unit ${unit.shortCode} added!`, 'success');
  };

  const handleExportCatalog = () => {
    const rows = products.map((p) => ({
      'SKU': p.sku,
      'Product Name': p.name,
      'Category': p.category,
      'Unit': p.unit,
      'Selling Price': p.sellingPrice,
      'Cost Price': p.costPrice,
      'Current Stock': p.stock,
      'Reorder Level': p.reorderLevel,
      'Barcode': p.barcode || '',
      'Status': p.stock <= p.reorderLevel ? 'LOW STOCK' : 'IN STOCK'
    }));
    exportDataToExcel(rows, 'Inventory Catalog', 'OrderFlow_Product_Inventory');
    onShowToast('Catalog Exported', 'Full inventory sheet exported to Excel.', 'success');
  };

  const handleDownloadTemplate = () => {
    const templateRows = [
      {
        'Product Name': 'Fortune Sunlite Refined Oil (15L Tin)',
        'SKU': 'FORT-OIL-15L',
        'Category': 'Grains & Staples',
        'Unit': 'Box',
        'Cost Price': 1650,
        'Selling Price': 1820,
        'Opening Stock': 28,
        'Reorder Level': 10,
        'Barcode': '890600728101'
      },
      {
        'Product Name': 'Tata Tea Gold Leaf 1kg Pack',
        'SKU': 'TATA-GOLD-1K',
        'Category': 'Beverages & Syrups',
        'Unit': 'Pcs',
        'Cost Price': 460,
        'Selling Price': 530,
        'Opening Stock': 80,
        'Reorder Level': 25,
        'Barcode': '890105200115'
      }
    ];
    exportDataToExcel(templateRows, 'Product Template', 'Products_Import_Template');
    onShowToast('Template Downloaded', 'Use this Excel format for batch item imports.', 'info');
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
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
          onShowToast('Empty Sheet', 'No rows found in uploaded file.', 'warning');
          return;
        }

        const now = new Date().toISOString();
        const importedProducts: Product[] = data.map((row, idx) => ({
          id: `p_imp_${Date.now()}_${idx}`,
          name: String(row['Product Name'] || row['Name'] || row['Item Name'] || `Item ${idx + 1}`).trim(),
          sku: String(row['SKU'] || row['Item Code'] || `SKU-${Date.now().toString().slice(-4)}-${idx + 1}`).trim(),
          category: String(row['Category'] || 'General').trim(),
          unit: String(row['Unit'] || 'Pcs').trim(),
          costPrice: Number(row['Cost Price'] || row['Cost']) || 0,
          sellingPrice: Number(row['Selling Price'] || row['Price'] || row['Rate']) || 0,
          stock: Number(row['Opening Stock'] || row['Stock'] || row['Qty']) || 0,
          reorderLevel: Number(row['Reorder Level'] || row['Reorder']) || 10,
          barcode: String(row['Barcode'] || '').trim(),
          isActive: true,
          tenantId: settings.storeName,
          updatedAt: now
        }));

        if (onImportProducts) {
          await onImportProducts(importedProducts);
        } else {
          for (const p of importedProducts) {
            await onSaveProduct(p);
          }
        }

        onShowToast('Import Success', `${importedProducts.length} items successfully imported into inventory!`, 'success');
      } catch (err: any) {
        onShowToast('Import Failed', err.message || 'Error processing Excel file', 'error');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300 pb-16 md:pb-6">
      
      {/* Top Banner */}
      <div className="bg-slate-900/60 border border-slate-800/80 p-4.5 rounded-2xl backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-indigo-400" />
            <span>Product Master & Real-Time Inventory Control</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time multi-tenant stock ledger, custom wholesale units (Box, CTN, Meter, Bundle), and category hierarchies.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleOpenAddProduct}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Product</span>
          </button>

          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-sky-400" />
            <span>Import Excel</span>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImportExcel} className="hidden" />
          </label>

          <button
            onClick={handleExportCatalog}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export Catalog</span>
          </button>

          <button
            onClick={handleDownloadTemplate}
            className="text-xs text-slate-400 hover:text-indigo-300 underline font-medium ml-1 cursor-pointer flex items-center gap-1"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Download Template</span>
          </button>
        </div>
      </div>

      {/* Sub-tabs (Catalog vs Category vs Custom Units) */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'catalog'
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <PackageCheck className="w-3.5 h-3.5" />
          <span>Products & Stock ({products.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'categories'
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Categories ({categories.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('units')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'units'
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>Custom Units ({units.length})</span>
        </button>
      </div>

      {/* TAB 1: PRODUCT CATALOG & STOCK */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-slate-900/60 border border-slate-800/80 p-3.5 rounded-2xl backdrop-blur-md grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-8 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search products by SKU, name, or barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="sm:col-span-4">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Categories ({categories.length})</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 pl-4">Product Name & SKU</th>
                    <th className="py-3">Category</th>
                    <th className="py-3">Unit</th>
                    <th className="py-3 font-mono">Cost Price</th>
                    <th className="py-3 font-mono">Selling Price</th>
                    <th className="py-3 font-mono">Real-time Stock</th>
                    <th className="py-3">Stock Status</th>
                    <th className="py-3 text-right pr-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredProducts.map((p) => {
                    const isLow = p.stock <= p.reorderLevel;
                    return (
                      <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 pl-4">
                          <div className="font-semibold text-white">{p.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            SKU: {p.sku} {p.barcode && `| Barcode: ${p.barcode}`}
                          </div>
                        </td>
                        <td className="py-3 text-slate-300">{p.category}</td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">
                            {p.unit}
                          </span>
                        </td>
                        <td className="py-3 font-mono text-slate-400">
                          {formatCurrency(p.costPrice, settings.currencySymbol)}
                        </td>
                        <td className="py-3 font-mono font-semibold text-white">
                          {formatCurrency(p.sellingPrice, settings.currencySymbol)}
                        </td>
                        <td className="py-3 font-mono font-bold text-sm text-slate-100">
                          {p.stock} <span className="text-xs font-normal text-slate-400">{p.unit}</span>
                        </td>
                        <td className="py-3">
                          {isLow ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30 animate-pulse">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Low Stock (Reorder ≤ {p.reorderLevel})</span>
                            </span>
                          ) : (
                            <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                              Optimal Stock
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-right pr-4 whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                setAdjustingProduct(p);
                                setAdjustQty(0);
                              }}
                              title="Adjust Inventory Stock (+ / -)"
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
                            >
                              <SlidersHorizontal className="w-3 h-3 inline mr-1 text-amber-400" />
                              <span>Adjust</span>
                            </button>

                            <button
                              onClick={() => handleOpenEditProduct(p)}
                              title="Edit Product"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-indigo-400" />
                            </button>

                            <button
                              onClick={() => {
                                if (window.confirm(`Delete ${p.name}?`)) onDeleteProduct(p.id);
                              }}
                              title="Delete Product"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-700 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CATEGORIES MANAGEMENT */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          <div className="md:col-span-5 bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl backdrop-blur-md space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Add New Category</span>
            </h3>

            <form onSubmit={handleCreateCategory} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Frozen Foods & Ice Creams"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Description of goods in this category..."
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
              >
                Create Category
              </button>
            </form>
          </div>

          <div className="md:col-span-7 bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl backdrop-blur-md space-y-3">
            <h3 className="text-sm font-bold text-white">Current Categories ({categories.length})</h3>
            <div className="divide-y divide-slate-800/60 text-xs">
              {categories.map((c) => (
                <div key={c.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-white">{c.name}</div>
                    <div className="text-[11px] text-slate-400">{c.description || 'No description'}</div>
                  </div>
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete category ${c.name}?`)) onDeleteCategory(c.id);
                    }}
                    className="p-1 rounded text-slate-400 hover:text-rose-400 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CUSTOM UNITS MANAGEMENT */}
      {activeTab === 'units' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          <div className="md:col-span-5 bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl backdrop-blur-md space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Scale className="w-4 h-4 text-emerald-400" />
              <span>Add Custom Unit</span>
            </h3>

            <form onSubmit={handleCreateUnit} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Unit Display Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master Carton, Wooden Crate, Meter"
                  value={newUnitName}
                  onChange={(e) => setNewUnitName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Short Code / Symbol *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CTN, Box, Mtr, Bndl"
                  value={newUnitCode}
                  onChange={(e) => setNewUnitCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
              >
                Create Custom Unit
              </button>
            </form>
          </div>

          <div className="md:col-span-7 bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl backdrop-blur-md space-y-3">
            <h3 className="text-sm font-bold text-white">Active Measurement Units ({units.length})</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {units.map((u) => (
                <div key={u.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-white font-mono">{u.shortCode}</div>
                    <div className="text-[11px] text-slate-400">{u.name}</div>
                  </div>
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete unit ${u.shortCode}?`)) onDeleteUnit(u.id);
                    }}
                    className="p-1 rounded text-slate-500 hover:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STOCK ADJUSTMENT MODAL */}
      {adjustingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                <span>Adjust Stock Quantity</span>
              </h3>
              <button onClick={() => setAdjustingProduct(null)} className="text-slate-400">✕</button>
            </div>

            <div className="text-xs bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <div className="font-semibold text-white">{adjustingProduct.name}</div>
              <div className="text-slate-400 mt-0.5">
                Current Stock: <span className="font-mono text-emerald-400 font-bold">{adjustingProduct.stock} {adjustingProduct.unit}</span>
              </div>
            </div>

            <form onSubmit={handlePerformStockAdjust} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Adjustment Delta (+ to add, - to deduct)</label>
                <input
                  type="number"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(Number(e.target.value))}
                  placeholder="e.g. +20 or -5"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-white text-base font-bold"
                />
                <div className="text-[11px] text-slate-400 mt-1">
                  New Stock will be:{' '}
                  <span className="font-mono text-white font-semibold">
                    {Math.max(0, adjustingProduct.stock + adjustQty)} {adjustingProduct.unit}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Reason for Audit Adjustment</label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  <option value="New Shipment Received">New Shipment Received</option>
                  <option value="Physical Audit Recount">Physical Audit Recount</option>
                  <option value="Damaged / Expired Goods">Damaged / Expired Goods</option>
                  <option value="Customer Return Restocked">Customer Return Restocked</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustingProduct(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold"
                >
                  Apply Stock Change
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRODUCT ADD / EDIT MODAL */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {editingProduct ? 'Edit Catalog Product' : 'Add New Product to Catalog'}
              </h3>
              <button onClick={() => setShowProductModal(false)} className="text-slate-400">✕</button>
            </div>

            <form onSubmit={handleSaveProductForm} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Product Description / Name *</label>
                <input
                  type="text"
                  required
                  value={pName}
                  onChange={(e) => setPName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">SKU Code</label>
                  <input
                    type="text"
                    value={pSku}
                    onChange={(e) => setPSku(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Barcode (EAN/UPC)</label>
                  <input
                    type="text"
                    value={pBarcode}
                    onChange={(e) => setPBarcode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Category</label>
                  <select
                    value={pCat}
                    onChange={(e) => setPCat(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Primary Unit</label>
                  <select
                    value={pUnit}
                    onChange={(e) => setPUnit(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  >
                    {units.map((u) => (
                      <option key={u.id} value={u.shortCode}>{u.name} ({u.shortCode})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Cost Price</label>
                  <input
                    type="number"
                    value={pCost}
                    onChange={(e) => setPCost(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 font-mono text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Selling Price *</label>
                  <input
                    type="number"
                    required
                    value={pPrice}
                    onChange={(e) => setPPrice(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 font-mono text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Opening Stock</label>
                  <input
                    type="number"
                    value={pStock}
                    onChange={(e) => setPStock(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 font-mono text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Reorder Alert</label>
                  <input
                    type="number"
                    value={pReorder}
                    onChange={(e) => setPReorder(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 font-mono text-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
