import Dexie, { Table } from 'dexie';
import { Customer, Product, Category, Unit, Order, DeletedOrder, ImportException, StoreSettings, UserAccount } from '../types';
import { formatDateDDMMYYYY } from '../utils/formatters';

export class OrderFlowDatabase extends Dexie {
  customers!: Table<Customer, string>;
  products!: Table<Product, string>;
  categories!: Table<Category, string>;
  units!: Table<Unit, string>;
  orders!: Table<Order, string>;
  deletedOrders!: Table<DeletedOrder, string>;
  importExceptions!: Table<ImportException, string>;
  usedOrderIds!: Table<{ orderId: string; timestamp: string; tenantId: string }, string>;
  settings!: Table<{ key: string; value: any; tenantId: string }, string>;
  users!: Table<UserAccount, string>;

  constructor() {
    super('OrderFlowProDB');
    this.version(1).stores({
      customers: 'id, name, shopName, phone, area, tenantId, updatedAt',
      products: 'id, sku, name, category, unit, barcode, isActive, tenantId, updatedAt',
      categories: 'id, name, tenantId',
      units: 'id, name, shortCode, tenantId',
      orders: 'id, customerId, status, paymentStatus, displayDate, createdAt, tenantId, isDeleted',
      deletedOrders: 'id, deletedAt, tenantId',
      importExceptions: 'id, status, tenantId, createdAt',
      usedOrderIds: 'orderId, tenantId',
      settings: 'key, tenantId',
      users: 'id, email, role, tenantId'
    });
  }
}

export const db = new OrderFlowDatabase();

export const DEFAULT_TENANT_ID = 'store_apex_default';

export const INITIAL_SETTINGS: StoreSettings = {
  storeName: 'Apex Wholesale & Distribution Hub',
  tagline: 'Direct B2B FMCG & Retail Logistics',
  ownerName: 'Vikramaditya Singhania',
  phone: '+91 98765 43210',
  email: 'orders@apexwholesale.in',
  address: 'Plot 42, Okhla Industrial Area Phase-III, New Delhi, 110020',
  taxId: 'GSTIN07AAACG0123M1Z5',
  upiId: 'apexwholesale@icici',
  bankName: 'HDFC Bank Ltd.',
  bankAccount: '50200049281729',
  bankIfsc: 'HDFC0001234',
  orderPrefix: 'MT',
  orderMiddle: 'ORD',
  orderCounter: 1012,
  defaultTaxRate: 18,
  currencySymbol: '₹',
  defaultPrintFormat: 'thermal',
  terms: 'Goods once sold are subject to delivery verification within 24 hours. Interest @ 18% p.a. will be levied on overdue credit bills.',
  firebaseConfig: {
    enabled: true,
    projectId: 'orderflow-pro-cloud',
    authDomain: 'orderflow-pro-cloud.firebaseapp.com'
  }
};

