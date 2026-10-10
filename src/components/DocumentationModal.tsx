import React, { useState } from 'react';
import { BookOpen, X, Code, Database, Printer, Smartphone, Layers, CheckCircle, Shield } from 'lucide-react';

interface DocumentationModalProps {
  onClose: () => void;
}

export const DocumentationModal: React.FC<DocumentationModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'architecture' | 'schema' | 'printing' | 'field' | 'offline'>('architecture');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
              <BookOpen className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-white">OrderFlow Pro — Technical & Operational Guide</h2>
              <div className="text-[11px] text-slate-400">Architecture, Dexie IndexedDB schemas, Thermal POS, and Field Sync</div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Headers */}
        <div className="flex items-center gap-1 p-2 bg-slate-950 border-b border-slate-800 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('architecture')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'architecture' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            System Architecture
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'schema' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            IndexedDB Schema
          </button>
          <button
            onClick={() => setActiveTab('printing')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'printing' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Thermal Printing (80mm)
          </button>
          <button
            onClick={() => setActiveTab('field')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'field' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Field Salesman Mode
          </button>
          <button
            onClick={() => setActiveTab('offline')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'offline' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Offline Cloud Sync
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 text-xs text-slate-300 space-y-4 leading-relaxed">
          
          {activeTab === 'architecture' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Code className="w-4 h-4 text-indigo-400" />
                <span>Hybrid Local-First Architecture</span>
              </h3>
              <p>
                OrderFlow Pro uses a dual-engine architecture designed for zero latency, rock-solid offline reliability in rural/market areas, and real-time multi-device cloud synchronization.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="font-semibold text-white">Local-First (Dexie.js IndexedDB)</div>
                  <p className="text-[11px] text-slate-400">
                    Stores orders, products, customers, and exceptions in browser IndexedDB. Transactions execute in under 4ms with zero network dependence.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="font-semibold text-white">BroadcastChannel Cross-Tab Sync</div>
                  <p className="text-[11px] text-slate-400">
                    Utilizes <code className="text-indigo-300">orderflow_channel_sync</code> so opening multiple tabs (POS counter + warehouse kitchen + dashboard) updates seamlessly in real time without refreshing.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'schema' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                <span>IndexedDB Dexie Tables & Index Schema</span>
              </h3>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] space-y-1 text-slate-300">
                <div>customers: 'id, name, shopName, phone, area, tenantId, updatedAt'</div>
                <div>products: 'id, sku, name, category, unit, barcode, isActive, tenantId, updatedAt'</div>
                <div>categories: 'id, name, tenantId'</div>
                <div>units: 'id, name, shortCode, tenantId'</div>
                <div>orders: 'id, customerId, status, paymentStatus, displayDate, createdAt, tenantId, isDeleted'</div>
                <div>deletedOrders: 'id, deletedAt, tenantId'</div>
                <div>importExceptions: 'id, status, tenantId, createdAt'</div>
                <div>usedOrderIds: 'orderId, tenantId'</div>
                <div>settings: 'key, tenantId'</div>
              </div>
              <p className="text-[11px] text-slate-400">
                Strict primary keys and indexed composite keys allow instant range queries and multi-area filtering across tens of thousands of records.
              </p>
            </div>
          )}

          {activeTab === 'printing' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Printer className="w-4 h-4 text-sky-400" />
                <span>Thermal POS (80mm / 3-inch) Configuration Guide</span>
              </h3>
              <p>
                OrderFlow Pro features a dedicated thermal engine built to communicate with standard ESC/POS 80mm receipt printers (e.g. Epson TM-T82, TVS RP 3200, POS-80) with zero margin cuts.
              </p>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="font-semibold text-white">Browser Print Dialog Setup:</div>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400">
                  <li><strong className="text-slate-200">Destination:</strong> Select your 80mm Thermal Receipt Printer.</li>
                  <li><strong className="text-slate-200">Paper size:</strong> 80mm × 297mm or Continuous Receipt.</li>
                  <li><strong className="text-slate-200">Margins:</strong> Set to "None" (0mm).</li>
                  <li><strong className="text-slate-200">Headers and footers:</strong> Uncheck.</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'field' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>Field Salesman Order Booking Workflow</span>
              </h3>
              <p>
                Field representatives visiting wholesale markets can switch to <strong className="text-emerald-400">Field Salesman Mode</strong> from the navigation bar.
              </p>
              <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-400">
                <li>Select the market area route (e.g. Chandni Chowk or Karol Bagh).</li>
                <li>Tap on the visiting retailer shop (shows their credit status & balance).</li>
                <li>Use quick stepper buttons (+ / -) to add cartons/boxes to the order.</li>
                <li>Tap "Review & Book", confirm, and send an instant formatted WhatsApp invoice directly to the shopkeeper's phone!</li>
              </ol>
            </div>
          )}

          {activeTab === 'offline' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-400" />
                <span>Offline Operation & Synchronization Queue</span>
              </h3>
              <p>
                If the device loses Internet connection, OrderFlow Pro automatically switches the top status badge to <strong className="text-amber-400">Offline Mode</strong>. All orders, customer edits, and stock adjustments continue without interruption.
              </p>
              <p className="text-[11px] text-slate-400">
                When connectivity restores, the offline queue automatically flushes and synchronizes state with the cloud.
              </p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-medium text-xs"
          >
            Close Guide
          </button>
        </div>

      </div>
    </div>
  );
};
