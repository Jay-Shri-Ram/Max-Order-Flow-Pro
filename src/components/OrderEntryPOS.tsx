import React, { useState, useMemo, useEffect } from 'react';
import { 
  Customer, 
  Product, 
  Category, 
  Unit, 
  Order, 
  OrderLineItem, 
  StoreSettings, 
  Language, 
  PaymentMode, 
  PaymentStatus, 
  UserAccount 
} from '../types';
import { translations } from '../utils/i18n';
import { 
  formatCurrency, 
  generateNextOrderId, 
  formatDateDDMMYYYY 
} from '../utils/formatters';
import { 
  Plus, 
  Trash2, 
  Search, 
  Barcode, 
  UserPlus, 
  CheckCircle, 
  AlertTriangle, 
  Printer, 
  Share2, 
  RotateCcw, 
  ShoppingBag, 
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface OrderEntryPOSProps {
  customers: Customer[];
  products: Product[];
  categories: Category[];
  units: Unit[];
  settings: StoreSettings;
  currentUser: UserAccount;
  lang: Language;
  onSaveOrder: (order: Order, updatedProducts: Product[], updatedCustomer?: Customer) => Promise<void>;
  onSaveCustomer: (customer: Customer) => Promise<void>;
  onPrintInvoice: (order: Order) => void;
  onShowToast: (title: string, message: string, type: 'success' | 'warning' | 'error' | 'info') => void;
}

export const OrderEntryPOS: React.FC<OrderEntryPOSProps> = ({
  customers,
  products,
  categories,
  units,
  settings,
  currentUser,
  lang,
  onSaveOrder,
  onSaveCustomer,
  onPrintInvoice,
  onShowToast
}) => {
  const t = translations[lang];

  // Configured Order ID
  const [orderCounter, setOrderCounter] = useState<number>(settings.orderCounter || 1012);
  const currentOrderId = useMemo(() => {
    return generateNextOrderId(settings.orderPrefix, settings.orderMiddle, orderCounter);
  }, [settings.orderPrefix, settings.orderMiddle, orderCounter]);

  // Selected Customer & Filter
  const [customerAreaFilter, setCustomerAreaFilter] = useState<string>('ALL');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>('');

  // Rapid Line Item Entry Bar
  const [lockedCategory, setLockedCategory] = useState<string>('ALL');
  const [productSearch, setProductSearch] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [tempQty, setTempQty] = useState<number>(1);
  const [tempUnit, setTempUnit] = useState<string>('');
  const [tempRate, setTempRate] = useState<number>(0);
  const [tempDisc, setTempDisc] = useState<number>(0);

  // Cart Items
  const [cartItems, setCartItems] = useState<OrderLineItem[]>([]);

  // Additional Meta
  const [taxRate, setTaxRate] = useState<number>(settings.defaultTaxRate || 18);
  const [overallDiscount, setOverallDiscount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Credit');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('Unpaid');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Quick Customer Modal
  const [showAddCustomerModal, setShowAddCustomerModal] = useState<boolean>(false);
  const [newCustName, setNewCustName] = useState<string>('');
  const [newCustShop, setNewCustShop] = useState<string>('');
  const [newCustPhone, setNewCustPhone] = useState<string>('');
  const [newCustAddress, setNewCustAddress] = useState<string>('');
  const [newCustArea, setNewCustArea] = useState<string>('');
  const [newCustCreditLimit, setNewCustCreditLimit] = useState<number>(100000);

  // Unique areas from customer list
  const distinctAreas = useMemo(() => {
    const set = new Set<string>();
    customers.forEach((c) => {
      if (c.area) set.add(c.area.trim());
    });
    return Array.from(set).sort();
  }, [customers]);

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchArea = customerAreaFilter === 'ALL' || c.area === customerAreaFilter;
      const q = customerSearchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.shopName.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.area.toLowerCase().includes(q);
      return matchArea && matchQuery;
    });
  }, [customers, customerAreaFilter, customerSearchQuery]);

  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  // Filtered products for rapid picker
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (!p.isActive) return false;
      const matchCat = lockedCategory === 'ALL' || p.category === lockedCategory;
      const q = productSearch.toLowerCase().trim();
      const matchQ =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.includes(q));
      return matchCat && matchQ;
    });
  }, [products, lockedCategory, productSearch]);

  // Sync temp product inputs when product selected
  const handleSelectProduct = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = products.find((p) => p.id === prodId);
    if (prod) {
      setTempUnit(prod.unit);
      setTempRate(prod.sellingPrice);
      setTempQty(1);
      setTempDisc(0);
    }
  };

  // Add line item to cart
  const handleAddLineItem = () => {
    if (!selectedProductId) {
      onShowToast('Product Missing', 'Please select a product from the list.', 'warning');
      return;
    }
    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;

    if (tempQty <= 0) {
      onShowToast('Invalid Quantity', 'Quantity must be at least 1.', 'warning');
      return;
    }

    // Check stock warning
    if (tempQty > prod.stock) {
      onShowToast(
        'Stock Alert',
        `Entered qty (${tempQty} ${tempUnit}) exceeds available warehouse stock (${prod.stock} ${prod.unit}).`,
        'warning'
      );
    }

    const lineTotal = tempQty * tempRate * (1 - tempDisc / 100);

    // If item already in cart, update it or append
    const existingIndex = cartItems.findIndex((i) => i.productId === prod.id && i.unit === tempUnit);
    if (existingIndex >= 0) {
      const updated = [...cartItems];
      const ex = updated[existingIndex];
      const newQty = ex.quantity + tempQty;
      ex.quantity = newQty;
      ex.rate = tempRate;
      ex.discountPercent = tempDisc;
      ex.total = newQty * tempRate * (1 - tempDisc / 100);
      setCartItems(updated);
    } else {
      const newItem: OrderLineItem = {
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku,
        category: prod.category,
        unit: tempUnit || prod.unit,
        quantity: tempQty,
        rate: tempRate,
        discountPercent: tempDisc,
        total: lineTotal
      };
      setCartItems([...cartItems, newItem]);
    }

    // Reset rapid product selection but KEEP lockedCategory locked!
    setSelectedProductId('');
    setProductSearch('');
    setTempQty(1);
    setTempRate(0);
    setTempDisc(0);
  };

  // Remove line item
  const handleRemoveLineItem = (index: number) => {
    setCartItems(cartItems.filter((_, idx) => idx !== index));
  };

  // Inline update item quantity
  const handleUpdateItemQty = (index: number, newQty: number) => {
    if (newQty <= 0) return;
    const updated = [...cartItems];
    const item = updated[index];
    item.quantity = newQty;
    item.total = newQty * item.rate * (1 - item.discountPercent / 100);
    setCartItems(updated);
  };

  // Inline update item rate
  const handleUpdateItemRate = (index: number, newRate: number) => {
    const updated = [...cartItems];
    const item = updated[index];
    item.rate = newRate;
    item.total = item.quantity * newRate * (1 - item.discountPercent / 100);
    setCartItems(updated);
  };

  // Inline update item unit
  const handleUpdateItemUnit = (index: number, newUnit: string) => {
    const updated = [...cartItems];
    updated[index].unit = newUnit;
    setCartItems(updated);
  };

  // Calculation of Totals
  const subtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.total, 0);
  }, [cartItems]);

  const taxAmount = useMemo(() => {
    if (taxRate <= 0) return 0;
    return (subtotal * taxRate) / 100;
  }, [subtotal, taxRate]);

  const grandTotal = useMemo(() => {
    const gt = subtotal + taxAmount - overallDiscount;
    return Math.max(0, gt);
  }, [subtotal, taxAmount, overallDiscount]);

  // Quick Add Customer Handler
  const handleCreateNewCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustShop.trim() || !newCustPhone.trim()) {
      onShowToast('Required Fields', 'Please fill name, shop name, and phone number.', 'error');
      return;
    }

    const newCust: Customer = {
      id: `cust_${Date.now()}`,
      name: newCustName.trim(),
      shopName: newCustShop.trim(),
      phone: newCustPhone.trim(),
      address: newCustAddress.trim(),
      area: newCustArea.trim() || 'General',
      creditLimit: Number(newCustCreditLimit) || 100000,
      outstandingBalance: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tenantId: settings.storeName
    };

    await onSaveCustomer(newCust);
    setSelectedCustomerId(newCust.id);
    setShowAddCustomerModal(false);
    // Reset modal form
    setNewCustName('');
    setNewCustShop('');
    setNewCustPhone('');
    setNewCustAddress('');
    setNewCustArea('');
    onShowToast('Customer Added', `${newCust.shopName} added and selected!`, 'success');
  };

  // Submit and Create Order
  const handleGenerateOrder = async () => {
    if (!selectedCustomer) {
      onShowToast('Select Customer', 'Please select a customer or retail shop for this order.', 'error');
      return;
    }
    if (cartItems.length === 0) {
      onShowToast('Empty Cart', 'Please add at least one line item to the order.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date();
      const newOrder: Order = {
        id: currentOrderId,
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        shopName: selectedCustomer.shopName,
        customerPhone: selectedCustomer.phone,
        customerAddress: selectedCustomer.address,
        area: selectedCustomer.area,
        items: [...cartItems],
        subtotal,
        taxRate,
        taxAmount,
        discount: overallDiscount,
        grandTotal,
        status: 'Pending',
        notes: notes.trim(),
        paymentMode,
        paymentStatus,
        createdAt: now.toISOString(),
        displayDate: formatDateDDMMYYYY(now),
        createdBy: currentUser.name,
        creatorRole: currentUser.role,
        tenantId: settings.storeName,
        isDeleted: false
      };

      // Calculate updated stock for products
      const updatedProducts = products.map((prod) => {
        const ordered = cartItems.find((i) => i.productId === prod.id);
        if (ordered) {
          return {
            ...prod,
            stock: Math.max(0, prod.stock - ordered.quantity),
            updatedAt: now.toISOString()
          };
        }
        return prod;
      });

      // Update customer outstanding if payment is Credit/Unpaid
      let updatedCustomer = { ...selectedCustomer };
      if (paymentMode === 'Credit' || paymentStatus === 'Unpaid') {
        updatedCustomer.outstandingBalance += grandTotal;
        updatedCustomer.updatedAt = now.toISOString();
      }

      await onSaveOrder(newOrder, updatedProducts, updatedCustomer);

      // Trigger Celebration Confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (err) {
        // Safe fallback
      }

      onShowToast('Order Generated!', `Order ${newOrder.id} successfully recorded!`, 'success');

      // Prompt to print or view invoice directly
      onPrintInvoice(newOrder);

      // Increment Order Counter for next order
      setOrderCounter((prev) => prev + 1);

      // Reset form
      setCartItems([]);
      setSelectedCustomerId('');
      setNotes('');
      setOverallDiscount(0);
    } catch (err: any) {
      console.error(err);
      onShowToast('Order Error', err.message || 'Failed to generate order.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-16 md:pb-6">
      
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/80 p-4.5 rounded-2xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-indigo-400" />
              <span>{t.newOrder}</span>
            </h1>
            <span className="font-mono text-xs px-2.5 py-0.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-semibold tracking-wide">
              {currentOrderId}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Ultra-fast multi-item POS entry with locked categories, dynamic units, and live inventory verification.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setCartItems([]);
              setSelectedCustomerId('');
              setNotes('');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>{t.clearForm}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* LEFT COLUMN: Customer Selection & Line Items Entry (8 Cols) */}
        <div className="lg:col-span-8 space-y-5">
          
          {/* Section 1: Customer Picker with Area Filtering */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4.5 backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <span>1. Customer & Retailer Information</span>
              </div>
              <button
                onClick={() => setShowAddCustomerModal(true)}
                className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ {t.addNewCustomer}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              
              {/* Area Filter */}
              <div className="sm:col-span-4">
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Filter by Area:
                </label>
                <select
                  value={customerAreaFilter}
                  onChange={(e) => setCustomerAreaFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">All Areas ({distinctAreas.length})</option>
                  {distinctAreas.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
              </div>

              {/* Customer Dropdown */}
              <div className="sm:col-span-8">
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  {t.selectCustomer}
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
                >
                  <option value="">-- Choose Wholesale / Retail Customer --</option>
                  {filteredCustomers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.shopName} - {c.name} ({c.area}) - Ph: {c.phone}
                    </option>
                  ))}
                </select>
              </div>

            </div>

            {/* Auto-populated Customer Details Pill Box */}
            {selectedCustomer && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs">
                <div>
                  <div className="text-[10px] text-slate-400">Shop / Trader:</div>
                  <div className="font-semibold text-white truncate">{selectedCustomer.shopName}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Contact Phone:</div>
                  <div className="font-mono text-slate-200">{selectedCustomer.phone}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">{t.outstandingBal}:</div>
                  <div className={`font-mono font-semibold ${selectedCustomer.outstandingBalance > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {formatCurrency(selectedCustomer.outstandingBalance, settings.currencySymbol)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">{t.creditLimit}:</div>
                  <div className="font-mono text-slate-200">
                    {formatCurrency(selectedCustomer.creditLimit, settings.currencySymbol)}
                  </div>
                </div>
                <div className="col-span-2 sm:col-span-4 text-[11px] text-slate-400 pt-1 border-t border-slate-800/60 truncate">
                  <span className="text-slate-400">Address: </span>
                  {selectedCustomer.address} ({selectedCustomer.area})
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Rapid Line Items Adder with Category Lock */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4.5 backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <span>2. Rapid Multi-Item Entry Bar</span>
                <span className="text-[10px] font-normal px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  Category Stays Locked
                </span>
              </div>
            </div>

            {/* Locked Category Bar & Product Search */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              
              {/* Category Lock Selector */}
              <div className="sm:col-span-4">
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Category Filter (Locked):
                </label>
                <select
                  value={lockedCategory}
                  onChange={(e) => {
                    setLockedCategory(e.target.value);
                    setSelectedProductId('');
                  }}
                  className="w-full bg-slate-950 border border-indigo-500/50 rounded-xl px-3 py-2 text-xs text-indigo-300 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="ALL">All Categories ({categories.length})</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Product Select / Search */}
              <div className="sm:col-span-8">
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Select Product / Scan Barcode:
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => handleSelectProduct(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
                >
                  <option value="">-- Choose Product ({filteredProducts.length} items in category) --</option>
                  {filteredProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} | Stock: {p.stock} {p.unit} | {settings.currencySymbol}{p.sellingPrice}
                    </option>
                  ))}
                </select>
              </div>

            </div>

            {/* Item Parameters (Qty, Unit, Rate, Discount, Add Button) */}
            <div className="grid grid-cols-2 sm:grid-cols-12 gap-3 items-end pt-1">
              
              {/* Qty */}
              <div className="sm:col-span-3">
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Quantity:
                </label>
                <input
                  type="number"
                  min="1"
                  value={tempQty}
                  onChange={(e) => setTempQty(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Unit Switcher */}
              <div className="sm:col-span-3">
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Unit:
                </label>
                <select
                  value={tempUnit}
                  onChange={(e) => setTempUnit(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  {units.map((u) => (
                    <option key={u.id} value={u.shortCode}>
                      {u.name} ({u.shortCode})
                    </option>
                  ))}
                </select>
              </div>

              {/* Rate */}
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Rate ({settings.currencySymbol}):
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={tempRate}
                  onChange={(e) => setTempRate(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Discount % */}
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Disc %:
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={tempDisc}
                  onChange={(e) => setTempDisc(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Add Button */}
              <div className="col-span-2 sm:col-span-2">
                <button
                  type="button"
                  onClick={handleAddLineItem}
                  className="w-full h-9 flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors shadow-md shadow-indigo-600/30 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add</span>
                </button>
              </div>

            </div>
          </div>

          {/* Section 3: Inline Editable Line Items Table */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4.5 backdrop-blur-md space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <span>3. Order Line Items ({cartItems.length} items)</span>
              </div>
              <div className="text-xs font-mono text-slate-400">
                Subtotal: <span className="text-white font-semibold">{formatCurrency(subtotal, settings.currencySymbol)}</span>
              </div>
            </div>

            {cartItems.length === 0 ? (
              <div className="py-12 text-center text-slate-400 border border-dashed border-slate-800 rounded-xl">
                <ShoppingBag className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <div className="text-xs font-medium">Cart is currently empty</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Use the rapid bar above to add wholesale line items</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-medium">
                      <th className="pb-2.5 pl-1">Item Description</th>
                      <th className="pb-2.5 w-24">Qty</th>
                      <th className="pb-2.5 w-24">Unit</th>
                      <th className="pb-2.5 w-24">Rate</th>
                      <th className="pb-2.5 w-20">Disc %</th>
                      <th className="pb-2.5 text-right w-28">Total</th>
                      <th className="pb-2.5 text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {cartItems.map((item, index) => (
                      <tr key={`${item.productId}-${index}`} className="hover:bg-slate-800/30">
                        <td className="py-2.5 pl-1">
                          <div className="font-medium text-slate-100">{item.productName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            SKU: {item.sku} | {item.category}
                          </div>
                        </td>
                        <td className="py-2.5">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItemQty(index, Number(e.target.value))}
                            className="w-18 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs font-mono font-bold text-white focus:outline-none focus:border-indigo-500"
                          />
                        </td>
                        <td className="py-2.5">
                          <select
                            value={item.unit}
                            onChange={(e) => handleUpdateItemUnit(index, e.target.value)}
                            className="w-20 bg-slate-950 border border-slate-800 rounded-lg px-1.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                          >
                            {units.map((u) => (
                              <option key={u.id} value={u.shortCode}>
                                {u.shortCode}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2.5">
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={item.rate}
                            onChange={(e) => handleUpdateItemRate(index, Number(e.target.value))}
                            className="w-20 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                          />
                        </td>
                        <td className="py-2.5 font-mono text-slate-400">
                          {item.discountPercent}%
                        </td>
                        <td className="py-2.5 text-right font-mono font-semibold text-emerald-400">
                          {formatCurrency(item.total, settings.currencySymbol)}
                        </td>
                        <td className="py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveLineItem(index)}
                            className="p-1 rounded text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Billing Summary, Settlement & Action (4 Cols) */}
        <div className="lg:col-span-4 space-y-5">
          
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md space-y-4">
            <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Settlement & Grand Total
            </h2>

            {/* Calculations Breakdown */}
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span>Items Subtotal:</span>
                <span className="font-mono font-medium text-white">
                  {formatCurrency(subtotal, settings.currencySymbol)}
                </span>
              </div>

              {/* Tax Setting */}
              <div className="flex items-center justify-between text-slate-300">
                <div className="flex items-center gap-1.5">
                  <span>Tax / GST Rate:</span>
                  <select
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    className="bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-[11px] font-mono text-slate-200"
                  >
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>
                <span className="font-mono text-slate-200">
                  +{formatCurrency(taxAmount, settings.currencySymbol)}
                </span>
              </div>

              {/* Overall Discount */}
              <div className="flex items-center justify-between text-slate-300">
                <span>Special Bill Discount:</span>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">-</span>
                  <input
                    type="number"
                    min="0"
                    value={overallDiscount}
                    onChange={(e) => setOverallDiscount(Number(e.target.value))}
                    className="w-20 bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-right font-mono text-xs text-white"
                  />
                </div>
              </div>

              {/* Divider & Grand Total */}
              <div className="pt-3 border-t border-slate-800 flex items-baseline justify-between">
                <div>
                  <div className="text-sm font-bold text-white uppercase tracking-wider">Grand Total</div>
                  <div className="text-[10px] text-slate-400">Inclusive of taxes & discounts</div>
                </div>
                <div className="text-2xl font-bold font-mono-numbers text-emerald-400">
                  {formatCurrency(grandTotal, settings.currencySymbol)}
                </div>
              </div>
            </div>

            {/* Payment Mode & Status */}
            <div className="pt-3 border-t border-slate-800 space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Payment Mode:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Credit', 'UPI', 'Cash', 'Bank Transfer'] as PaymentMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        setPaymentMode(mode);
                        if (mode === 'UPI' || mode === 'Cash' || mode === 'Bank Transfer') {
                          setPaymentStatus('Paid');
                        } else {
                          setPaymentStatus('Unpaid');
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border text-center transition-colors cursor-pointer ${
                        paymentMode === mode
                          ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Payment Status:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Paid', 'Unpaid', 'Partial'] as PaymentStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setPaymentStatus(st)}
                      className={`px-2 py-1.5 rounded-xl text-xs font-medium border text-center transition-colors cursor-pointer ${
                        paymentStatus === st
                          ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Order Dispatch Notes:
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Delivery before 12 PM, pack in extra cartons..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Action Submit Button */}
            <div className="pt-2">
              <button
                type="button"
                disabled={isSubmitting || cartItems.length === 0 || !selectedCustomer}
                onClick={handleGenerateOrder}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:opacity-95 disabled:opacity-50 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Generate Order & Print Invoice</span>
              </button>
            </div>

          </div>

          {/* Quick Shortcuts Pill */}
          <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-3 text-[11px] text-slate-400 space-y-1">
            <div className="font-semibold text-slate-300">💡 Pro Tip:</div>
            <div>Category stays locked so you can rapidly add 10+ items without re-selecting categories. Inventory updates instantly across tabs.</div>
          </div>

        </div>

      </div>

      {/* QUICK ADD CUSTOMER MODAL */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-400" />
                <span>Quick Add New Customer</span>
              </h3>
              <button
                onClick={() => setShowAddCustomerModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Shop / Business Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Royal General Store"
                  value={newCustShop}
                  onChange={(e) => setNewCustShop(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Contact Person Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rakesh Gupta"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Mobile / WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    placeholder="98XXXXXXXX"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Area / Market Cluster</label>
                  <input
                    type="text"
                    placeholder="e.g. Karol Bagh"
                    value={newCustArea}
                    onChange={(e) => setNewCustArea(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Full Delivery Address</label>
                <input
                  type="text"
                  placeholder="Shop number, street, landmark"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Credit Limit ({settings.currencySymbol})</label>
                <input
                  type="number"
                  value={newCustCreditLimit}
                  onChange={(e) => setNewCustCreditLimit(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                >
                  Save & Select Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
