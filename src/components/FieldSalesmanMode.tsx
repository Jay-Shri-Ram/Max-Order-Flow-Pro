import React, { useState, useMemo } from 'react';
import { 
  Customer, 
  Product, 
  Category, 
  Order, 
  OrderLineItem, 
  StoreSettings, 
  UserAccount, 
  Language 
} from '../types';
import { translations } from '../utils/i18n';
import { 
  formatCurrency, 
  generateNextOrderId, 
  formatDateDDMMYYYY, 
  buildWhatsAppLink 
} from '../utils/formatters';
import { 
  Smartphone, 
  Search, 
  MapPin, 
  Plus, 
  Minus, 
  ShoppingCart, 
  Check, 
  Send, 
  Clock, 
  AlertCircle, 
  UserPlus, 
  CheckCircle2, 
  ArrowLeft,
  Share2
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface FieldSalesmanModeProps {
  customers: Customer[];
  products: Product[];
  categories: Category[];
  settings: StoreSettings;
  currentUser: UserAccount;
  lang: Language;
  onSaveOrder: (order: Order, updatedProducts: Product[], updatedCustomer?: Customer) => Promise<void>;
  onSaveCustomer: (customer: Customer) => Promise<void>;
  onShowToast: (title: string, message: string, type: 'success' | 'warning' | 'error' | 'info') => void;
}

export const FieldSalesmanMode: React.FC<FieldSalesmanModeProps> = ({
  customers,
  products,
  categories,
  settings,
  currentUser,
  lang,
  onSaveOrder,
  onSaveCustomer,
  onShowToast
}) => {
  const t = translations[lang];

  // Route / Area Filter
  const [selectedArea, setSelectedArea] = useState<string>('ALL');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState<string>('');

  // Product Filter
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [productSearch, setProductSearch] = useState<string>('');

  // Cart: Map of productId -> { quantity, rate, unit }
  const [cartQuantities, setCartQuantities] = useState<{ [productId: string]: number }>({});
  const [showCartDrawer, setShowCartDrawer] = useState<boolean>(false);
  const [salesmanNotes, setSalesmanNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [bookedOrder, setBookedOrder] = useState<Order | null>(null);

  // Quick Add Customer modal
  const [showQuickCust, setShowQuickCust] = useState<boolean>(false);
  const [quickShop, setQuickShop] = useState<string>('');
  const [quickName, setQuickName] = useState<string>('');
  const [quickPhone, setQuickPhone] = useState<string>('');
  const [quickArea, setQuickArea] = useState<string>('');

  // Distinct areas
  const areas = useMemo(() => {
    const set = new Set<string>();
    customers.forEach((c) => {
      if (c.area) set.add(c.area.trim());
    });
    return Array.from(set).sort();
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchArea = selectedArea === 'ALL' || c.area === selectedArea;
      const q = customerSearch.toLowerCase().trim();
      const matchQ =
        !q ||
        c.shopName.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q);
      return matchArea && matchQ;
    });
  }, [customers, selectedArea, customerSearch]);

  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (!p.isActive) return false;
      const matchCat = activeCategory === 'ALL' || p.category === activeCategory;
      const q = productSearch.toLowerCase().trim();
      const matchQ =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [products, activeCategory, productSearch]);

  // Handle Qty Stepper
  const handleUpdateQty = (productId: string, delta: number) => {
    const current = cartQuantities[productId] || 0;
    const next = Math.max(0, current + delta);
    if (next === 0) {
      const copy = { ...cartQuantities };
      delete copy[productId];
      setCartQuantities(copy);
    } else {
      setCartQuantities({ ...cartQuantities, [productId]: next });
    }
  };

  // Convert cart map to OrderLineItems
  const cartItems: OrderLineItem[] = useMemo(() => {
    const items: OrderLineItem[] = [];
    Object.entries(cartQuantities).forEach(([prodId, qty]) => {
      if (qty <= 0) return;
      const prod = products.find((p) => p.id === prodId);
      if (prod) {
        items.push({
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku,
          category: prod.category,
          unit: prod.unit,
          quantity: qty,
          rate: prod.sellingPrice,
          discountPercent: 0,
          total: qty * prod.sellingPrice
        });
      }
    });
    return items;
  }, [cartQuantities, products]);

  const cartTotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.total, 0);
  }, [cartItems]);

  const totalItemsCount = useMemo(() => {
    return Object.values(cartQuantities).reduce((sum, q) => sum + q, 0);
  }, [cartQuantities]);

  // Handle Quick Add Customer
  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickShop || !quickPhone) return;

    const newCust: Customer = {
      id: `cust_${Date.now()}`,
      shopName: quickShop.trim(),
      name: quickName.trim() || quickShop.trim(),
      phone: quickPhone.trim(),
      area: quickArea.trim() || (selectedArea !== 'ALL' ? selectedArea : 'Field Route'),
      address: `Field Route, ${quickArea || 'Market'}`,
      creditLimit: 50000,
      outstandingBalance: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tenantId: settings.storeName
    };

    await onSaveCustomer(newCust);
    setSelectedCustomerId(newCust.id);
    setShowQuickCust(false);
    setQuickShop('');
    setQuickName('');
    setQuickPhone('');
    setQuickArea('');
    onShowToast('Retailer Added', `${newCust.shopName} added to route!`, 'success');
  };

  // Submit Order from Field
  const handleBookFieldOrder = async () => {
    if (!selectedCustomer) {
      onShowToast('Select Retailer', 'Please select a retail shop first.', 'error');
      return;
    }
    if (cartItems.length === 0) {
      onShowToast('Empty Order', 'Please select at least one item.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date();
      const orderId = generateNextOrderId(settings.orderPrefix, settings.orderMiddle, Math.floor(1000 + Math.random() * 9000));
      const taxRate = settings.defaultTaxRate || 18;
      const taxAmount = (cartTotal * taxRate) / 100;
      const grandTotal = cartTotal + taxAmount;

      const newOrder: Order = {
        id: orderId,
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        shopName: selectedCustomer.shopName,
        customerPhone: selectedCustomer.phone,
        customerAddress: selectedCustomer.address,
        area: selectedCustomer.area,
        items: [...cartItems],
        subtotal: cartTotal,
        taxRate,
        taxAmount,
        discount: 0,
        grandTotal,
        status: 'Pending',
        notes: `[FIELD ORDER - Rep: ${currentUser.name}] ${salesmanNotes}`.trim(),
        paymentMode: 'Credit',
        paymentStatus: 'Unpaid',
        createdAt: now.toISOString(),
        displayDate: formatDateDDMMYYYY(now),
        createdBy: `${currentUser.name} (Field Rep)`,
        creatorRole: 'Salesman',
        tenantId: settings.storeName,
        isDeleted: false
      };

      const updatedProducts = products.map((prod) => {
        const item = cartItems.find((i) => i.productId === prod.id);
        if (item) {
          return {
            ...prod,
            stock: Math.max(0, prod.stock - item.quantity),
            updatedAt: now.toISOString()
          };
        }
        return prod;
      });

      const updatedCustomer: Customer = {
        ...selectedCustomer,
        outstandingBalance: selectedCustomer.outstandingBalance + grandTotal,
        updatedAt: now.toISOString()
      };

      await onSaveOrder(newOrder, updatedProducts, updatedCustomer);
      setBookedOrder(newOrder);
      setShowCartDrawer(false);

      try {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });
      } catch (e) {}

      onShowToast('Field Order Booked!', `Order ${newOrder.id} logged successfully!`, 'success');
      setCartQuantities({});
      setSalesmanNotes('');
    } catch (err: any) {
      onShowToast('Booking Failed', err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300 pb-24 max-w-4xl mx-auto">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-950 border border-emerald-500/30 p-4 rounded-2xl backdrop-blur-md flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Smartphone className="w-4 h-4" />
            </span>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Field Salesman Order Booking App
            </h1>
          </div>
          <p className="text-xs text-emerald-300/80 mt-0.5">
            Logged in as: <span className="font-semibold text-white">{currentUser.name}</span> | Touch-optimized for market rounds
          </p>
        </div>

        <button
          onClick={() => setShowQuickCust(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-colors cursor-pointer"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>New Retailer</span>
        </button>
      </div>

      {/* STEP 1: Select Retailer on Route */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-md space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span>Select Route & Visiting Shop:</span>
          </span>
          {selectedCustomer && (
            <span className="text-[11px] text-emerald-400 font-medium">
              ✓ {selectedCustomer.shopName} Active
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          {/* Area Filter */}
          <div className="sm:col-span-4">
            <select
              value={selectedArea}
              onChange={(e) => {
                setSelectedArea(e.target.value);
                setSelectedCustomerId('');
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-medium"
            >
              <option value="ALL">All Market Routes ({areas.length})</option>
              {areas.map((a) => (
                <option key={a} value={a}>
                  📍 {a}
                </option>
              ))}
            </select>
          </div>

          {/* Customer Dropdown */}
          <div className="sm:col-span-8">
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
            >
              <option value="">-- Choose Retail Shop to Book For --</option>
              {filteredCustomers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.shopName} ({c.name}) - Bal: {formatCurrency(c.outstandingBalance, settings.currencySymbol)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedCustomer && (
          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-slate-400">Owner:</span> <span className="text-white font-medium">{selectedCustomer.name}</span>
              <span className="mx-2 text-slate-600">|</span>
              <span className="text-slate-400">Phone:</span> <span className="font-mono text-slate-200">{selectedCustomer.phone}</span>
            </div>
            <div className="flex items-center gap-3">
              <div>
                <span className="text-slate-400">Credit Bal:</span>{' '}
                <span className="font-mono text-amber-400 font-semibold">
                  {formatCurrency(selectedCustomer.outstandingBalance, settings.currencySymbol)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* STEP 2: Fast Product Catalog */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-md space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Wholesale Catalog & Quick Steppers
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search items or SKU..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 w-full sm:w-64 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => setActiveCategory('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
              activeCategory === 'ALL'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All Items
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.name)}
              className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                activeCategory === c.name
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Products Grid with Stepper Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {filteredProducts.map((p) => {
            const qty = cartQuantities[p.id] || 0;
            return (
              <div
                key={p.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  qty > 0
                    ? 'bg-emerald-950/20 border-emerald-500/40 shadow-sm'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white truncate">{p.name}</div>
                    <div className="text-[11px] text-slate-400">
                      SKU: <span className="font-mono text-slate-300">{p.sku}</span> | {p.category}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-mono font-bold text-white">
                      {formatCurrency(p.sellingPrice, settings.currencySymbol)}
                    </div>
                    <div className="text-[10px] text-slate-400">per {p.unit}</div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <span>Stock:</span>
                    <span className={`font-mono font-medium ${p.stock <= p.reorderLevel ? 'text-rose-400' : 'text-slate-200'}`}>
                      {p.stock} {p.unit}
                    </span>
                  </div>

                  {/* Stepper Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateQty(p.id, -1)}
                      disabled={qty === 0}
                      className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center font-mono font-bold text-xs text-white">
                      {qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateQty(p.id, 1)}
                      className="w-7 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Bottom Cart Bar */}
      {totalItemsCount > 0 && (
        <div className="fixed bottom-18 md:bottom-6 left-3 right-3 max-w-4xl mx-auto z-40 bg-slate-900/95 border border-emerald-500/40 rounded-2xl shadow-2xl p-3.5 backdrop-blur-xl flex items-center justify-between gap-3 animate-in slide-in-from-bottom-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 relative">
              <ShoppingCart className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-slate-950">
                {cartItems.length}
              </span>
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">
                {totalItemsCount} units selected
              </div>
              <div className="text-sm font-bold font-mono text-emerald-400">
                {formatCurrency(cartTotal, settings.currencySymbol)}
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowCartDrawer(true)}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>Review & Book</span>
            <span>→</span>
          </button>
        </div>
      )}

      {/* Cart Drawer Modal */}
      {showCartDrawer && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-emerald-400" />
                  <span>Review Field Order</span>
                </h3>
                <div className="text-xs text-slate-400 mt-0.5">
                  Retailer: <span className="text-white font-medium">{selectedCustomer?.shopName}</span>
                </div>
              </div>
              <button
                onClick={() => setShowCartDrawer(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {cartItems.map((item) => (
                <div
                  key={item.productId}
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-semibold text-white">{item.productName}</div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {item.quantity} {item.unit} × {formatCurrency(item.rate, settings.currencySymbol)}
                    </div>
                  </div>
                  <div className="text-right font-mono font-bold text-emerald-400">
                    {formatCurrency(item.total, settings.currencySymbol)}
                  </div>
                </div>
              ))}
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Order Notes / Special Requests
              </label>
              <textarea
                rows={2}
                value={salesmanNotes}
                onChange={(e) => setSalesmanNotes(e.target.value)}
                placeholder="e.g. deliver by Friday morning, pack tightly"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
              />
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-[11px] text-slate-400">Subtotal Estimated</div>
                <div className="text-lg font-bold font-mono text-emerald-400">
                  {formatCurrency(cartTotal, settings.currencySymbol)}
                </div>
              </div>
              <button
                disabled={isSubmitting}
                onClick={handleBookFieldOrder}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg transition-all cursor-pointer flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Confirm & Log Order</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Confirmation Card */}
      {bookedOrder && (
        <div className="bg-emerald-950/30 border border-emerald-500/40 p-4 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span className="text-sm font-bold text-white">Order {bookedOrder.id} Booked!</span>
            </div>
            <button
              onClick={() => setBookedOrder(null)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Dismiss
            </button>
          </div>

          <p className="text-xs text-slate-300">
            Order for <span className="font-semibold text-white">{bookedOrder.shopName}</span> has been synced locally and queued for cloud dispatch.
          </p>

          <div className="flex items-center gap-2 pt-1">
            <a
              href={buildWhatsAppLink(bookedOrder, settings)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Send WhatsApp Confirmation to Retailer</span>
            </a>
          </div>
        </div>
      )}

      {/* Quick Add Retailer Modal */}
      {showQuickCust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-5 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-white">Add New Retailer on Route</h3>
              <button onClick={() => setShowQuickCust(false)} className="text-slate-400">✕</button>
            </div>

            <form onSubmit={handleQuickAdd} className="space-y-2.5 text-xs">
              <div>
                <label className="text-slate-400">Shop / Store Name *</label>
                <input
                  type="text"
                  required
                  value={quickShop}
                  onChange={(e) => setQuickShop(e.target.value)}
                  placeholder="e.g. Gupta General Store"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400">Owner Name</label>
                <input
                  type="text"
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  placeholder="e.g. Ramesh Gupta"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400">Mobile / WhatsApp *</label>
                <input
                  type="tel"
                  required
                  value={quickPhone}
                  onChange={(e) => setQuickPhone(e.target.value)}
                  placeholder="98XXXXXXXX"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-white"
                />
              </div>

              <div>
                <label className="text-slate-400">Area / Market Cluster</label>
                <input
                  type="text"
                  value={quickArea}
                  onChange={(e) => setQuickArea(e.target.value)}
                  placeholder={selectedArea !== 'ALL' ? selectedArea : 'e.g. Main Chowk'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowQuickCust(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold"
                >
                  Add Retailer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
