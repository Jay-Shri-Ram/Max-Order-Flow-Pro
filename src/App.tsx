import React, { useState, useEffect, useCallback } from 'react';
import { 
  Customer, 
  Product, 
  Category, 
  Unit, 
  Order, 
  OrderStatus, 
  DeletedOrder, 
  ImportException, 
  StoreSettings, 
  UserAccount, 
  UserRole, 
  AccentTheme, 
  Language, 
  NotificationItem 
} from './types';
import { 
  db, 
  DEFAULT_TENANT_ID, 
  INITIAL_SETTINGS, 
  seedInitialDatabaseIfEmpty 
} from './db/db';
import { cloudSync } from './services/cloudSync';
import { Header } from './components/Header';
import { Navigation, NavTab } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { OrderEntryPOS } from './components/OrderEntryPOS';
import { FieldSalesmanMode } from './components/FieldSalesmanMode';
import { OrderHistory } from './components/OrderHistory';
import { DemandSummary } from './components/DemandSummary';
import { CustomerMaster } from './components/CustomerMaster';
import { CustomerAnalytics } from './components/CustomerAnalytics';
import { ProductMaster } from './components/ProductMaster';
import { ImportExceptionsStaging } from './components/ImportExceptionsStaging';
import { AdminPanel } from './components/AdminPanel';
import { InvoicePrintModal } from './components/InvoicePrintModal';
import { RecycleBinModal } from './components/RecycleBinModal';
import { DocumentationModal } from './components/DocumentationModal';
import { AuthModal } from './components/AuthModal';
import { ToastNotification } from './components/ToastNotification';

