import React from 'react';
import { DeletedOrder, StoreSettings } from '../types';
import { formatCurrency, formatDateDDMMYYYY } from '../utils/formatters';
import { Trash2, RotateCcw, AlertTriangle, X, ShieldAlert } from 'lucide-react';

interface RecycleBinModalProps {
  deletedOrders: DeletedOrder[];
  settings: StoreSettings;
  onRestoreOrder: (deletedOrder: DeletedOrder) => Promise<void>;
  onPurgeOrder: (deletedOrderId: string) => Promise<void>;
  onPurgeAll: () => Promise<void>;
  onClose: () => void;
  onShowToast: (title: string, message: string, type: 'success' | 'warning' | 'error' | 'info') => void;
}

export const RecycleBinModal: React.FC<RecycleBinModalProps> = ({
  deletedOrders,
  settings,
  onRestoreOrder,
  onPurgeOrder,
  onPurgeAll,
  onClose,
  onShowToast
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        
        <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400">
              <Trash2 className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Recycle Bin (Soft Deleted Orders)</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  {deletedOrders.length} items
                </span>
              </h2>
              <div className="text-[11px] text-slate-400">
                Restore accidentally deleted orders or permanently purge records.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {deletedOrders.length > 0 && (
              <button
                onClick={async () => {
                  if (window.confirm('Permanently purge all deleted orders? This action cannot be undone!')) {
                    await onPurgeAll();
                    onShowToast('Purged', 'All deleted orders permanently wiped.', 'info');
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Purge All
              </button>
            )}

            <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {deletedOrders.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Trash2 className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <div className="text-xs font-semibold text-slate-300">Recycle Bin is Empty</div>
              <div className="text-[11px] text-slate-400 mt-0.5">No soft deleted orders in the system.</div>
            </div>
          ) : (
            deletedOrders.map((d) => (
              <div
                key={d.id}
                className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-indigo-400">{d.originalOrder.id}</span>
                    <span className="font-semibold text-white truncate">{d.originalOrder.shopName}</span>
                    <span className="text-slate-400">({d.originalOrder.customerName})</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                    <span>Deleted On: {formatDateDDMMYYYY(d.deletedAt)}</span>
                    <span>•</span>
                    <span className="text-rose-300 italic">Reason: {d.reason}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right font-mono font-bold text-white">
                    {formatCurrency(d.originalOrder.grandTotal, settings.currencySymbol)}
                  </div>

                  <button
                    onClick={async () => {
                      await onRestoreOrder(d);
                      onShowToast('Restored', `Order ${d.originalOrder.id} restored to live list!`, 'success');
                    }}
                    title="Restore Order"
                    className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={async () => {
                      if (window.confirm(`Permanently destroy order ${d.originalOrder.id}?`)) {
                        await onPurgeOrder(d.id);
                        onShowToast('Purged', `Order ${d.originalOrder.id} permanently removed.`, 'info');
                      }
                    }}
                    title="Permanently Purge"
                    className="p-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
};