export async function seedInitialDatabaseIfEmpty() {
  const customerCount = await db.customers.count();
  if (customerCount > 0) {
    return; // Already initialized
  }

  // 1. Units
  const initialUnits: Unit[] = [
    { id: 'u_1', name: 'Carton (CTN)', shortCode: 'CTN', tenantId: DEFAULT_TENANT_ID },
    { id: 'u_2', name: 'Box', shortCode: 'Box', tenantId: DEFAULT_TENANT_ID },
    { id: 'u_3', name: 'Pieces', shortCode: 'Pcs', tenantId: DEFAULT_TENANT_ID },
    { id: 'u_4', name: 'Kilograms', shortCode: 'Kg', tenantId: DEFAULT_TENANT_ID },
    { id: 'u_5', name: 'Meters', shortCode: 'Meter', tenantId: DEFAULT_TENANT_ID },
    { id: 'u_6', name: 'Bundle', shortCode: 'Bundle', tenantId: DEFAULT_TENANT_ID },
    { id: 'u_7', name: 'Dozen', shortCode: 'Dzn', tenantId: DEFAULT_TENANT_ID },
  ];
  await db.units.bulkAdd(initialUnits);

  // 2. Categories
  const initialCategories: Category[] = [
    { id: 'c_1', name: 'Beverages & Syrups', description: 'Soft drinks, fruit crushes, teas and coffee premixes', tenantId: DEFAULT_TENANT_ID },
    { id: 'c_2', name: 'Snacks & Confectionery', description: 'Biscuits, chips, chocolates, and premium dry snacks', tenantId: DEFAULT_TENANT_ID },
    { id: 'c_3', name: 'Grains & Staples', description: 'Basmati rice, whole wheat, pulses and premium cooking oils', tenantId: DEFAULT_TENANT_ID },
    { id: 'c_4', name: 'Dairy & Frozen', description: 'Cheese blocks, butter, paneer, and processed dairy', tenantId: DEFAULT_TENANT_ID },
    { id: 'c_5', name: 'Personal Care & Hygiene', description: 'Soaps, detergents, sanitizers, and tissue rolls', tenantId: DEFAULT_TENANT_ID },
  ];
  await db.categories.bulkAdd(initialCategories);

  // 3. Products
  const initialProducts: Product[] = [
    {
      id: 'p_101',
      name: 'Amul Butter Salted (500g Pack)',
      sku: 'AMUL-BUT-500',
      category: 'Dairy & Frozen',
      unit: 'Box',
      costPrice: 240,
      sellingPrice: 285,
      stock: 140,
      reorderLevel: 25,
      barcode: '890126201001',
      isActive: true,
      tenantId: DEFAULT_TENANT_ID,
      updatedAt: new Date().toISOString()
    },
    {
      id: 'p_102',
      name: 'Coca Cola Cans 330ml (Pack of 24)',
      sku: 'COKE-CAN-24',
      category: 'Beverages & Syrups',
      unit: 'CTN',
      costPrice: 720,
      sellingPrice: 890,
      stock: 45,
      reorderLevel: 15,
      barcode: '890176404112',
      isActive: true,
      tenantId: DEFAULT_TENANT_ID,
      updatedAt: new Date().toISOString()
    },
    {
      id: 'p_103',
      name: 'Fortune Sunlite Refined Oil (15L Tin)',
      sku: 'FORT-OIL-15L',
      category: 'Grains & Staples',
      unit: 'Box',
      costPrice: 1650,
      sellingPrice: 1820,
      stock: 28,
      reorderLevel: 10,
      barcode: '890600728101',
      isActive: true,
      tenantId: DEFAULT_TENANT_ID,
      updatedAt: new Date().toISOString()
    },
    {
      id: 'p_104',
      name: 'Cadbury Dairy Milk Silk 150g (Case of 30)',
      sku: 'CADB-SILK-30',
      category: 'Snacks & Confectionery',
      unit: 'CTN',
      costPrice: 4200,
      sellingPrice: 4850,
      stock: 12,
      reorderLevel: 8,
      barcode: '890123302005',
      isActive: true,
      tenantId: DEFAULT_TENANT_ID,
      updatedAt: new Date().toISOString()
    },
    {
      id: 'p_105',
      name: 'India Gate Basmati Rice Classic 25kg Bag',
      sku: 'ING-RICE-25KG',
      category: 'Grains & Staples',
      unit: 'Bundle',
      costPrice: 2800,
      sellingPrice: 3250,
      stock: 65,
      reorderLevel: 20,
      barcode: '890601449012',
      isActive: true,
      tenantId: DEFAULT_TENANT_ID,
      updatedAt: new Date().toISOString()
    },
    {
      id: 'p_106',
      name: 'Red Bull Energy Drink 250ml (Tray of 24)',
      sku: 'REDB-250-24',
      category: 'Beverages & Syrups',
      unit: 'CTN',
      costPrice: 2350,
      sellingPrice: 2750,
      stock: 18,
      reorderLevel: 10,
      barcode: '900249010007',
      isActive: true,
      tenantId: DEFAULT_TENANT_ID,
      updatedAt: new Date().toISOString()
    },
    {
      id: 'p_107',
      name: 'Dettol Disinfectant Liquid 5L Can',
      sku: 'DETT-LIQ-5L',
      category: 'Personal Care & Hygiene',
      unit: 'Box',
      costPrice: 1100,
      sellingPrice: 1340,
      stock: 35,
      reorderLevel: 12,
      barcode: '890139611204',
      isActive: true,
      tenantId: DEFAULT_TENANT_ID,
      updatedAt: new Date().toISOString()
    },
    {
      id: 'p_108',
      name: 'Haldiram Bhujia Sev 1kg (Master Poly Pack of 10)',
      sku: 'HALD-SEV-10',
      category: 'Snacks & Confectionery',
      unit: 'CTN',
      costPrice: 2100,
      sellingPrice: 2480,
      stock: 8,
      reorderLevel: 15,
      barcode: '890400440218',
      isActive: true,
      tenantId: DEFAULT_TENANT_ID,
      updatedAt: new Date().toISOString()
    },
    {
      id: 'p_109',
      name: 'Tata Tea Gold Leaf 1kg Pack',
      sku: 'TATA-GOLD-1K',
      category: 'Beverages & Syrups',
      unit: 'Pcs',
      costPrice: 460,
      sellingPrice: 530,
      stock: 80,
      reorderLevel: 25,
      barcode: '890105200115',
      isActive: true,
      tenantId: DEFAULT_TENANT_ID,
      updatedAt: new Date().toISOString()
    },
    {
      id: 'p_110',
      name: 'Ariel Matic Detergent Powder 6kg Bucket',
      sku: 'ARIL-MAT-6K',
      category: 'Personal Care & Hygiene',
      unit: 'Box',
      costPrice: 850,
      sellingPrice: 1020,
      stock: 22,
      reorderLevel: 10,
      barcode: '890103061201',
      isActive: true,
      tenantId: DEFAULT_TENANT_ID,
      updatedAt: new Date().toISOString()
    }
  ];
  await db.products.bulkAdd(initialProducts);

  // 4. Customers
  const initialCustomers: Customer[] = [
    {
      id: 'cust_101',
      name: 'Rajesh Agarwal',
      shopName: 'Shree Balaji Mega Mart',
      phone: '9811234567',
      address: 'Shop No. 14, Main Market, Chandni Chowk, Delhi',
      area: 'Chandni Chowk',
      creditLimit: 250000,
      outstandingBalance: 42500,
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
      tenantId: DEFAULT_TENANT_ID
    },
    {
      id: 'cust_102',
      name: 'Harpreet Singh',
      shopName: 'Singhania Daily Grocers',
      phone: '9871122334',
      address: 'Plot 88, Near Metro Pillar 112, Karol Bagh, Delhi',
      area: 'Karol Bagh',
      creditLimit: 180000,
      outstandingBalance: 12400,
      createdAt: new Date(Date.now() - 25 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
      tenantId: DEFAULT_TENANT_ID
    },
    {
      id: 'cust_103',
      name: 'Mohd. Imran Khan',
      shopName: 'Al-Madina Confectionery & Superstore',
      phone: '9810987654',
      address: 'B-24, Commercial Complex, Daryaganj, Delhi',
      area: 'Daryaganj',
      creditLimit: 300000,
      outstandingBalance: 87500,
      createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
      tenantId: DEFAULT_TENANT_ID
    },
    {
      id: 'cust_104',
      name: 'Sunita Sharma',
      shopName: 'Krishna Departmental Store',
      phone: '9910554433',
      address: 'Central Market, Shop 4B, Lajpat Nagar-II, Delhi',
      area: 'Lajpat Nagar',
      creditLimit: 120000,
      outstandingBalance: 0,
      createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
      tenantId: DEFAULT_TENANT_ID
    },
    {
      id: 'cust_105',
      name: 'Gaurav Narang',
      shopName: 'Narang Wholesalers & Caterers',
      phone: '9899443322',
      address: 'C-Block Market, Rajouri Garden, Delhi',
      area: 'Rajouri Garden',
      creditLimit: 500000,
      outstandingBalance: 154000,
      createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
      tenantId: DEFAULT_TENANT_ID
    },
    {
      id: 'cust_106',
      name: 'Pooja Verma',
      shopName: 'Verma Brothers Express Mart',
      phone: '9818776655',
      address: 'Sector 18 Market, Atta Chowk, Noida',
      area: 'Noida Hub',
      creditLimit: 200000,
      outstandingBalance: 31000,
      createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
      tenantId: DEFAULT_TENANT_ID
    }
  ];
  await db.customers.bulkAdd(initialCustomers);

  // 5. Initial Orders
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  const twoDaysAgo = new Date(Date.now() - 2 * 86400000);

  const initialOrders: Order[] = [
    {
      id: 'MT-ORD-1008',
      customerId: 'cust_101',
      customerName: 'Rajesh Agarwal',
      shopName: 'Shree Balaji Mega Mart',
      customerPhone: '9811234567',
      customerAddress: 'Shop No. 14, Main Market, Chandni Chowk, Delhi',
      area: 'Chandni Chowk',
      items: [
        {
          productId: 'p_102',
          productName: 'Coca Cola Cans 330ml (Pack of 24)',
          sku: 'COKE-CAN-24',
          category: 'Beverages & Syrups',
          unit: 'CTN',
          quantity: 4,
          rate: 890,
          discountPercent: 2,
          total: 3488.80
        },
        {
          productId: 'p_104',
          productName: 'Cadbury Dairy Milk Silk 150g (Case of 30)',
          sku: 'CADB-SILK-30',
          category: 'Snacks & Confectionery',
          unit: 'CTN',
          quantity: 2,
          rate: 4850,
          discountPercent: 0,
          total: 9700.00
        }
      ],
      subtotal: 13188.80,
      taxRate: 18,
      taxAmount: 2374.00,
      discount: 200.00,
      grandTotal: 15362.80,
      status: 'Pending',
      notes: 'Morning priority delivery before 11 AM.',
      paymentMode: 'Credit',
      paymentStatus: 'Unpaid',
      createdAt: today.toISOString(),
      displayDate: formatDateDDMMYYYY(today),
      createdBy: 'Amit Kumar (Sales Rep)',
      creatorRole: 'Salesman',
      tenantId: DEFAULT_TENANT_ID,
      isDeleted: false
    },
    {
      id: 'MT-ORD-1009',
      customerId: 'cust_103',
      customerName: 'Mohd. Imran Khan',
      shopName: 'Al-Madina Confectionery & Superstore',
      customerPhone: '9810987654',
      customerAddress: 'B-24, Commercial Complex, Daryaganj, Delhi',
      area: 'Daryaganj',
      items: [
        {
          productId: 'p_106',
          productName: 'Red Bull Energy Drink 250ml (Tray of 24)',
          sku: 'REDB-250-24',
          category: 'Beverages & Syrups',
          unit: 'CTN',
          quantity: 3,
          rate: 2750,
          discountPercent: 5,
          total: 7837.50
        },
        {
          productId: 'p_108',
          productName: 'Haldiram Bhujia Sev 1kg (Master Poly Pack of 10)',
          sku: 'HALD-SEV-10',
          category: 'Snacks & Confectionery',
          unit: 'CTN',
          quantity: 5,
          rate: 2480,
          discountPercent: 0,
          total: 12400.00
        }
      ],
      subtotal: 20237.50,
      taxRate: 18,
      taxAmount: 3642.75,
      discount: 0,
      grandTotal: 23880.25,
      status: 'In Process',
      notes: 'Packaging in corrugated outer boxes required.',
      paymentMode: 'UPI',
      paymentStatus: 'Paid',
      createdAt: yesterday.toISOString(),
      displayDate: formatDateDDMMYYYY(yesterday),
      createdBy: 'Store Counter POS',
      creatorRole: 'Cashier',
      tenantId: DEFAULT_TENANT_ID,
      isDeleted: false
    },
    {
      id: 'MT-ORD-1010',
      customerId: 'cust_105',
      customerName: 'Gaurav Narang',
      shopName: 'Narang Wholesalers & Caterers',
      customerPhone: '9899443322',
      customerAddress: 'C-Block Market, Rajouri Garden, Delhi',
      area: 'Rajouri Garden',
      items: [
        {
          productId: 'p_105',
          productName: 'India Gate Basmati Rice Classic 25kg Bag',
          sku: 'ING-RICE-25KG',
          category: 'Grains & Staples',
          unit: 'Bundle',
          quantity: 10,
          rate: 3250,
          discountPercent: 3,
          total: 31525.00
        },
        {
          productId: 'p_103',
          productName: 'Fortune Sunlite Refined Oil (15L Tin)',
          sku: 'FORT-OIL-15L',
          category: 'Grains & Staples',
          unit: 'Box',
          quantity: 6,
          rate: 1820,
          discountPercent: 0,
          total: 10920.00
        }
      ],
      subtotal: 42445.00,
      taxRate: 5,
      taxAmount: 2122.25,
      discount: 500.00,
      grandTotal: 44067.25,
      status: 'Complete',
      notes: 'Full payment received via RTGS Bank transfer.',
      paymentMode: 'Bank Transfer',
      paymentStatus: 'Paid',
      createdAt: twoDaysAgo.toISOString(),
      displayDate: formatDateDDMMYYYY(twoDaysAgo),
      createdBy: 'Vikramaditya (Admin)',
      creatorRole: 'Admin',
      tenantId: DEFAULT_TENANT_ID,
      isDeleted: false
    },
    {
      id: 'MT-ORD-1011',
      customerId: 'cust_104',
      customerName: 'Sunita Sharma',
      shopName: 'Krishna Departmental Store',
      customerPhone: '9910554433',
      customerAddress: 'Central Market, Shop 4B, Lajpat Nagar-II, Delhi',
      area: 'Lajpat Nagar',
      items: [
        {
          productId: 'p_107',
          productName: 'Dettol Disinfectant Liquid 5L Can',
          sku: 'DETT-LIQ-5L',
          category: 'Personal Care & Hygiene',
          unit: 'Box',
          quantity: 2,
          rate: 1340,
          discountPercent: 0,
          total: 2680.00
        },
        {
          productId: 'p_109',
          productName: 'Tata Tea Gold Leaf 1kg Pack',
          sku: 'TATA-GOLD-1K',
          category: 'Beverages & Syrups',
          unit: 'Pcs',
          quantity: 12,
          rate: 530,
          discountPercent: 4,
          total: 6105.60
        }
      ],
      subtotal: 8785.60,
      taxRate: 18,
      taxAmount: 1581.40,
      discount: 150.00,
      grandTotal: 10217.00,
      status: 'Cancelled',
      notes: 'Customer postponed weekly inventory purchase.',
      paymentMode: 'Cash',
      paymentStatus: 'Unpaid',
      createdAt: twoDaysAgo.toISOString(),
      displayDate: formatDateDDMMYYYY(twoDaysAgo),
      createdBy: 'Rohan Sharma (Field Rep)',
      creatorRole: 'Salesman',
      tenantId: DEFAULT_TENANT_ID,
      isDeleted: false
    }
  ];
  await db.orders.bulkAdd(initialOrders);

  // 6. Used order ids
  await db.usedOrderIds.bulkAdd([
    { orderId: 'MT-ORD-1008', timestamp: today.toISOString(), tenantId: DEFAULT_TENANT_ID },
    { orderId: 'MT-ORD-1009', timestamp: yesterday.toISOString(), tenantId: DEFAULT_TENANT_ID },
    { orderId: 'MT-ORD-1010', timestamp: twoDaysAgo.toISOString(), tenantId: DEFAULT_TENANT_ID },
    { orderId: 'MT-ORD-1011', timestamp: twoDaysAgo.toISOString(), tenantId: DEFAULT_TENANT_ID },
  ]);

  // 7. Settings
  await db.settings.put({
    key: 'store_settings',
    value: INITIAL_SETTINGS,
    tenantId: DEFAULT_TENANT_ID
  });

  // 8. Sample users
  const initialUsers: UserAccount[] = [
    { id: 'usr_admin', name: 'Vikram Singhania', email: 'admin@orderflow.pro', role: 'Admin', phone: '9876543210', tenantId: DEFAULT_TENANT_ID },
    { id: 'usr_sales_1', name: 'Amit Kumar', email: 'amit.sales@orderflow.pro', role: 'Salesman', phone: '9811223344', tenantId: DEFAULT_TENANT_ID },
    { id: 'usr_cashier_1', name: 'Pooja Rani', email: 'cashier@orderflow.pro', role: 'Cashier', phone: '9899112233', tenantId: DEFAULT_TENANT_ID },
    { id: 'usr_dispatch_1', name: 'Deepak Yadav', email: 'warehouse@orderflow.pro', role: 'Warehouse', phone: '9822334455', tenantId: DEFAULT_TENANT_ID }
  ];
  await db.users.bulkAdd(initialUsers);

  // 9. Initial Import Staging Exceptions for demo review
  const initialExceptions: ImportException[] = [
    {
      id: 'exc_1',
      rawRow: {
        productName: 'Organic Wild Honey 500g Jar',
        category: 'Organic Wellness', // Unmapped category
        unit: 'Jar', // Unmapped unit
        rate: 420,
        stock: 35
      },
      reason: 'Unknown category "Organic Wellness" & Custom unit "Jar" not in master database.',
      suggestedFix: 'Map category to "Grains & Staples" or create new category "Organic Wellness", map unit to "Pcs" or add unit "Jar".',
      status: 'pending',
      createdAt: new Date().toISOString(),
      tenantId: DEFAULT_TENANT_ID
    },
    {
      id: 'exc_2',
      rawRow: {
        customerName: 'Kunal Super Bazaar',
        shopName: 'Kunal Super Bazaar',
        area: 'Indirapuram Ghaziabad', // Unregistered area
        rate: 'N/A'
      },
      reason: 'Missing phone number & Area "Indirapuram Ghaziabad" outside standard distribution clusters.',
      suggestedFix: 'Provide phone contact and assign delivery route cluster to East NCR.',
      status: 'pending',
      createdAt: new Date().toISOString(),
      tenantId: DEFAULT_TENANT_ID
    }
  ];
  await db.importExceptions.bulkAdd(initialExceptions);
}
