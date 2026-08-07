import React from 'react';
import { Transaction, Wallet, db } from '../db/db';
import { formatCurrency } from '../utils/format';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { ArrowDownLeft, ArrowUpRight, ArrowRightLeft, Trash2, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TransactionListProps {
  transactions: Transaction[];
  wallets: Wallet[];
  onEdit: (tx: Transaction) => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({ transactions, wallets, onEdit }) => {
  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (window.confirm("هل تريد بالتأكيد حذف هذه المعاملة؟ (يمكن استعادتها من سلة المحذوفات)")) {
      await db.softDeleteTransaction(id);
    }
  };

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <p>لا توجد معاملات</p>
      </div>
    );
  }

  const getWalletName = (id: number) => wallets.find(w => w.id === id)?.name || 'محفظة محذوفة';

  return (
    <div className="space-y-4">
      <AnimatePresence initial={false}>
        {transactions.map((tx) => (
          <motion.div 
            key={tx.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            onClick={() => onEdit(tx)}
            className="flex justify-between items-center p-3 bg-card/50 rounded-2xl border border-border hover:bg-border/50 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                tx.type === 'income' ? 'bg-emerald-500/20 text-emerald-500' :
                tx.type === 'expense' ? 'bg-rose-500/20 text-rose-500' :
                'bg-blue-500/20 text-blue-500'
              }`}>
                {tx.type === 'income' && <ArrowDownLeft size={20} />}
                {tx.type === 'expense' && <ArrowUpRight size={20} />}
                {tx.type === 'transfer' && <ArrowRightLeft size={20} />}
              </div>
              <div>
                <p className="text-sm font-bold text-foreground flex items-center gap-2">
                   {tx.category}
                </p>
                <p className="text-[10px] text-muted-foreground font-mono">
                  {format(new Date(tx.dateTime), 'hh:mm a', { locale: ar })} • {getWalletName(tx.walletId)}
                  {tx.type === 'transfer' && tx.toWalletId && ` إلى ${getWalletName(tx.toWalletId)}`}
                </p>
                {tx.notes && <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[150px] truncate">{tx.notes}</p>}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className={`font-mono text-sm font-black ${
                tx.type === 'income' ? 'text-emerald-500' :
                tx.type === 'expense' ? 'text-rose-500' :
                'text-blue-500'
              }`}>
                {tx.type === 'expense' ? '-' : tx.type === 'income' ? '+' : ''}{formatCurrency(tx.amount)}
              </span>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={(e) => handleDelete(e, tx.id!)}
                  className="text-muted-foreground hover:text-rose-500 transition-colors p-1"
                >
                   <Trash2 size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
