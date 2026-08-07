import React, { useState } from 'react';
import { Transaction, Wallet, db } from '../db/db';
import { formatCurrency, formatAmountFromInteger, parseAmountToInteger } from '../utils/format';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { ArrowDownLeft, ArrowUpRight, ArrowRightLeft, Plus } from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  wallets: Wallet[];
}

export const TransactionList: React.FC<TransactionListProps> = ({ transactions, wallets }) => {
  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-500">
        <p>لا توجد معاملات في هذا اليوم</p>
      </div>
    );
  }

  const getWalletName = (id: number) => wallets.find(w => w.id === id)?.name || 'محفظة محذوفة';

  return (
    <div className="space-y-4">
      {transactions.map((tx) => (
        <div key={tx.id} className="flex justify-between items-center p-3 bg-[#14161a]/50 rounded-2xl border border-[#303640]">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              tx.type === 'income' ? 'bg-[#10b981]/20 text-[#10b981]' :
              tx.type === 'expense' ? 'bg-[#ef4444]/20 text-[#ef4444]' :
              'bg-blue-500/20 text-blue-400'
            }`}>
              {tx.type === 'income' && <ArrowDownLeft size={20} />}
              {tx.type === 'expense' && <ArrowUpRight size={20} />}
              {tx.type === 'transfer' && <ArrowRightLeft size={20} />}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-200">{tx.category}</p>
              <p className="text-[10px] text-gray-500 font-mono">
                {format(new Date(tx.dateTime), 'hh:mm a', { locale: ar })} • {getWalletName(tx.walletId)}
                {tx.type === 'transfer' && tx.toWalletId && ` إلى ${getWalletName(tx.toWalletId)}`}
              </p>
              {tx.notes && <p className="text-[10px] text-gray-500 mt-0.5">{tx.notes}</p>}
            </div>
          </div>
          <span className={`font-mono text-sm font-bold ${
            tx.type === 'income' ? 'text-[#10b981]' :
            tx.type === 'expense' ? 'text-[#ef4444]' :
            'text-blue-400'
          }`}>
            {tx.type === 'expense' ? '-' : tx.type === 'income' ? '+' : ''}{formatCurrency(tx.amount)}
          </span>
        </div>
      ))}
    </div>
  );
};
