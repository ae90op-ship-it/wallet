import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/db';
import { getStartOfDayUTC, formatCurrency } from './utils/format';
import { CircularCalendar } from './components/CircularCalendar';
import { TransactionList } from './components/TransactionList';
import { AddTransactionForm } from './components/AddTransactionForm';
import { WalletManager } from './components/WalletManager';
import { ReportsManager } from './components/ReportsManager';
import { Plus, Wallet as WalletIcon, FileText, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export default function App() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showAddForm, setShowAddForm] = useState(false);
  const [showWallets, setShowWallets] = useState(false);
  const [showReports, setShowReports] = useState(false);

  // Use Dexie live queries for reactivity
  const wallets = useLiveQuery(() => db.wallets.toArray(), []) || [];
  
  // Get all transactions for the current month to compute day markers
  const startOfCurrentMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).getTime();
  const endOfCurrentMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0, 23, 59, 59).getTime();
  
  const monthTransactions = useLiveQuery(
    () => db.transactions.where('dateTime').between(startOfCurrentMonth, endOfCurrentMonth).toArray(),
    [selectedDate.getMonth(), selectedDate.getFullYear()]
  ) || [];

  // Compute day markers for the circular calendar
  const dayMarkers = useMemo(() => {
    const markers: Record<number, { hasIncome: boolean; hasExpense: boolean }> = {};
    monthTransactions.forEach(tx => {
      const day = new Date(tx.dateTime).getDate();
      if (!markers[day]) markers[day] = { hasIncome: false, hasExpense: false };
      if (tx.type === 'income') markers[day].hasIncome = true;
      if (tx.type === 'expense') markers[day].hasExpense = true;
    });
    return markers;
  }, [monthTransactions]);

  // Filter transactions for the selected day
  const startOfSelectedDay = getStartOfDayUTC(selectedDate);
  const endOfSelectedDay = startOfSelectedDay + 86400000 - 1; // End of day
  const dailyTransactions = monthTransactions.filter(tx => tx.dateTime >= startOfSelectedDay && tx.dateTime <= endOfSelectedDay);

  const totalWealth = wallets.reduce((sum, w) => sum + w.balance, 0);

  return (
    <div className="min-h-screen bg-[#0a0b0d] flex justify-center items-center w-full p-4 sm:p-6">
      <div className="w-full h-[90vh] max-w-md bg-[#14161a] rounded-[48px] border-[8px] border-[#25282e] shadow-2xl relative flex flex-col overflow-hidden">
        
        {/* Header */}
        <header className="bg-[#14161a] p-6 relative z-10">
          <div className="flex justify-between items-center mb-6">
            <div>
               <h1 className="text-2xl font-black tracking-tight text-gray-100">محفظتي</h1>
               <p className="text-[#f59e0b] text-sm font-semibold opacity-90">دقة متناهية. تخزين محلي.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowReports(true)} className="p-2 bg-[#25282e] hover:bg-[#303640] rounded-full transition-colors text-gray-300">
                <FileText size={20} />
              </button>
              <button onClick={() => setShowWallets(true)} className="p-2 bg-[#25282e] hover:bg-[#303640] rounded-full transition-colors text-gray-300">
                <WalletIcon size={20} />
              </button>
            </div>
          </div>
          <div className="text-center pb-2 flex flex-col">
            <span className="text-gray-400 text-sm mb-1 uppercase tracking-widest font-semibold">إجمالي الثروة الكلية</span>
            <span className="text-4xl font-black tracking-tight text-[#f59e0b]">{formatCurrency(totalWealth)}</span>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto pb-24 px-4 sm:px-6 z-20">
          
          {/* Circular Calendar View */}
          <div className="mb-8 flex justify-center">
            <CircularCalendar 
              currentDate={selectedDate} 
              selectedDate={selectedDate} 
              onDateSelect={setSelectedDate}
              dayMarkers={dayMarkers}
            />
          </div>

          {/* Daily Transactions */}
          <div className="bg-[#1e2229] rounded-t-[40px] p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.4)] min-h-[300px] mt-4 mx-[-16px] sm:mx-[-24px]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2">
                سجل المعاملات
              </h2>
              <span className="text-sm font-bold text-[#f59e0b]">
                {format(selectedDate, 'PPP', { locale: ar })}
              </span>
            </div>
            
            <TransactionList transactions={dailyTransactions} wallets={wallets} />
          </div>
        </main>

        {/* Floating Action Button */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <button
            onClick={() => setShowAddForm(true)}
            className="w-14 h-14 bg-[#f59e0b] rounded-2xl shadow-lg flex items-center justify-center text-3xl font-light cursor-pointer active:scale-95 transition-transform pointer-events-auto text-white"
          >
            <Plus size={32} />
          </button>
        </div>

        {/* Modals */}
        {showAddForm && (
          <AddTransactionForm 
            wallets={wallets} 
            selectedDate={selectedDate}
            onClose={() => setShowAddForm(false)} 
          />
        )}
        {showWallets && (
          <WalletManager 
            wallets={wallets} 
            onClose={() => setShowWallets(false)} 
          />
        )}
        {showReports && (
          <ReportsManager 
            wallets={wallets} 
            transactions={monthTransactions} // Passing month tx for the report preview
            onClose={() => setShowReports(false)} 
          />
        )}
      </div>
    </div>
  );
}
