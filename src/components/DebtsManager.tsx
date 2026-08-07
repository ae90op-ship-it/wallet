import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Debt, Wallet } from '../db/db';
import { formatCurrency, parseAmountToInteger, formatAmountFromInteger } from '../utils/format';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { X, Plus, CreditCard, ArrowDownLeft, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DebtsManagerProps {
  onClose: () => void;
  wallets: Wallet[];
}

export const DebtsManager: React.FC<DebtsManagerProps> = ({ onClose, wallets }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'to_me' | 'on_me'>('to_me');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  
  const [paymentDebtId, setPaymentDebtId] = useState<number | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentWalletId, setPaymentWalletId] = useState<number>(wallets[0]?.id || 0);

  const debts = useLiveQuery(() => db.debts.filter(d => !d.isDeleted).toArray(), []) || [];

  const handleAddDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !title) return;
    
    const amountInt = parseAmountToInteger(amount);
    const dateUtc = dueDate ? new Date(dueDate).getTime() : undefined;

    await db.debts.add({
      title,
      type,
      amount: amountInt,
      remaining: amountInt,
      dueDate: dateUtc,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isDeleted: false
    });
    
    await db.logActivity('add', 'debt', 0, `إضافة دين (${type === 'to_me' ? 'لك' : 'عليك'}): ${title} بمبلغ ${amount}`);
    
    setTitle('');
    setAmount('');
    setDueDate('');
    setShowAddForm(false);
  };

  const handlePayDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentAmount || !paymentDebtId || !paymentWalletId) return;

    const payAmountInt = parseAmountToInteger(paymentAmount);
    
    await db.transaction('rw', db.debts, db.wallets, db.transactions, db.activityLog, async () => {
      const debt = await db.debts.get(paymentDebtId);
      if (!debt) return;
      
      const newRemaining = Math.max(0, debt.remaining - payAmountInt);
      await db.debts.update(paymentDebtId, { remaining: newRemaining, updatedAt: Date.now() });

      // Create transaction
      const txType = debt.type === 'to_me' ? 'income' : 'expense';
      const txId = await db.transactions.add({
        walletId: paymentWalletId,
        amount: payAmountInt,
        type: txType,
        dateTime: Date.now(),
        category: `سداد دين: ${debt.title}`,
        notes: `دفعة من دين ${debt.title}`,
        isDeleted: false,
        updatedAt: Date.now()
      });

      // Update wallet
      const wallet = await db.wallets.get(paymentWalletId);
      if (wallet) {
        const newBalance = txType === 'income' ? wallet.balance + payAmountInt : wallet.balance - payAmountInt;
        await db.wallets.update(paymentWalletId, { balance: newBalance });
      }

      await db.logActivity('pay_debt', 'debt', paymentDebtId, `سداد مبلغ ${paymentAmount} من دين ${debt.title}`);
    });

    setPaymentDebtId(null);
    setPaymentAmount('');
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-card border border-border rounded-[32px] w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl overflow-hidden">
        
        <div className="flex justify-between items-center p-6 border-b border-border bg-card z-10">
          <div className="flex items-center gap-3">
             <CreditCard className="text-accent" size={24} />
             <h2 className="text-xl font-bold text-foreground">إدارة الديون والالتزامات</h2>
          </div>
          <button onClick={onClose} className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-foreground">الديون الحالية</h3>
            <button 
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-accent text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-accent/90 transition-colors shadow-sm"
            >
              <Plus size={16} /> إضافة دين
            </button>
          </div>

          <AnimatePresence>
            {showAddForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-8 bg-muted p-5 rounded-2xl border border-border overflow-hidden"
              >
                <form onSubmit={handleAddDebt} className="space-y-4">
                  <div className="flex bg-card p-1 rounded-xl">
                    <button type="button" onClick={() => setType('to_me')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${type === 'to_me' ? 'bg-emerald-500 text-white' : 'text-muted-foreground hover:bg-muted'}`}>دين لي (ديون خارجية)</button>
                    <button type="button" onClick={() => setType('on_me')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${type === 'on_me' ? 'bg-rose-500 text-white' : 'text-muted-foreground hover:bg-muted'}`}>دين علي (التزامات)</button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">اسم المديون / الدائن</label>
                      <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-card border border-border rounded-xl px-4 py-2 text-foreground focus:border-accent outline-none" placeholder="مثال: أحمد، قرض بنك..." />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">المبلغ الإجمالي</label>
                      <input type="number" required step="0.001" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-card border border-border rounded-xl px-4 py-2 text-foreground focus:border-accent outline-none" placeholder="0.00" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">تاريخ الاستحقاق (اختياري)</label>
                      <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full bg-card border border-border rounded-xl px-4 py-2 text-foreground focus:border-accent outline-none" />
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-2 mt-4">
                    <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 bg-card text-foreground rounded-xl text-sm font-bold border border-border">إلغاء</button>
                    <button type="submit" className="px-4 py-2 bg-accent text-white rounded-xl text-sm font-bold shadow-sm">حفظ الدين</button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-4">
            {debts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">لا توجد ديون مسجلة.</div>
            ) : (
              debts.map(debt => {
                const isPaid = debt.remaining <= 0;
                return (
                  <div key={debt.id} className="bg-card border border-border rounded-2xl p-4 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${debt.type === 'to_me' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'}`}>
                        {debt.type === 'to_me' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                      </div>
                      <div>
                        <h4 className="font-bold text-foreground flex items-center gap-2">
                          {debt.title}
                          {isPaid && <span className="bg-emerald-500/20 text-emerald-600 text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle2 size={12}/> مكتمل</span>}
                        </h4>
                        <div className="flex gap-4 text-xs mt-1">
                          <span className="text-muted-foreground">الإجمالي: <span className="font-bold text-foreground">{formatCurrency(debt.amount)}</span></span>
                          {!isPaid && <span className="text-accent">المتبقي: <span className="font-bold">{formatCurrency(debt.remaining)}</span></span>}
                        </div>
                        {debt.dueDate && !isPaid && (
                          <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                            تاريخ الاستحقاق: {format(new Date(debt.dueDate), 'PP', { locale: ar })}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {!isPaid ? (
                      paymentDebtId === debt.id ? (
                        <form onSubmit={handlePayDebt} className="flex gap-2 flex-col sm:flex-row bg-muted p-2 rounded-xl">
                          <input type="number" required step="0.001" placeholder="المبلغ..." value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} className="w-full sm:w-24 bg-card border border-border rounded-lg px-2 py-1.5 text-sm outline-none" />
                          <select value={paymentWalletId} onChange={e => setPaymentWalletId(Number(e.target.value))} className="w-full sm:w-28 bg-card border border-border rounded-lg px-2 py-1.5 text-sm outline-none">
                            {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                          </select>
                          <div className="flex gap-1">
                            <button type="submit" className="bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-sm font-bold shrink-0">سداد</button>
                            <button type="button" onClick={() => setPaymentDebtId(null)} className="bg-card border border-border px-2 py-1.5 rounded-lg text-sm">إلغاء</button>
                          </div>
                        </form>
                      ) : (
                        <button onClick={() => { setPaymentDebtId(debt.id!); setPaymentAmount(formatAmountFromInteger(debt.remaining)); }} className="self-start md:self-auto bg-muted hover:bg-border transition-colors text-foreground px-4 py-2 rounded-xl text-sm font-bold border border-border">
                          تسديد دفعة
                        </button>
                      )
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
