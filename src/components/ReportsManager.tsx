import React, { useRef, useState } from 'react';
import { db, Wallet, Transaction } from '../db/db';
import { formatCurrency } from '../utils/format';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { X, FileDown, DatabaseBackup, Download, Upload } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ReportsManagerProps {
  wallets: Wallet[];
  transactions: Transaction[];
  onClose: () => void;
}

export const ReportsManager: React.FC<ReportsManagerProps> = ({ wallets, transactions, onClose }) => {
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // PDF Export handling Arabic by capturing HTML canvas
  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`تقرير_محفظتي_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (err) {
      console.error("PDF Export failed", err);
      alert("حدث خطأ أثناء تصدير التقرير");
    } finally {
      setIsExporting(false);
    }
  };

  // JSON Backup
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

  // JSON Restore
  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.wallets && data.transactions) {
          if (window.confirm("تحذير: سيتم مسح جميع البيانات الحالية واستبدالها بالنسخة الاحتياطية. هل أنت متأكد؟")) {
            await db.transaction('rw', db.wallets, db.transactions, async () => {
              await db.wallets.clear();
              await db.transactions.clear();
              await db.wallets.bulkAdd(data.wallets);
              await db.transactions.bulkAdd(data.transactions);
            });
            alert("تم استعادة البيانات بنجاح!");
            window.location.reload(); // Refresh to update states
          }
        } else {
          alert("ملف النسخة الاحتياطية غير صالح");
        }
      } catch (err) {
        alert("فشل قراءة الملف. تأكد من أنه ملف صالح.");
      }
    };
    reader.readAsText(file);
  };

  const totalWealth = wallets.reduce((sum, w) => sum + w.balance, 0);

  return (
    <div className="fixed inset-0 bg-[#0a0b0d]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#1e2229] border border-[#303640] rounded-[32px] w-full max-w-md shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-[#303640]">
          <h2 className="text-xl font-bold text-gray-100">التقارير والنسخ الاحتياطي</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-[#303640] rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={handleExportPDF}
              disabled={isExporting}
              className="flex flex-col items-center justify-center gap-2 p-4 bg-[#14161a] text-[#10b981] rounded-2xl hover:bg-[#25282e] transition-colors border border-[#10b981]/30"
            >
              <FileDown size={28} />
              <span className="font-bold text-sm">{isExporting ? 'جاري التصدير...' : 'تصدير PDF'}</span>
            </button>
            <button 
              onClick={handleBackup}
              className="flex flex-col items-center justify-center gap-2 p-4 bg-[#14161a] text-blue-400 rounded-2xl hover:bg-[#25282e] transition-colors border border-blue-400/30"
            >
              <Download size={28} />
              <span className="font-bold text-sm">تصدير بيانات (JSON)</span>
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 p-4 bg-[#14161a] text-[#f59e0b] rounded-2xl hover:bg-[#25282e] transition-colors border border-[#f59e0b]/30 col-span-2"
            >
              <Upload size={28} />
              <span className="font-bold text-sm">استيراد بيانات (JSON)</span>
            </button>
            <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleRestore} />
          </div>

          {/* Hidden Report Div for PDF generation (Rendered off-screen essentially, but we show it here scaled down) */}
          <div className="mt-8 border-t border-[#303640] pt-6">
            <p className="text-sm text-gray-500 mb-4 text-center">معاينة التقرير (أبيض للخلفية)</p>
            <div className="bg-white border border-gray-200 p-8 rounded-lg shadow-sm text-slate-900" ref={reportRef} dir="rtl">
               <h1 className="text-2xl font-black text-slate-900 mb-6 text-center border-b pb-4">تقرير محفظتي</h1>
               <div className="flex justify-between items-center mb-8">
                  <div>
                     <p className="text-sm text-slate-500">تاريخ التقرير</p>
                     <p className="font-bold text-slate-800">{format(new Date(), 'PPP', { locale: ar })}</p>
                  </div>
                  <div className="text-left">
                     <p className="text-sm text-slate-500">إجمالي الثروة</p>
                     <p className="text-xl font-bold text-emerald-600">{formatCurrency(totalWealth)}</p>
                  </div>
               </div>

               <div className="mb-8">
                 <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">المحافظ</h2>
                 {wallets.map(w => (
                   <div key={w.id} className="flex justify-between py-2 border-b border-slate-100 border-dashed">
                     <span className="font-bold">{w.name}</span>
                     <span className="font-bold">{formatCurrency(w.balance)}</span>
                   </div>
                 ))}
               </div>

               <div>
                 <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">آخر المعاملات</h2>
                 {transactions.slice(0, 20).map(tx => (
                   <div key={tx.id} className="flex justify-between items-center py-2 border-b border-slate-100 border-dashed text-sm">
                     <div className="w-1/3">
                        <span className="font-bold block">{tx.category}</span>
                        <span className="text-xs text-slate-500">{format(new Date(tx.dateTime), 'PP', { locale: ar })}</span>
                     </div>
                     <div className="w-1/3 text-center text-slate-500">{tx.type === 'income' ? 'دخل' : tx.type === 'expense' ? 'مصروف' : 'تحويل'}</div>
                     <div className="w-1/3 text-left font-bold" dir="ltr">{formatCurrency(tx.amount)}</div>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
