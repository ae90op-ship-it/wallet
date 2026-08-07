import React, { useRef, useState } from 'react';
import { db, Wallet, Transaction } from '../db/db';
import { formatCurrency, formatAmountFromInteger } from '../utils/format';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { X, FileDown, Download, Upload } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface ReportsManagerProps {
  wallets: Wallet[];
  transactions: Transaction[];
  onClose: () => void;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e', '#64748b'];

export const ReportsManager: React.FC<ReportsManagerProps> = ({ wallets, transactions, onClose }) => {
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalWealth = wallets.reduce((acc, w) => acc + w.balance, 0);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const monthTransactions = transactions.filter(tx => {
    const d = new Date(tx.dateTime);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear && !tx.isDeleted;
  });

  const monthIncome = monthTransactions.filter(tx => tx.type === 'income').reduce((acc, tx) => acc + tx.amount, 0);
  const monthExpense = monthTransactions.filter(tx => tx.type === 'expense').reduce((acc, tx) => acc + tx.amount, 0);

  const expensesByCategory = monthTransactions
    .filter(tx => tx.type === 'expense')
    .reduce((acc, tx) => {
      acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
      return acc;
    }, {} as Record<string, number>);

  const pieData = Object.entries(expensesByCategory).map(([name, value]) => ({
    name,
    value: parseFloat(formatAmountFromInteger(value))
  })).sort((a, b) => b.value - a.value);

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`تقرير_محفظتي_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (e) {
      console.error("PDF Export failed", e);
      alert("فشل تصدير PDF.");
    } finally {
      setIsExporting(false);
    }
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-card border border-border rounded-[32px] w-full max-w-4xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="flex justify-between items-center mb-6 sticky top-0 bg-card py-2 z-10 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">التقارير والإحصائيات</h2>
          <div className="flex gap-2">
             <button onClick={handleExportPDF} disabled={isExporting} className="flex items-center gap-2 bg-accent text-white px-4 py-2 rounded-xl hover:bg-accent/90 transition-colors font-bold text-sm shadow-sm">
               <FileDown size={18} />
               {isExporting ? 'جاري التصدير...' : 'تصدير PDF'}
             </button>
             <button onClick={onClose} className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors">
               <X size={20} />
             </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="bg-muted p-6 rounded-2xl border border-border">
               <h3 className="text-sm font-bold text-muted-foreground mb-4">ملخص شهر {format(new Date(), 'MMMM', { locale: ar })}</h3>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">الإيرادات</p>
                    <p className="text-xl font-bold text-emerald-500">{formatCurrency(monthIncome)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">المصروفات</p>
                    <p className="text-xl font-bold text-rose-500">{formatCurrency(monthExpense)}</p>
                  </div>
               </div>
            </div>

            <div className="bg-muted p-6 rounded-2xl border border-border">
               <h3 className="text-sm font-bold text-muted-foreground mb-4">أرصدة المحافظ</h3>
               <div className="space-y-3">
                 {wallets.map(w => (
                   <div key={w.id} className="flex justify-between items-center">
                     <span className="font-bold text-foreground">{w.name}</span>
                     <span className="font-mono text-muted-foreground">{formatCurrency(w.balance)}</span>
                   </div>
                 ))}
               </div>
               <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
                  <span className="font-bold text-foreground">الإجمالي</span>
                  <span className="text-xl font-bold text-accent">{formatCurrency(totalWealth)}</span>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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

          <div className="bg-muted p-6 rounded-2xl border border-border flex flex-col">
             <h3 className="text-sm font-bold text-muted-foreground mb-4">توزيع المصروفات (هذا الشهر)</h3>
             {pieData.length > 0 ? (
               <div className="flex-1 min-h-[300px]">
                 <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                     <Pie
                       data={pieData}
                       cx="50%"
                       cy="50%"
                       innerRadius={60}
                       outerRadius={90}
                       paddingAngle={5}
                       dataKey="value"
                     >
                       {pieData.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                       ))}
                     </Pie>
                     <Tooltip 
                       formatter={(value: number) => [`$${value.toFixed(2)}`, 'المبلغ']}
                       contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--card)' }}
                       itemStyle={{ color: 'var(--foreground)' }}
                     />
                     <Legend />
                   </PieChart>
                 </ResponsiveContainer>
               </div>
             ) : (
               <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                 لا توجد مصروفات مسجلة هذا الشهر
               </div>
             )}
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-6">
          <p className="text-sm text-muted-foreground mb-4 text-center">معاينة التقرير (أبيض للخلفية)</p>
          <div style={{ backgroundColor: '#ffffff', color: '#0f172a', border: '1px solid #e2e8f0' }} className="p-8 rounded-lg shadow-sm" ref={reportRef} dir="rtl">
             <h1 className="text-2xl font-black mb-6 text-center pb-4" style={{ color: '#0f172a', borderBottom: '1px solid #e2e8f0' }}>تقرير محفظتي</h1>
             <div className="flex justify-between items-center mb-8">
                <div>
                   <p className="text-sm" style={{ color: '#64748b' }}>تاريخ التقرير</p>
                   <p className="font-bold" style={{ color: '#1e293b' }}>{format(new Date(), 'PPP', { locale: ar })}</p>
                </div>
                <div className="text-left">
                   <p className="text-sm" style={{ color: '#64748b' }}>إجمالي الثروة</p>
                   <p className="text-xl font-bold" style={{ color: '#059669' }}>{formatCurrency(totalWealth)}</p>
                </div>
             </div>

             <div className="mb-8">
               <h2 className="text-lg font-bold mb-4 pb-2" style={{ color: '#1e293b', borderBottom: '1px solid #e2e8f0' }}>المحافظ</h2>
               {wallets.map(w => (
                 <div key={w.id} className="flex justify-between py-2" style={{ borderBottom: '1px dashed #f1f5f9' }}>
                   <span className="font-bold">{w.name}</span>
                   <span className="font-bold">{formatCurrency(w.balance)}</span>
                 </div>
               ))}
             </div>

             <div>
               <h2 className="text-lg font-bold mb-4 pb-2" style={{ color: '#1e293b', borderBottom: '1px solid #e2e8f0' }}>آخر المعاملات</h2>
               {transactions.filter(tx => !tx.isDeleted).slice(0, 20).map(tx => (
                 <div key={tx.id} className="flex justify-between items-center py-2 text-sm" style={{ borderBottom: '1px dashed #f1f5f9' }}>
                   <div className="w-1/3">
                      <span className="font-bold block">{tx.category}</span>
                      <span className="text-xs" style={{ color: '#64748b' }}>{format(new Date(tx.dateTime), 'PP', { locale: ar })}</span>
                   </div>
                   <div className="w-1/3 text-center" style={{ color: '#64748b' }}>{tx.type === 'income' ? 'دخل' : tx.type === 'expense' ? 'مصروف' : 'تحويل'}</div>
                   <div className="w-1/3 text-left font-bold" dir="ltr">{formatCurrency(tx.amount)}</div>
                 </div>
               ))}
             </div>
          </div>
        </div>

      </div>
    </div>
  );
};
