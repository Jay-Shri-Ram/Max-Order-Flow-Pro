import React, { useState } from 'react';
import { ImportException, Category, Unit, StoreSettings, Language } from '../types';
import { translations } from '../utils/i18n';
import { formatDateDDMMYYYY } from '../utils/formatters';
import { 
  AlertOctagon, 
  Check, 
  CheckCheck, 
  X, 
  Edit3, 
  Sparkles, 
  Layers, 
  Scale, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

interface ImportExceptionsStagingProps {
  exceptions: ImportException[];
  categories: Category[];
  units: Unit[];
  settings: StoreSettings;
  lang: Language;
  onApproveException: (exception: ImportException, mappedCategory: string, mappedUnit: string) => Promise<void>;
  onIgnoreException: (exceptionId: string) => Promise<void>;
  onShowToast: (title: string, message: string, type: 'success' | 'warning' | 'error' | 'info') => void;
}

export const ImportExceptionsStaging: React.FC<ImportExceptionsStagingProps> = ({
  exceptions,
  categories,
  units,
  settings,
  lang,
  onApproveException,
  onIgnoreException,
  onShowToast
}) => {
  const t = translations[lang];

  // Inline mappings state per exception id
  const [categoryOverrides, setCategoryOverrides] = useState<{ [id: string]: string }>({});
  const [unitOverrides, setUnitOverrides] = useState<{ [id: string]: string }>({});

  const pendingExceptions = exceptions.filter((e) => e.status === 'pending');

  const handleApprove = async (exc: ImportException) => {
    const chosenCat = categoryOverrides[exc.id] || exc.rawRow.category || categories[0]?.name || 'General';
    const chosenUnit = unitOverrides[exc.id] || exc.rawRow.unit || units[0]?.shortCode || 'Pcs';

    await onApproveException(exc, chosenCat, chosenUnit);
    onShowToast('Approved', 'Item approved and migrated into live catalog!', 'success');
  };

  const handleApproveAll = async () => {
    for (const exc of pendingExceptions) {
      const chosenCat = categoryOverrides[exc.id] || exc.rawRow.category || categories[0]?.name || 'General';
      const chosenUnit = unitOverrides[exc.id] || exc.rawRow.unit || units[0]?.shortCode || 'Pcs';
      await onApproveException(exc, chosenCat, chosenUnit);
    }
    onShowToast('All Approved', `${pendingExceptions.length} exceptions approved into catalog!`, 'success');
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300 pb-16 md:pb-6">
      
      {/* Header Banner */}
      <div className="bg-slate-900/60 border border-slate-800/80 p-4.5 rounded-2xl backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-amber-400" />
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Import Staging & Master Catalog Exceptions
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Quarantine staging for imported Excel records with unmapped categories, custom units, or format irregularities.
          </p>
        </div>

        {pendingExceptions.length > 0 && (
          <button
            onClick={handleApproveAll}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-colors cursor-pointer"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Approve All ({pendingExceptions.length})</span>
          </button>
        )}
      </div>

      {pendingExceptions.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-12 text-center text-slate-400 backdrop-blur-md">
          <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">Staging Pipeline Clean</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            All imported catalog items and customer records have been reviewed, mapped, and synced to live storage.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendingExceptions.map((exc) => {
            const raw = exc.rawRow;
            return (
              <div
                key={exc.id}
                className="bg-slate-900/60 border border-amber-500/30 rounded-2xl p-4.5 backdrop-blur-md space-y-3 hover:border-amber-500/50 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    <span className="text-xs font-bold text-white">
                      {raw.productName || raw.shopName || 'Unmapped Excel Entry'}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      ID: {exc.id}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    Logged: {formatDateDDMMYYYY(exc.createdAt)}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
                  {/* Issue Reason & Fix */}
                  <div className="md:col-span-5 space-y-1">
                    <div className="text-rose-300 font-semibold flex items-center gap-1">
                      <span>Reason:</span> {exc.reason}
                    </div>
                    <div className="text-slate-400 text-[11px] leading-relaxed">
                      <span className="text-indigo-300 font-medium">Suggestion:</span> {exc.suggestedFix}
                    </div>
                  </div>

                  {/* Inline Mapping Controls */}
                  <div className="md:col-span-4 grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Map Category to:</label>
                      <select
                        value={categoryOverrides[exc.id] || raw.category || ''}
                        onChange={(e) => setCategoryOverrides({ ...categoryOverrides, [exc.id]: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Map Unit to:</label>
                      <select
                        value={unitOverrides[exc.id] || raw.unit || ''}
                        onChange={(e) => setUnitOverrides({ ...unitOverrides, [exc.id]: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white"
                      >
                        {units.map((u) => (
                          <option key={u.id} value={u.shortCode}>{u.shortCode}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="md:col-span-3 flex items-center justify-end gap-2">
                    <button
                      onClick={() => onIgnoreException(exc.id)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      Ignore
                    </button>

                    <button
                      onClick={() => handleApprove(exc)}
                      className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve to DB</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
