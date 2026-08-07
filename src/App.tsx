import React, { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Transaction } from './db/db';
import { getStartOfDayUTC, formatCurrency } from './utils/format';
import { MonthSelector } from './components/MonthSelector';
import { DaySelector } from './components/DaySelector';
import { RadialClock } from './components/RadialClock';
import { TransactionList } from './components/TransactionList';
import { AddTransactionForm } from './components/AddTransactionForm';
import { WalletManager } from './components/WalletManager';
import { ReportsManager } from './components/ReportsManager';
import { SettingsManager } from './components/SettingsManager';
import { Plus, Wallet as WalletIcon, FileText, Settings, Search } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function App() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showAddForm, setShowAddForm] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | undefined>(undefined);
  const [showWallets, setShowWallets] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Theme support
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') !== 'light'; // Default to dark
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const wallets = useLiveQuery(() => db.wallets.toArray(), []) || [];
  
  const startOfCurrentMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).getTime();
  const endOfCurrentMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0, 23, 59, 59).getTime();
  
  const monthTransactions = useLiveQuery(
    () => db.transactions.where('dateTime').between(startOfCurrentMonth, endOfCurrentMonth).filter(tx => !tx.isDeleted).toArray(),
    [selectedDate.getMonth(), selectedDate.getFullYear()]
  ) || [];

  const startOfSelectedDay = getStartOfDayUTC(selectedDate);
  const endOfSelectedDay = startOfSelectedDay + 86400000 - 1;

  // Filter for the day OR search results if active
  const displayTransactions = useMemo(() => {
    if (debouncedSearch) {
      const lowerQ = debouncedSearch.toLowerCase();
      // Search across all month transactions for now (or all DB, but sticking to month for performance)
      return monthTransactions.filter(tx => 
         (tx.notes && tx.notes.toLowerCase().includes(lowerQ)) || 
         (tx.category && tx.category.toLowerCase().includes(lowerQ))
      );
    }
    return monthTransactions.filter(tx => tx.dateTime >= startOfSelectedDay && tx.dateTime <= endOfSelectedDay);
  }, [monthTransactions, startOfSelectedDay, endOfSelectedDay, debouncedSearch]);

  const dailyTransactionsRaw = monthTransactions.filter(tx => tx.dateTime >= startOfSelectedDay && tx.dateTime <= endOfSelectedDay);

  const totalWealth = wallets.reduce((sum, w) => sum + w.balance, 0);

  const handleEditTx = (tx: Transaction) => {
    setEditTx(tx);
    setShowAddForm(true);
  };

  const handleAddClick = () => {
    setEditTx(undefined);
    setShowAddForm(true);
  };

  return (
    <div className="min-h-screen bg-background flex justify-center items-center w-full p-4 sm:p-6 transition-colors duration-300">
      <div className="w-full h-[90vh] max-w-md bg-card rounded-[48px] border-[8px] border-border shadow-2xl relative flex flex-col overflow-hidden">
        
        {/* Header */}
        <header className="bg-card p-6 relative z-10">
          <div className="flex justify-between items-center mb-6">
            <div>
               <h1 className="text-2xl font-black tracking-tight text-foreground">محفظتي</h1>
               <p className="text-accent text-sm font-semibold opacity-90">دقة متناهية. تخزين محلي.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowSettings(true)} className="p-2 bg-muted hover:bg-border rounded-full transition-colors text-foreground">
                <Settings size={20} />
              </button>
              <button onClick={() => setShowReports(true)} className="p-2 bg-muted hover:bg-border rounded-full transition-colors text-foreground">
                <FileText size={20} />
              </button>
              <button onClick={() => setShowWallets(true)} className="p-2 bg-muted hover:bg-border rounded-full transition-colors text-foreground">
                <WalletIcon size={20} />
              </button>
            </div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto pb-24 z-20">
          
          <MonthSelector selectedDate={selectedDate} onMonthChange={setSelectedDate} />
          
          <RadialClock 
             selectedDate={selectedDate} 
             transactions={dailyTransactionsRaw}
             totalWealth={totalWealth}
          />
          
          <DaySelector 
             currentDate={selectedDate} 
             selectedDate={selectedDate} 
             onDateSelect={setSelectedDate}
          />

          {/* Daily Transactions */}
          <div className="bg-muted rounded-t-[40px] p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] min-h-[300px]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                {debouncedSearch ? 'نتائج البحث' : 'سجل المعاملات'}
              </h2>
              <button onClick={() => setIsSearchActive(!isSearchActive)} className="text-muted-foreground hover:text-accent transition-colors">
                 <Search size={20} />
              </button>
            </div>

            {isSearchActive && (
               <div className="mb-4">
                 <input 
                   type="text"
                   value={searchQuery}
                   onChange={e => setSearchQuery(e.target.value)}
                   placeholder="ابحث في الملاحظات أو الفئة..."
                   className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-accent transition-colors"
                 />
               </div>
            )}
            
            <TransactionList transactions={displayTransactions} wallets={wallets} onEdit={handleEditTx} />
          </div>
        </main>

        {/* Floating Action Button */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <button
            onClick={handleAddClick}
            className="w-14 h-14 bg-accent rounded-2xl shadow-lg flex items-center justify-center text-3xl font-light cursor-pointer active:scale-95 transition-transform pointer-events-auto text-white shadow-accent/30"
          >
            <Plus size={32} />
          </button>
        </div>

        {/* Modals */}
        {showAddForm && (
          <AddTransactionForm 
            wallets={wallets} 
            selectedDate={selectedDate}
            editTx={editTx}
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
            transactions={monthTransactions}
            onClose={() => setShowReports(false)} 
          />
        )}
        {showSettings && (
          <SettingsManager 
            onClose={() => setShowSettings(false)}
            isDarkMode={isDarkMode}
            toggleTheme={() => setIsDarkMode(!isDarkMode)}
          />
        )}
      </div>
    </div>
  );
}
