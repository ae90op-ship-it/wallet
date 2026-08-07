import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Transaction } from '../db/db';
import { formatCurrency } from '../utils/format';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { X, RefreshCcw, Trash2, Moon, Sun } from 'lucide-react';

interface SettingsManagerProps {
  onClose: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

export const SettingsManager: React.FC<SettingsManagerProps> = ({ onClose, isDarkMode, toggleTheme }) => {
  const deletedTransactions = useLiveQuery(
    () => db.transactions.filter(tx => !!tx.isDeleted).toArray(),
    []
  ) || [];

  const handleRestore = async (id: number) => {
    try {
      await db.restoreTransaction(id);
    } catch (e) {
      alert("فشلت عملية الاستعادة");
    }
  };

  const handlePermanentDelete = async (id: number) => {
    if (window.confirm("هل أنت متأكد من الحذف النهائي؟ لا يمكن التراجع عن هذا الإجراء.")) {
      await db.permanentDeleteTransaction(id);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-card border border-border rounded-[32px] w-full max-w-md shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">الإعدادات</h2>
          <button onClick={onClose} className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-8">
          
          {/* Theme Toggle */}
          <div>
             <h3 className="text-sm font-bold text-muted-foreground mb-4 uppercase tracking-widest">المظهر</h3>
             <button 
               onClick={toggleTheme}
               className="w-full flex items-center justify-between p-4 bg-muted rounded-2xl border border-border hover:bg-border/50 transition-colors"
             >
                <span className="font-bold text-foreground">{isDarkMode ? 'الوضع الداكن' : 'الوضع الفاتح'}</span>
                {isDarkMode ? <Moon className="text-accent" /> : <Sun className="text-accent" />}
             </button>
          </div>

          {/* Recycle Bin */}
          <div>
             <h3 className="text-sm font-bold text-muted-foreground mb-4 uppercase tracking-widest flex items-center justify-between">
                سلة المحذوفات
                <span className="bg-muted px-2 py-1 rounded-lg text-xs">{deletedTransactions.length}</span>
             </h3>
             
             {deletedTransactions.length === 0 ? (
               <div className="text-center py-8 text-muted-foreground bg-muted/50 rounded-2xl border border-dashed border-border">
                  <Trash2 size={32} className="mx-auto mb-2 opacity-50" />
                  <p>سلة المحذوفات فارغة</p>
               </div>
             ) : (
               <div className="space-y-3">
                 {deletedTransactions.map(tx => (
                    <div key={tx.id} className="p-4 bg-muted rounded-2xl border border-border flex flex-col gap-3">
                       <div className="flex justify-between items-center">
                          <div>
                             <p className="font-bold text-foreground">{tx.category}</p>
                             <p className="text-xs text-muted-foreground font-mono">{format(new Date(tx.dateTime), 'PP p', { locale: ar })}</p>
                          </div>
                          <span className={`font-mono font-bold ${tx.type === 'income' ? 'text-emerald-500' : tx.type === 'expense' ? 'text-rose-500' : 'text-blue-500'}`}>
                             {formatCurrency(tx.amount)}
                          </span>
                       </div>
                       <div className="flex gap-2">
                          <button onClick={() => handleRestore(tx.id!)} className="flex-1 flex items-center justify-center gap-2 py-2 bg-emerald-500/10 text-emerald-600 rounded-xl hover:bg-emerald-500/20 transition-colors font-semibold text-sm">
                             <RefreshCcw size={16} /> استعادة
                          </button>
                          <button onClick={() => handlePermanentDelete(tx.id!)} className="flex-1 flex items-center justify-center gap-2 py-2 bg-rose-500/10 text-rose-600 rounded-xl hover:bg-rose-500/20 transition-colors font-semibold text-sm">
                             <Trash2 size={16} /> حذف نهائي
                          </button>
                       </div>
                    </div>
                 ))}
               </div>
             )}
          </div>

        </div>
      </div>
    </div>
  );
};