export default function App() {
  // Navigation & System Settings
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [accent, setAccent] = useState<AccentTheme>(() => {
    return (localStorage.getItem('orderflow_accent') as AccentTheme) || 'indigo';
  });
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('orderflow_lang') as Language) || 'en';
  });
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('orderflow_theme_mode') as 'light' | 'dark') || 'dark';
  });

  // Current Logged-in Staff User
  const [currentUser, setCurrentUser] = useState<UserAccount>({
    id: 'usr_admin',
    name: 'Vikram Singhania',
    email: 'admin@orderflow.pro',
    role: 'Admin',
    tenantId: 'store_apex_default'
  });

  // Database Data States
  const [settings, setSettings] = useState<StoreSettings>(INITIAL_SETTINGS);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [deletedOrders, setDeletedOrders] = useState<DeletedOrder[]>([]);
  const [exceptions, setExceptions] = useState<ImportException[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);

  // Cloud Sync & Network
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('synced');

  // Push Notifications Queue
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Modals
  const [invoiceModalOrder, setInvoiceModalOrder] = useState<Order | null>(null);
  const [showRecycleBin, setShowRecycleBin] = useState<boolean>(false);
  const [showDocs, setShowDocs] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | 'forgot' | 'update_password'>('login');

  // Set Theme attribute on root element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', accent);
    localStorage.setItem('orderflow_accent', accent);
  }, [accent]);

  // Set Light / Dark Mode attribute on root element
  useEffect(() => {
    document.documentElement.setAttribute('data-mode', themeMode);
    if (themeMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('orderflow_theme_mode', themeMode);
  }, [themeMode]);

  const handleToggleThemeMode = () => {
    setThemeMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    localStorage.setItem('orderflow_lang', lang);
  }, [lang]);

  // Push Toast Notification Helper
  const showToast = useCallback((
    title: string,
    message: string,
    type: 'success' | 'warning' | 'error' | 'info' = 'info'
  ) => {
    const item: NotificationItem = {
      id: `toast_${Date.now()}_${Math.random()}`,
      title,
      message,
      type,
      timestamp: new Date().toISOString(),
      read: false
    };
    setNotifications((prev) => [item, ...prev.slice(0, 4)]);

    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== item.id));
    }, 4500);
  }, []);

  const dismissToast = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Reload data from IndexedDB
  const refreshFromDb = useCallback(async () => {
    try {
      await seedInitialDatabaseIfEmpty();

      const [
        loadedCustomers,
        loadedProducts,
        loadedCategories,
        loadedUnits,
        loadedOrders,
        loadedDeleted,
        loadedExceptions,
        loadedUsers,
        loadedSettingsRow
      ] = await Promise.all([
        db.customers.toArray(),
        db.products.toArray(),
        db.categories.toArray(),
        db.units.toArray(),
        db.orders.toArray(),
        db.deletedOrders.toArray(),
        db.importExceptions.toArray(),
        db.users.toArray(),
        db.settings.get('store_settings')
      ]);

      setCustomers(loadedCustomers);
      setProducts(loadedProducts);
      setCategories(loadedCategories);
      setUnits(loadedUnits);
      setOrders(loadedOrders.reverse());
      setDeletedOrders(loadedDeleted);
      setExceptions(loadedExceptions);
      if (loadedUsers.length > 0) setUsers(loadedUsers);
      if (loadedSettingsRow?.value) setSettings(loadedSettingsRow.value);
    } catch (err) {
      console.error('Error loading Dexie database:', err);
    }
  }, []);

  // Initial Seed & Listeners
  useEffect(() => {
    refreshFromDb();

    // Subscribe to cloud sync service
    const unsubscribeSync = cloudSync.subscribe((st) => {
      setSyncStatus(st);
    });

    // Cross-tab BroadcastChannel listener
    const handleRemoteTabEvent = (e: any) => {
      refreshFromDb();
      showToast('Live Cloud Sync', 'Data updated from another terminal / window.', 'info');
    };
    window.addEventListener('orderflow_tab_sync', handleRemoteTabEvent);

    return () => {
      unsubscribeSync();
      window.removeEventListener('orderflow_tab_sync', handleRemoteTabEvent);
    };
  }, [refreshFromDb, showToast]);

  // Order Operations
  const handleSaveOrder = async (
    newOrder: Order,
    updatedProducts: Product[],
    updatedCustomer?: Customer
  ) => {
    await db.transaction('rw', [db.orders, db.products, db.customers, db.usedOrderIds], async () => {
      await db.orders.put(newOrder);
      await db.products.bulkPut(updatedProducts);
      if (updatedCustomer) {
        await db.customers.put(updatedCustomer);
      }
      await db.usedOrderIds.put({
        orderId: newOrder.id,
        timestamp: newOrder.createdAt,
        tenantId: settings.storeName
      });
    });

    await refreshFromDb();
    await cloudSync.triggerSync('ORDER_CREATED', newOrder);
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    const target = await db.orders.get(orderId);
    if (!target) return;

    target.status = newStatus;
    await db.orders.put(target);
    await refreshFromDb();
    await cloudSync.triggerSync('ORDER_STATUS_CHANGED', { orderId, newStatus });
    showToast('Status Updated', `Order ${orderId} marked as ${newStatus}`, 'success');
  };

  const handleBulkUpdateStatus = async (orderIds: string[], newStatus: OrderStatus) => {
    await db.transaction('rw', db.orders, async () => {
      for (const id of orderIds) {
        const o = await db.orders.get(id);
        if (o) {
          o.status = newStatus;
          await db.orders.put(o);
        }
      }
    });
    await refreshFromDb();
    await cloudSync.triggerSync('ORDERS_BULK_STATUS_CHANGED', { orderIds, newStatus });
  };

  const handleSoftDeleteOrder = async (order: Order, reason: string = 'Moved to recycle bin') => {
    const deletedEntry: DeletedOrder = {
      id: `del_${Date.now()}_${order.id}`,
      originalOrder: order,
      deletedAt: new Date().toISOString(),
      deletedBy: currentUser.name,
      reason,
      tenantId: settings.storeName
    };

    await db.transaction('rw', [db.orders, db.deletedOrders], async () => {
      await db.orders.delete(order.id);
      await db.deletedOrders.put(deletedEntry);
    });

    await refreshFromDb();
    await cloudSync.triggerSync('ORDER_SOFT_DELETED', deletedEntry);
    showToast('Order Deleted', `Order ${order.id} moved to Recycle Bin.`, 'info');
  };

  const handleBulkSoftDelete = async (targetOrders: Order[], reason: string = 'Bulk soft delete') => {
    await db.transaction('rw', [db.orders, db.deletedOrders], async () => {
      for (const order of targetOrders) {
        const deletedEntry: DeletedOrder = {
          id: `del_${Date.now()}_${order.id}`,
          originalOrder: order,
          deletedAt: new Date().toISOString(),
          deletedBy: currentUser.name,
          reason,
          tenantId: settings.storeName
        };
        await db.orders.delete(order.id);
        await db.deletedOrders.put(deletedEntry);
      }
    });
    await refreshFromDb();
    await cloudSync.triggerSync('ORDERS_BULK_DELETED', { count: targetOrders.length });
  };

  const handleRestoreOrder = async (del: DeletedOrder) => {
    await db.transaction('rw', [db.orders, db.deletedOrders], async () => {
      await db.deletedOrders.delete(del.id);
      await db.orders.put(del.originalOrder);
    });
    await refreshFromDb();
    await cloudSync.triggerSync('ORDER_RESTORED', del.originalOrder);
  };

  const handlePurgeOrder = async (delId: string) => {
    await db.deletedOrders.delete(delId);
    await refreshFromDb();
    await cloudSync.triggerSync('ORDER_PURGED', { delId });
  };

  const handlePurgeAll = async () => {
    await db.deletedOrders.clear();
    await refreshFromDb();
    await cloudSync.triggerSync('ALL_DELETED_ORDERS_PURGED');
  };

  // Customer Operations
  const handleSaveCustomer = async (cust: Customer) => {
    await db.customers.put(cust);
    await refreshFromDb();
    await cloudSync.triggerSync('CUSTOMER_SAVED', cust);
  };

  const handleBulkUpdateLocation = async (customerIds: string[], newArea: string) => {
    await db.transaction('rw', db.customers, async () => {
      for (const id of customerIds) {
        const c = await db.customers.get(id);
        if (c) {
          c.area = newArea;
          c.updatedAt = new Date().toISOString();
          await db.customers.put(c);
        }
      }
    });
    await refreshFromDb();
    await cloudSync.triggerSync('CUSTOMERS_LOCATION_UPDATED', { customerIds, newArea });
  };

  const handleBulkDeleteCustomers = async (customerIds: string[]) => {
    await db.transaction('rw', db.customers, async () => {
      for (const id of customerIds) {
        await db.customers.delete(id);
      }
    });
    await refreshFromDb();
    await cloudSync.triggerSync('CUSTOMERS_DELETED', { count: customerIds.length });
  };

  const handleImportCustomers = async (importedList: Customer[]) => {
    await db.customers.bulkPut(importedList);
    await refreshFromDb();
    await cloudSync.triggerSync('CUSTOMERS_IMPORTED', { count: importedList.length });
  };

  const handleImportProducts = async (importedList: Product[]) => {
    await db.products.bulkPut(importedList);
    await refreshFromDb();
    await cloudSync.triggerSync('PRODUCTS_IMPORTED', { count: importedList.length });
  };

  // Product & Inventory Operations
  const handleSaveProduct = async (prod: Product) => {
    await db.products.put(prod);
    await refreshFromDb();
    await cloudSync.triggerSync('PRODUCT_SAVED', prod);
  };

  const handleDeleteProduct = async (productId: string) => {
    await db.products.delete(productId);
    await refreshFromDb();
    await cloudSync.triggerSync('PRODUCT_DELETED', { productId });
    showToast('Product Removed', 'Product removed from catalog.', 'info');
  };

  const handleAdjustStock = async (productId: string, delta: number, reason: string) => {
    const prod = await db.products.get(productId);
    if (!prod) return;

    prod.stock = Math.max(0, prod.stock + delta);
    prod.updatedAt = new Date().toISOString();
    await db.products.put(prod);
    await refreshFromDb();
    await cloudSync.triggerSync('STOCK_ADJUSTED', { productId, delta, reason });
  };

  const handleSaveCategory = async (cat: Category) => {
    await db.categories.put(cat);
    await refreshFromDb();
    await cloudSync.triggerSync('CATEGORY_SAVED', cat);
  };

  const handleDeleteCategory = async (catId: string) => {
    await db.categories.delete(catId);
    await refreshFromDb();
    await cloudSync.triggerSync('CATEGORY_DELETED', { catId });
  };

  const handleSaveUnit = async (u: Unit) => {
    await db.units.put(u);
    await refreshFromDb();
    await cloudSync.triggerSync('UNIT_SAVED', u);
  };

  const handleDeleteUnit = async (uId: string) => {
    await db.units.delete(uId);
    await refreshFromDb();
    await cloudSync.triggerSync('UNIT_DELETED', { uId });
  };

  // Exceptions Staging Operations
  const handleApproveException = async (
    exc: ImportException,
    mappedCategory: string,
    mappedUnit: string
  ) => {
    const now = new Date().toISOString();
    const raw = exc.rawRow;

    // Create product in catalog
    const newProd: Product = {
      id: `p_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: raw.productName || 'Imported SKU',
      sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      category: mappedCategory,
      unit: mappedUnit,
      costPrice: Number(raw.rate) ? Number(raw.rate) * 0.8 : 100,
      sellingPrice: Number(raw.rate) || 120,
      stock: Number(raw.stock) || 50,
      reorderLevel: 10,
      isActive: true,
      tenantId: settings.storeName,
      updatedAt: now
    };

    exc.status = 'resolved';

    await db.transaction('rw', [db.products, db.importExceptions], async () => {
      await db.products.put(newProd);
      await db.importExceptions.put(exc);
    });

    await refreshFromDb();
    await cloudSync.triggerSync('EXCEPTION_APPROVED', exc.id);
  };

  const handleIgnoreException = async (excId: string) => {
    const exc = await db.importExceptions.get(excId);
    if (!exc) return;
    exc.status = 'ignored';
    await db.importExceptions.put(exc);
    await refreshFromDb();
    showToast('Exception Ignored', 'Item dismissed from quarantine staging.', 'info');
  };

  // Settings & Users
  const handleSaveSettings = async (newSettings: StoreSettings) => {
    await db.settings.put({
      key: 'store_settings',
      value: newSettings,
      tenantId: newSettings.storeName
    });
    setSettings(newSettings);
    await cloudSync.triggerSync('SETTINGS_UPDATED', newSettings);
  };

  const handleSaveUser = async (u: UserAccount) => {
    await db.users.put(u);
    await refreshFromDb();
    await cloudSync.triggerSync('USER_SAVED', u);
  };

  const handleDeleteUser = async (uId: string) => {
    await db.users.delete(uId);
    await refreshFromDb();
    await cloudSync.triggerSync('USER_DELETED', { uId });
  };

  const handleResetDatabase = async () => {
    await db.delete();
    await db.open();
    await seedInitialDatabaseIfEmpty();
    await refreshFromDb();
    await cloudSync.triggerSync('DATABASE_RESET');
  };

  // Demo 1-Hour Guest Session
  const handleStartDemoSession = () => {
    const demoUser: UserAccount = {
      id: `usr_demo_${Date.now()}`,
      name: 'Guest Demo Operator',
      email: 'demo@orderflow.pro',
      role: 'Admin',
      tenantId: 'store_apex_default',
      isDemoUser: true,
      demoExpiresAt: Date.now() + 60 * 60 * 1000 // 1 Hour
    };
    setCurrentUser(demoUser);
    showToast('1-Hour Demo Initialized', 'Full access unlocked with 60-minute session countdown.', 'success');
  };

  return (
    <div className="min-h-full flex flex-col bg-slate-950 text-slate-100">
      
      {/* Toast Notification Stack */}
      <ToastNotification notifications={notifications} onDismiss={dismissToast} />

      {/* Main SaaS Header */}
      <Header
        settings={settings}
        accent={accent}
        onAccentChange={setAccent}
        lang={lang}
        onLangChange={setLang}
        themeMode={themeMode}
        onToggleThemeMode={handleToggleThemeMode}
        currentUser={currentUser}
        onSwitchUserRole={(role) => {
          setCurrentUser({ ...currentUser, role });
          showToast('Role Switched', `Active view switched to ${role} permissions.`, 'info');
        }}
        syncStatus={syncStatus}
        onTriggerSync={() => {
          cloudSync.triggerSync('MANUAL_SYNC_TRIGGER');
          showToast('Cloud Sync', 'Real-time database sync heartbeat dispatched.', 'info');
        }}
        deletedOrdersCount={deletedOrders.length}
        onOpenRecycleBin={() => setShowRecycleBin(true)}
        onOpenDocs={() => setShowDocs(true)}
        onOpenAuth={() => {
          setAuthModalMode('login');
          setShowAuthModal(true);
        }}
        onOpenPasswordUpdate={() => {
          setAuthModalMode('update_password');
          setShowAuthModal(true);
        }}
        onOpenCloudSettings={() => setActiveTab('admin')}
        onLogout={() => {
          setAuthModalMode('login');
          setShowAuthModal(true);
        }}
      />

      {/* Navigation Bars (Desktop Header Nav + Mobile Floating Glow Bar) */}
      <Navigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        lang={lang}
        userRole={currentUser.role}
        exceptionCount={exceptions.filter((e) => e.status === 'pending').length}
      />

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5">
        
        {/* Tab 1: Dashboard */}
        {activeTab === 'dashboard' && (
          <Dashboard
            orders={orders}
            products={products}
            customers={customers}
            settings={settings}
            lang={lang}
            onNavigate={setActiveTab}
            onPrintInvoice={setInvoiceModalOrder}
            onUpdateOrderStatus={handleUpdateOrderStatus}
          />
        )}

        {/* Tab 2: New Order POS */}
        {activeTab === 'new_order' && (
          <OrderEntryPOS
            customers={customers}
            products={products}
            categories={categories}
            units={units}
            settings={settings}
            currentUser={currentUser}
            lang={lang}
            onSaveOrder={handleSaveOrder}
            onSaveCustomer={handleSaveCustomer}
            onPrintInvoice={setInvoiceModalOrder}
            onShowToast={showToast}
          />
        )}

        {/* Tab 3: Dedicated Field Salesman Mode */}
        {activeTab === 'salesman_mode' && (
          <FieldSalesmanMode
            customers={customers}
            products={products}
            categories={categories}
            settings={settings}
            currentUser={currentUser}
            lang={lang}
            onSaveOrder={handleSaveOrder}
            onSaveCustomer={handleSaveCustomer}
            onShowToast={showToast}
          />
        )}

        {/* Tab 4: Order History */}
        {activeTab === 'order_history' && (
          <OrderHistory
            orders={orders}
            settings={settings}
            lang={lang}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onBulkUpdateStatus={handleBulkUpdateStatus}
            onSoftDeleteOrder={handleSoftDeleteOrder}
            onBulkSoftDelete={handleBulkSoftDelete}
            onPrintInvoice={setInvoiceModalOrder}
            onShowToast={showToast}
          />
        )}

        {/* Tab 5: Demand Summary */}
        {activeTab === 'demand_summary' && (
          <DemandSummary
            orders={orders}
            products={products}
            settings={settings}
            lang={lang}
            onShowToast={showToast}
          />
        )}

        {/* Tab 6: Customer Master */}
        {activeTab === 'customers' && (
          <CustomerMaster
            customers={customers}
            settings={settings}
            lang={lang}
            onSaveCustomer={handleSaveCustomer}
            onBulkUpdateLocation={handleBulkUpdateLocation}
            onBulkDeleteCustomers={handleBulkDeleteCustomers}
            onImportCustomers={handleImportCustomers}
            onShowToast={showToast}
          />
        )}

        {/* Tab 7: Customer Analytics Visual Dashboard */}
        {activeTab === 'customer_analytics' && (
          <CustomerAnalytics
            customers={customers}
            orders={orders}
            settings={settings}
            lang={lang}
            onShowToast={showToast}
          />
        )}

        {/* Tab 8: Products & Real-Time Stock */}
        {activeTab === 'products' && (
          <ProductMaster
            products={products}
            categories={categories}
            units={units}
            settings={settings}
            lang={lang}
            onSaveProduct={handleSaveProduct}
            onDeleteProduct={handleDeleteProduct}
            onSaveCategory={handleSaveCategory}
            onDeleteCategory={handleDeleteCategory}
            onSaveUnit={handleSaveUnit}
            onDeleteUnit={handleDeleteUnit}
            onAdjustStock={handleAdjustStock}
            onImportProducts={handleImportProducts}
            onShowToast={showToast}
          />
        )}

        {/* Tab 9: Staging Exceptions */}
        {activeTab === 'exceptions' && (
          <ImportExceptionsStaging
            exceptions={exceptions}
            categories={categories}
            units={units}
            settings={settings}
            lang={lang}
            onApproveException={handleApproveException}
            onIgnoreException={handleIgnoreException}
            onShowToast={showToast}
          />
        )}

        {/* Tab 10: Admin Panel */}
        {activeTab === 'admin' && (
          <AdminPanel
            users={users}
            settings={settings}
            customers={customers}
            products={products}
            orders={orders}
            lang={lang}
            onSaveUser={handleSaveUser}
            onDeleteUser={handleDeleteUser}
            onSaveSettings={handleSaveSettings}
            onResetDatabase={handleResetDatabase}
            onShowToast={showToast}
          />
        )}

      </main>

      {/* OVERLAY MODAL 1: Dedicated Thermal & A4 Invoice Print Modal */}
      <InvoicePrintModal
        order={invoiceModalOrder}
        settings={settings}
        onClose={() => setInvoiceModalOrder(null)}
        onShowToast={showToast}
      />

      {/* OVERLAY MODAL 2: Recycle Bin Modal */}
      {showRecycleBin && (
        <RecycleBinModal
          deletedOrders={deletedOrders}
          settings={settings}
          onRestoreOrder={handleRestoreOrder}
          onPurgeOrder={handlePurgeOrder}
          onPurgeAll={handlePurgeAll}
          onClose={() => setShowRecycleBin(false)}
          onShowToast={showToast}
        />
      )}

      {/* OVERLAY MODAL 3: Comprehensive Developer & Operator Guide */}
      {showDocs && (
        <DocumentationModal onClose={() => setShowDocs(false)} />
      )}

      {/* OVERLAY MODAL 4: Authentication & 1-Hour Demo Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        currentUser={currentUser}
        settings={settings}
        onLoginAsUser={setCurrentUser}
        onStartDemoSession={handleStartDemoSession}
        onShowToast={showToast}
        initialMode={authModalMode}
      />

    </div>
  );
}
