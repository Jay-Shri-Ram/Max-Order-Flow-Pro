import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  Firestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  onSnapshot, 
  writeBatch,
  serverTimestamp 
} from 'firebase/firestore';
import { Order, Product, Customer, StoreSettings } from '../types';
import { db } from '../db/db';

// User's provided Firebase configuration
export const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDx-K4DT88Nuh1wfwiNHyPDH9dyKYTDOIk",
  authDomain: "order-flow-pro.firebaseapp.com",
  projectId: "order-flow-pro",
  storageBucket: "order-flow-pro.firebasestorage.app",
  messagingSenderId: "84733355348",
  appId: "1:84733355348:web:75d6f2b6c18a6198f7d4c1",
  measurementId: "G-EL4GE2JZQD"
};

let firebaseApp: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;
let isInitialized = false;
let initError: string | null = null;

export function getActiveFirebaseConfig(): typeof DEFAULT_FIREBASE_CONFIG {
  try {
    const saved = localStorage.getItem('orderflow_firebase_config');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    // Fallback to default
  }
  return DEFAULT_FIREBASE_CONFIG;
}

export function saveFirebaseConfig(config: typeof DEFAULT_FIREBASE_CONFIG) {
  localStorage.setItem('orderflow_firebase_config', JSON.stringify(config));
  // Re-initialize
  firebaseApp = null;
  firestoreDb = null;
  isInitialized = false;
  initFirebase();
}

export function initFirebase(): { app: FirebaseApp | null; db: Firestore | null; error: string | null } {
  if (isInitialized && firestoreDb) {
    return { app: firebaseApp, db: firestoreDb, error: null };
  }

  try {
    const config = getActiveFirebaseConfig();
    if (!config || !config.apiKey || !config.projectId) {
      throw new Error("Missing Firebase API Key or Project ID");
    }

    if (getApps().length === 0) {
      firebaseApp = initializeApp(config);
    } else {
      firebaseApp = getApp();
    }

    firestoreDb = getFirestore(firebaseApp);
    isInitialized = true;
    initError = null;
    return { app: firebaseApp, db: firestoreDb, error: null };
  } catch (err: any) {
    console.warn("Firebase initialization warning:", err);
    initError = err.message || "Failed to initialize Firebase";
    return { app: null, db: null, error: initError };
  }
}

/**
 * Test connectivity with Firestore
 */
export async function testFirestoreConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const { db: fsDb, error } = initFirebase();
    if (error || !fsDb) {
      return { success: false, message: error || "Firebase not initialized" };
    }

    // Try a ping write to test document
    const pingRef = doc(fsDb, '_system_status', 'ping');
    await setDoc(pingRef, {
      lastPing: new Date().toISOString(),
      agent: 'OrderFlow Pro Web',
      version: '2.6'
    }, { merge: true });

    return { 
      success: true, 
      message: `Successfully connected to Firebase Project: ${DEFAULT_FIREBASE_CONFIG.projectId}` 
    };
  } catch (err: any) {
    // If permissions require rules or network blocked, inform user gracefully
    console.warn("Firestore connection check:", err);
    return { 
      success: false, 
      message: `Connection attempt reached Firebase (${err.code || 'permission/network'}). Local Dexie IndexedDB fallback is active.` 
    };
  }
}

/**
 * Push single order to Firestore in real time
 */
export async function pushOrderToFirestore(order: Order): Promise<boolean> {
  try {
    const { db: fsDb } = initFirebase();
    if (!fsDb) return false;

    const orderRef = doc(fsDb, 'orders', order.id);
    await setDoc(orderRef, {
      ...order,
      syncedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn("Could not push order to Firestore (offline queue will sync later):", err);
    return false;
  }
}

/**
 * Push full local IndexedDB dataset to Firestore
 */
export async function syncLocalToFirestore(
  orders: Order[],
  products: Product[],
  customers: Customer[]
): Promise<{ success: boolean; syncedCount: number; message: string }> {
  try {
    const { db: fsDb, error } = initFirebase();
    if (error || !fsDb) {
      return { success: false, syncedCount: 0, message: error || "Firebase not initialized" };
    }

    let count = 0;

    // Push orders
    for (const order of orders) {
      const orderRef = doc(fsDb, 'orders', order.id);
      await setDoc(orderRef, { ...order, updatedAt: new Date().toISOString() }, { merge: true });
      count++;
    }

    // Push products
    for (const prod of products) {
      const prodRef = doc(fsDb, 'products', prod.id);
      await setDoc(prodRef, { ...prod, updatedAt: new Date().toISOString() }, { merge: true });
      count++;
    }

    // Push customers
    for (const cust of customers) {
      const custRef = doc(fsDb, 'customers', cust.id);
      await setDoc(custRef, { ...cust, updatedAt: new Date().toISOString() }, { merge: true });
      count++;
    }

    return {
      success: true,
      syncedCount: count,
      message: `Successfully synced ${count} items (Orders, Products, Customers) to Cloud Firestore!`
    };
  } catch (err: any) {
    console.error("Firestore sync error:", err);
    return {
      success: false,
      syncedCount: 0,
      message: err.message || "Failed to push records to Firestore"
    };
  }
}

/**
 * Pull orders, products, and customers from Firestore into local IndexedDB
 */
export async function syncFirestoreToLocal(): Promise<{ success: boolean; pulledCount: number; message: string }> {
  try {
    const { db: fsDb, error } = initFirebase();
    if (!fsDb) {
      return { success: false, pulledCount: 0, message: error || "Firebase not initialized" };
    }

    let count = 0;

    // Pull orders
    const ordersSnap = await getDocs(collection(fsDb, 'orders'));
    const remoteOrders: Order[] = [];
    ordersSnap.forEach((d) => {
      remoteOrders.push(d.data() as Order);
    });
    if (remoteOrders.length > 0) {
      await db.orders.bulkPut(remoteOrders);
      count += remoteOrders.length;
    }

    // Pull products
    const prodsSnap = await getDocs(collection(fsDb, 'products'));
    const remoteProducts: Product[] = [];
    prodsSnap.forEach((d) => {
      remoteProducts.push(d.data() as Product);
    });
    if (remoteProducts.length > 0) {
      await db.products.bulkPut(remoteProducts);
      count += remoteProducts.length;
    }

    // Pull customers
    const custSnap = await getDocs(collection(fsDb, 'customers'));
    const remoteCustomers: Customer[] = [];
    custSnap.forEach((d) => {
      remoteCustomers.push(d.data() as Customer);
    });
    if (remoteCustomers.length > 0) {
      await db.customers.bulkPut(remoteCustomers);
      count += remoteCustomers.length;
    }

    return {
      success: true,
      pulledCount: count,
      message: `Pulled ${count} records from Cloud Firestore into local IndexedDB!`
    };
  } catch (err: any) {
    console.error("Error pulling from Firestore:", err);
    return {
      success: false,
      pulledCount: 0,
      message: err.message || "Failed to pull from Firestore"
    };
  }
}
