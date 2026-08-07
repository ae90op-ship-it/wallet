import React, { useState, useEffect } from 'react';
import { db, Wallet, Transaction } from '../db/db';
import { parseAmountToInteger, formatAmountFromInteger } from '../utils/format';
import { X, Tag } from 'lucide-react';

interface AddTransactionFormProps {
  wallets: Wallet[];
  selectedDate: Date;
  onClose: () => void;
  editTx?: Transaction;
}

const PRESET_CATEGORIES = ['طعام', 'مواصلات', 'تسوق', 'راتب', 'فواتير', 'صحة', 'ترفيه', 'أخرى'];

export const AddTransactionForm: React.FC<AddTransactionFormProps> = ({ wallets, selectedDate, onClose, editTx }) => {
  const [type, setType] = useState<'income' | 'expense' | 'transfer'>('expense');
  const [amount, setAmount] = useState('');
  const [walletId, setWalletId] = useState(wallets[0]?.id || 0);
  const [toWalletId, setToWalletId] = useState(wallets.length > 1 ? wallets[1].id || 0 : 0);
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (editTx) {
      setType(editTx.type);
      setAmount(formatAmountFromInteger(editTx.amount));
      setWalletId(editTx.walletId);
      if (editTx.toWalletId) setToWalletId(editTx.toWalletId);
      setCategory(editTx.category);
      setNotes(editTx.notes);
    }
  }, [editTx]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!walletId) {
      setError('يرجى إنشاء محفظة أولاً');
      return;
    }

    if (!/^\d+(\.\d{1,3})?$/.test(amount)) {
      setError('المبلغ غير صحيح. مسموح بحد أقصى 3 أرقام عشرية.');
      return;
    }

    const amountInt = parseAmountToInteger(amount);
    if (amountInt <= 0) {
      setError('يجب أن يكون المبلغ أكبر من صفر');
      return;
    }

    if (!category.trim() && type !== 'transfer') {
      setError('يرجى إدخال الفئة');
      return;
    }

    try {
      const txDate = editTx ? new Date(editTx.dateTime) : new Date(selectedDate);
      if (!editTx) {
        const now = new Date();
        txDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
      }
      const dateUtc = txDate.getTime();

      if (editTx && editTx.id) {
         await db.editTransaction(editTx.id, walletId, amountInt, type, dateUtc, category, notes, type === 'transfer' ? toWalletId : undefined);
      } else {
        if (type === 'transfer') {
          if (walletId === toWalletId) {
            setError('لا يمكن التحويل لنفس المحفظة');
            return;
          }
          await db.performTransfer(walletId, toWalletId, amountInt, dateUtc, notes);
        } else {
          await db.addTransaction(walletId, amountInt, type, dateUtc, category, notes);
        }
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء الحفظ');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-card border border-border rounded-[32px] w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-foreground">{editTx ? 'تعديل المعاملة' : 'إضافة معاملة'}</h2>
          <button onClick={onClose} className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex bg-muted p-1 rounded-2xl mb-6">
          {(['expense', 'income', 'transfer'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-colors ${
                type === t 
                  ? t === 'income' ? 'bg-[#10b981] text-white shadow-sm' : t === 'expense' ? 'bg-[#ef4444] text-white shadow-sm' : 'bg-blue-500 text-white shadow-sm'
                  : 'text-muted-foreground hover:bg-background'
              }`}
            >
              {t === 'income' ? 'دخل' : t === 'expense' ? 'مصروف' : 'تحويل'}
            </button>
          ))}
        </div>

        {error && <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-3 rounded-xl mb-4 text-sm font-semibold">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-muted-foreground mb-1">المبلغ</label>
            <input
              type="number"
              step="0.001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-lg font-bold text-foreground focus:outline-none focus:border-accent transition-colors"
              placeholder="0.000"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-muted-foreground mb-1">من محفظة</label>
            <select
              value={walletId}
              onChange={(e) => setWalletId(Number(e.target.value))}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-accent transition-colors"
            >
              {wallets.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          {type === 'transfer' && (
            <div>
              <label className="block text-sm font-semibold text-muted-foreground mb-1">إلى محفظة</label>
              <select
                value={toWalletId}
                onChange={(e) => setToWalletId(Number(e.target.value))}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-accent transition-colors"
              >
                {wallets.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          )}

          {type !== 'transfer' && (
            <div>
              <label className="block text-sm font-semibold text-muted-foreground mb-1 flex items-center justify-between">
                الفئة
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                 {PRESET_CATEGORIES.map(cat => (
                   <button
                     key={cat}
                     type="button"
                     onClick={() => setCategory(cat)}
                     className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                        category === cat ? 'bg-accent/20 border-accent/50 text-accent' : 'bg-muted border-border text-muted-foreground hover:bg-background'
                     }`}
                   >
                     {cat}
                   </button>
                 ))}
              </div>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-accent transition-colors"
                placeholder="أو اكتب فئة مخصصة..."
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-muted-foreground mb-1">ملاحظات (اختياري)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-accent transition-colors resize-none h-20"
              placeholder="أي تفاصيل إضافية..."
            />
          </div>

          <button
            type="submit"
            className="w-full bg-accent text-white font-bold py-4 rounded-xl hover:bg-accent/90 transition-colors shadow-lg shadow-accent/20 mt-2"
          >
            {editTx ? 'حفظ التعديلات' : 'حفظ المعاملة'}
          </button>
        </form>
      </div>
    </div>
  );
};
