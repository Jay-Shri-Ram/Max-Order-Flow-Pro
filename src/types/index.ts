export type OrderStatus = 'Pending' | 'In Process' | 'Complete' | 'Cancelled';
export type PaymentMode = 'Cash' | 'Credit' | 'UPI' | 'Bank Transfer';
export type PaymentStatus = 'Paid' | 'Unpaid' | 'Partial';
export type UserRole = 'Admin' | 'Salesman' | 'Cashier' | 'Warehouse';
export type AccentTheme = 'indigo' | 'emerald' | 'ocean' | 'rose' | 'amber' | 'violet' | 'teal' | 'slate';
export type Language = 'en' | 'hi';
export type PrintFormat = 'a4' | 'thermal';

export interface Customer {
  id: string;
  name: string;
  shopName: string;
  phone: string;
  address: string;
  area: string;
  creditLimit: number;
  outstandingBalance: number;
  createdAt: string; // ISO
  updatedAt: string;
  tenantId: string;
}

export interface Unit {
  id: string;
  name: string;
  shortCode: string;
  tenantId: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  tenantId: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  reorderLevel: number;
  barcode?: string;
  isActive: boolean;
  tenantId: string;
  updatedAt: string;
}

export interface OrderLineItem {
  productId: string;
  productName: string;
  sku: string;
  category: string;
  unit: string;
  quantity: number;
  rate: number;
  discountPercent: number;
  total: number;
}

export interface Order {
  id: string; // e.g. MT-ORD-1001
  customerId: string;
  customerName: string;
  shopName: string;
  customerPhone: string;
  customerAddress: string;
  area: string;
  items: OrderLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discount: number;
  grandTotal: number;
  status: OrderStatus;
  notes?: string;
  paymentMode: PaymentMode;
  paymentStatus: PaymentStatus;
  createdAt: string; // ISO timestamp
  displayDate: string; // strictly DD-MM-YYYY
  createdBy: string;
  creatorRole: UserRole;
  tenantId: string;
  isDeleted?: boolean;
}

export interface DeletedOrder {
  id: string;
  originalOrder: Order;
  deletedAt: string;
  deletedBy: string;
  reason: string;
  tenantId: string;
}

export interface ImportException {
  id: string;
  rawRow: {
    productName?: string;
    category?: string;
    unit?: string;
    rate?: string | number;
    stock?: string | number;
    customerName?: string;
    shopName?: string;
    area?: string;
  };
  reason: string;
  suggestedFix: string;
  status: 'pending' | 'resolved' | 'ignored';
  createdAt: string;
  tenantId: string;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  tenantId: string;
  isDemoUser?: boolean;
  demoExpiresAt?: number; // timestamp
}

export interface StoreSettings {
  storeName: string;
  tagline: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  taxId: string; // GST / VAT
  upiId: string; // e.g. merchant@okaxis
  bankName: string;
  bankAccount: string;
  bankIfsc: string;
  orderPrefix: string;
  orderMiddle: string;
  orderCounter: number;
  defaultTaxRate: number;
  currencySymbol: string;
  defaultPrintFormat: PrintFormat;
  terms: string;
  firebaseConfig?: {
    apiKey?: string;
    authDomain?: string;
    projectId?: string;
    storageBucket?: string;
    messagingSenderId?: string;
    appId?: string;
    enabled: boolean;
  };
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
}
