import React, { useState } from 'react';
import { db, Wallet } from '../db/db';
import { parseAmountToInteger } from '../utils/format';
import { X } from 'lucide-react';

interface AddTransactionFormProps {
  wallets: Wallet[];
  selectedDate: Date;
  onClose: () => void;
}

export const AddTransactionForm: React.FC<AddTransactionFormProps> = ({ wallets, selectedDate, onClose }) => {
  const [type, setType] = useState<'income' | 'expense' | 'transfer'>('expense');
  const [amount, setAmount] = useState('');
  const [walletId, setWalletId] = useState(wallets[0]?.id || 0);
  const [toWalletId, setToWalletId] = useState(wallets.length > 1 ? wallets[1].id || 0 : 0);
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!walletId) {
      setError('يرجى إنشاء محفظة أولاً');
      return;
    }

    // Validation for max 3 decimals
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
      // Use current time but selected day
      const now = new Date();
      const txDate = new Date(selectedDate);
      txDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
      const dateUtc = txDate.getTime();

      if (type === 'transfer') {
        if (walletId === toWalletId) {
          setError('لا يمكن التحويل لنفس المحفظة');
          return;
        }
        await db.performTransfer(walletId, toWalletId, amountInt, dateUtc, notes);
      } else {
        await db.addTransaction(walletId, amountInt, type, dateUtc, category, notes);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء الحفظ');
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0a0b0d]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#1e2229] border border-[#303640] rounded-[32px] w-full max-w-md p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-100">إضافة معاملة</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-[#303640] rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex bg-[#14161a] p-1 rounded-2xl mb-6">
          {(['expense', 'income', 'transfer'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-colors ${
                type === t 
                  ? t === 'income' ? 'bg-[#10b981] text-white shadow-sm' : t === 'expense' ? 'bg-[#ef4444] text-white shadow-sm' : 'bg-blue-500 text-white shadow-sm'
                  : 'text-gray-400 hover:bg-[#25282e]'
              }`}
            >
              {t === 'income' ? 'دخل' : t === 'expense' ? 'مصروف' : 'تحويل'}
            </button>
          ))}
        </div>

        {error && <div className="bg-[#ef4444]/20 border border-[#ef4444]/30 text-[#ef4444] p-3 rounded-xl mb-4 text-sm font-semibold">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-400 mb-1">المبلغ</label>
            <input
              type="number"
              step="0.001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-[#14161a] border border-[#303640] rounded-xl px-4 py-3 text-lg font-bold text-gray-100 focus:outline-none focus:border-[#f59e0b] transition-colors"
              placeholder="0.000"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-400 mb-1">من محفظة</label>
            <select
              value={walletId}
              onChange={(e) => setWalletId(Number(e.target.value))}
              className="w-full bg-[#14161a] border border-[#303640] rounded-xl px-4 py-3 text-gray-100 focus:outline-none focus:border-[#f59e0b] transition-colors"
            >
              {wallets.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          {type === 'transfer' && (
            <div>
              <label className="block text-sm font-semibold text-gray-400 mb-1">إلى محفظة</label>
              <select
                value={toWalletId}
                onChange={(e) => setToWalletId(Number(e.target.value))}
                className="w-full bg-[#14161a] border border-[#303640] rounded-xl px-4 py-3 text-gray-100 focus:outline-none focus:border-[#f59e0b] transition-colors"
              >
                {wallets.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          )}

          {type !== 'transfer' && (
            <div>
              <label className="block text-sm font-semibold text-gray-400 mb-1">الفئة</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#14161a] border border-[#303640] rounded-xl px-4 py-3 text-gray-100 focus:outline-none focus:border-[#f59e0b] transition-colors"
                placeholder="مثال: طعام، راتب، وقود..."
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-400 mb-1">ملاحظات (اختياري)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#14161a] border border-[#303640] rounded-xl px-4 py-3 text-gray-100 focus:outline-none focus:border-[#f59e0b] transition-colors resize-none h-20"
              placeholder="أي تفاصيل إضافية..."
            />
          </div>

          <button
            type="submit"
            className="w-full bg-[#f59e0b] text-white font-bold py-4 rounded-xl hover:bg-[#d97706] transition-colors shadow-lg shadow-[#f59e0b]/20"
          >
            حفظ المعاملة
          </button>
        </form>
      </div>
    </div>
  );
};
