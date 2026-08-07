import React, { useRef, useState, useMemo } from 'react';
import { db, Wallet, Transaction } from '../db/db';
import { formatCurrency, formatAmountFromInteger } from '../utils/format';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, subYears, isWithinInterval } from 'date-fns';
import { ar } from 'date-fns/locale';
import { X, Printer, Download, Upload } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, LineChart, Line, CartesianGrid } from 'recharts';
import { useSettings } from '../hooks/useSettings';

interface ReportsManagerProps {
  wallets: Wallet[];
  transactions: Transaction[];
  onClose: () => void;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e', '#64748b'];

export const ReportsManager: React.FC<ReportsManagerProps> = ({ wallets, transactions, onClose }) => {
  const { settings } = useSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [period, setPeriod] = useState(settings.defaultReportPeriod || 'this_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const totalWealth = wallets.reduce((acc, w) => acc + w.balance, 0);

  const getWeekOptions = () => {
    return { weekStartsOn: settings.weekStartDay === 'saturday' ? 6 : settings.weekStartDay === 'sunday' ? 0 : 1 } as const;
  };

  const periodInterval = useMemo(() => {
    const now = new Date();
    switch (period) {
      case 'today':
        return { start: new Date(now.setHours(0,0,0,0)), end: new Date(now.setHours(23,59,59,999)) };
      case 'this_week':
        return { start: startOfWeek(now, getWeekOptions()), end: endOfWeek(now, getWeekOptions()) };
      case 'last_week':
        const lastW = subDays(now, 7);
        return { start: startOfWeek(lastW, getWeekOptions()), end: endOfWeek(lastW, getWeekOptions()) };
      case 'this_month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'last_month':
        const lastM = subMonths(now, 1);
        return { start: startOfMonth(lastM), end: endOfMonth(lastM) };
      case 'last_7_days':
        return { start: subDays(now, 7), end: now };
      case 'last_30_days':
        return { start: subDays(now, 30), end: now };
      case 'this_year':
        return { start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear(), 11, 31, 23, 59, 59) };
      case 'last_year':
        return { start: new Date(now.getFullYear()-1, 0, 1), end: new Date(now.getFullYear()-1, 11, 31, 23, 59, 59) };
      case 'custom':
        if (customStart && customEnd) {
          return { start: new Date(customStart), end: new Date(new Date(customEnd).setHours(23,59,59)) };
        }
    }
    return { start: startOfMonth(now), end: endOfMonth(now) };
  }, [period, customStart, customEnd, settings.weekStartDay]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      if (tx.isDeleted) return false;
      return isWithinInterval(new Date(tx.dateTime), periodInterval);
    });
  }, [transactions, periodInterval]);

  const periodIncome = filteredTransactions.filter(tx => tx.type === 'income').reduce((acc, tx) => acc + tx.amount, 0);
  const periodExpense = filteredTransactions.filter(tx => tx.type === 'expense').reduce((acc, tx) => acc + tx.amount, 0);
  const netBalance = periodIncome - periodExpense;

  const expensesByCategory = filteredTransactions
    .filter(tx => tx.type === 'expense')
    .reduce((acc, tx) => {
      acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
      return acc;
    }, {} as Record<string, number>);

  const pieData = Object.entries(expensesByCategory).map(([name, value]) => ({
    name,
    value: parseFloat(formatAmountFromInteger(value))
  })).sort((a, b) => b.value - a.value);
  
  // Daily data for bar chart
  const dailyExpenses = useMemo(() => {
    const map = new Map<string, number>();
    filteredTransactions.filter(tx => tx.type === 'expense').forEach(tx => {
      const dateStr = format(new Date(tx.dateTime), 'MMM d', { locale: ar });
      map.set(dateStr, (map.get(dateStr) || 0) + parseFloat(formatAmountFromInteger(tx.amount)));
    });
    return Array.from(map.entries()).map(([date, amount]) => ({ date, amount })).reverse();
  }, [filteredTransactions]);

  const handlePrint = () => {
    window.print();
  };

  const handleBackup = async () => {
    try {
      const w = await db.wallets.toArray();
      const t = await db.transactions.toArray();
      const backupData = { wallets: w, transactions: t, exportedAt: Date.now() };
      const blob = new Blob([JSON.stringify(backupData)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_wallet_${format(new Date(), 'yyyy-MM-dd')}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("حدث خطأ أثناء النسخ الاحتياطي");
    }
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.wallets && data.transactions) {
          if (window.confirm("تحذير: سيتم مسح جميع البيانات الحالية. هل أنت متأكد؟")) {
            await db.transaction('rw', db.wallets, db.transactions, async () => {
              await db.wallets.clear();
              await db.transactions.clear();
              await db.wallets.bulkAdd(data.wallets);
              await db.transactions.bulkAdd(data.transactions);
            });
            alert("تم استعادة البيانات بنجاح!");
            window.location.reload();
          }
        }
      } catch (err) {
        alert("فشل قراءة الملف.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-md flex items-center justify-center p-0 md:p-4 z-50 overflow-y-auto print:static print:bg-white print:p-0 print:block">
      <div className="bg-card md:border border-border md:rounded-[32px] w-full max-w-5xl min-h-screen md:min-h-0 md:shadow-2xl flex flex-col print:shadow-none print:border-none print:w-full print:block">
        
        <div className="flex justify-between items-center p-6 border-b border-border sticky top-0 bg-card z-10 no-print">
          <h2 className="text-xl font-bold text-foreground">التقارير والإحصائيات</h2>
          <div className="flex gap-2">
             <button onClick={handlePrint} className="flex items-center gap-2 bg-accent text-white px-4 py-2 rounded-xl hover:bg-accent/90 transition-colors font-bold text-sm shadow-sm">
               <Printer size={18} /> طباعة PDF
             </button>
             <button onClick={onClose} className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors">
               <X size={20} />
             </button>
          </div>
        </div>

        <div className="p-4 md:p-6 overflow-y-auto flex-1 print:p-0 print:overflow-visible">
          
          {/* Controls - No print */}
          <div className="mb-6 space-y-4 no-print">
            <div className="flex flex-wrap gap-2 items-center bg-muted p-2 rounded-2xl">
              <select value={period} onChange={e => setPeriod(e.target.value)} className="bg-card border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent">
                <option value="today">اليوم</option>
                <option value="this_week">هذا الأسبوع</option>
                <option value="last_week">الأسبوع السابق</option>
                <option value="this_month">هذا الشهر</option>
                <option value="last_month">الشهر السابق</option>
                <option value="last_7_days">آخر 7 أيام</option>
                <option value="last_30_days">آخر 30 يوم</option>
                <option value="this_year">هذه السنة</option>
                <option value="last_year">السنة السابقة</option>
                <option value="custom">مخصص</option>
              </select>
              {period === 'custom' && (
                <div className="flex gap-2 items-center">
                  <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="bg-card border border-border rounded-xl px-2 py-2 text-sm" />
                  <span>إلى</span>
                  <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="bg-card border border-border rounded-xl px-2 py-2 text-sm" />
                </div>
              )}
            </div>
          </div>

          {/* Report Content - This gets printed */}
          <div className="print-only mb-6 hidden">
            <h1 className="text-3xl font-black text-center mb-2">تقرير محفظتي</h1>
            <p className="text-center text-gray-500 mb-8">
              الفترة من {format(periodInterval.start, 'yyyy/MM/dd')} إلى {format(periodInterval.end, 'yyyy/MM/dd')}
            </p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
             <div className="bg-card border border-border p-4 rounded-2xl shadow-sm">
                <p className="text-xs text-muted-foreground mb-1">إجمالي الدخل</p>
                <p className="text-lg md:text-xl font-black text-emerald-500">{formatCurrency(periodIncome)}</p>
             </div>
             <div className="bg-card border border-border p-4 rounded-2xl shadow-sm">
                <p className="text-xs text-muted-foreground mb-1">إجمالي المصروفات</p>
                <p className="text-lg md:text-xl font-black text-rose-500">{formatCurrency(periodExpense)}</p>
             </div>
             <div className="bg-card border border-border p-4 rounded-2xl shadow-sm">
                <p className="text-xs text-muted-foreground mb-1">صافي الرصيد للفترة</p>
                <p className={`text-lg md:text-xl font-black ${netBalance >= 0 ? 'text-accent' : 'text-rose-500'}`}>{formatCurrency(netBalance)}</p>
             </div>
             <div className="bg-card border border-border p-4 rounded-2xl shadow-sm">
                <p className="text-xs text-muted-foreground mb-1">عدد المعاملات</p>
                <p className="text-lg md:text-xl font-black text-foreground">{filteredTransactions.length}</p>
             </div>
          </div>

          {settings.showCharts && pieData.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 page-break-inside-avoid">
              <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
                <h3 className="text-sm font-bold text-foreground mb-4">توزيع المصروفات (مخطط دائري)</h3>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                        {pieData.map((_, idx) => <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(value: number) => [value, 'المبلغ']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
                <h3 className="text-sm font-bold text-foreground mb-4">المصروفات اليومية (أعمدة)</h3>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyExpenses}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="date" tick={{fontSize: 12, fill: 'var(--muted-foreground)'}} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{backgroundColor: 'var(--card)', borderColor: 'var(--border)'}} />
                      <Bar dataKey="amount" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 page-break-inside-avoid">
            {/* Category Details */}
            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
              <h3 className="text-sm font-bold text-foreground p-4 bg-muted/30 border-b border-border">تفاصيل الفئات</h3>
              <div className="p-4 space-y-3">
                {pieData.map((item, idx) => {
                  const percentage = ((item.value * 1000) / periodExpense) * 100;
                  return (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[idx % COLORS.length]}}></div>
                        <span className="font-bold text-foreground">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-mono text-muted-foreground">{item.value}</span>
                        {settings.showPercentages && <span className="font-mono font-bold w-12 text-left">{percentage.toFixed(1)}%</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Wallet Balances */}
            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
              <h3 className="text-sm font-bold text-foreground p-4 bg-muted/30 border-b border-border">أرصدة المحافظ الحالية</h3>
              <div className="p-4 space-y-3">
                {wallets.map(w => (
                  <div key={w.id} className="flex justify-between items-center text-sm border-b border-dashed border-border pb-2 last:border-0">
                    <span className="font-bold text-foreground">{w.name}</span>
                    <span className="font-mono font-bold text-foreground">{formatCurrency(w.balance)}</span>
                  </div>
                ))}
                <div className="pt-2 flex justify-between items-center text-sm">
                  <span className="font-black text-foreground">الإجمالي الكلي</span>
                  <span className="font-mono font-black text-accent">{formatCurrency(totalWealth)}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 no-print grid grid-cols-2 gap-4">
             <button onClick={handleBackup} className="flex flex-col items-center justify-center gap-2 p-4 bg-muted text-blue-500 rounded-2xl hover:bg-border transition-colors border border-blue-500/30">
                <Download size={24} />
                <span className="font-bold text-xs">تصدير (JSON)</span>
             </button>
             <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center gap-2 p-4 bg-muted text-accent rounded-2xl hover:bg-border transition-colors border border-accent/30">
                <Upload size={24} />
                <span className="font-bold text-xs">استيراد (JSON)</span>
             </button>
             <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleRestore} />
          </div>

        </div>
      </div>
    </div>
  );
};
