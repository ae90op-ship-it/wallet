import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { formatCurrency } from '../utils/format';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { X, RefreshCcw, Trash2, Moon, Sun, Monitor, Palette, Coins, BarChart3, ChevronDown, ChevronUp, AlertTriangle, Download, Upload, Languages } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { APP_LANGUAGES } from '../utils/languages';
import { motion, AnimatePresence } from 'framer-motion';

interface SettingsManagerProps {
  onClose: () => void;
}

const ACCENT_COLORS = [
  { name: 'الأزرق', value: '#3b82f6' },
  { name: 'السماوي', value: '#0ea5e9' },
  { name: 'البنفسجي', value: '#8b5cf6' },
  { name: 'الوردي', value: '#ec4899' },
  { name: 'الأحمر', value: '#ef4444' },
  { name: 'البرتقالي', value: '#f97316' },
  { name: 'الأصفر', value: '#f59e0b' },
  { name: 'الأخضر', value: '#22c55e' },
  { name: 'الزمردي', value: '#10b981' },
  { name: 'التركوازي', value: '#14b8a6' },
];

const COMMON_CURRENCIES = [
  { code: 'EGP', name: 'جنيه مصري' },
  { code: 'SAR', name: 'ريال سعودي' },
  { code: 'AED', name: 'درهم إماراتي' },
  { code: 'KWD', name: 'دينار كويتي' },
  { code: 'QAR', name: 'ريال قطري' },
  { code: 'OMR', name: 'ريال عماني' },
  { code: 'BHD', name: 'دينار بحريني' },
  { code: 'JOD', name: 'دينار أردني' },
  { code: 'ILS', name: 'شيكل إسرائيلي' },
  { code: 'LBP', name: 'ليرة لبنانية' },
  { code: 'SYP', name: 'ليرة سورية' },
  { code: 'IQD', name: 'دينار عراقي' },
  { code: 'YER', name: 'ريال يمني' },
  { code: 'LYD', name: 'دينار ليبي' },
  { code: 'TND', name: 'دينار تونسي' },
  { code: 'DZD', name: 'دينار جزائري' },
  { code: 'MAD', name: 'درهم مغربي' },
  { code: 'USD', name: 'دولار أمريكي' },
  { code: 'EUR', name: 'يورو' },
  { code: 'GBP', name: 'جنيه إسترليني' },
  { code: 'TRY', name: 'ليرة تركية' },
];

const AccordionItem = ({ title, icon: Icon, children, isOpen, onToggle }: any) => (
  <div className="border border-border rounded-2xl overflow-hidden mb-3 bg-muted/30">
    <button 
      onClick={onToggle}
      className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <Icon size={20} className="text-accent" />
        <span className="font-bold text-foreground">{title}</span>
      </div>
      {isOpen ? <ChevronUp size={20} className="text-muted-foreground" /> : <ChevronDown size={20} className="text-muted-foreground" />}
    </button>
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: 'auto' }}
          exit={{ height: 0 }}
          className="overflow-hidden"
        >
          <div className="p-4 border-t border-border bg-card/50">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

export const SettingsManager: React.FC<SettingsManagerProps> = ({ onClose }) => {
  const { settings, updateSettings } = useSettings();
  const [openSection, setOpenSection] = useState<string | null>('appearance');
  const [currencySearch, setCurrencySearch] = useState('');
  
  // Delete Data State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const deletedTransactions = useLiveQuery(
    () => db.transactions.filter(tx => !!tx.isDeleted).toArray(),
    []
  ) || [];
  
  const deletedDebts = useLiveQuery(
    () => db.debts.filter(d => !!d.isDeleted).toArray(),
    []
  ) || [];
  
  const deletedCategories = useLiveQuery(
    () => db.categories.filter(c => !!c.isDeleted).toArray(),
    []
  ) || [];
  
  const deletedBills = useLiveQuery(
    () => db.bills.filter(b => !!b.isDeleted).toArray(),
    []
  ) || [];

  const totalTrash = deletedTransactions.length + deletedDebts.length + deletedCategories.length + deletedBills.length;

  const handleBackup = async () => {
    try {
      const w = await db.wallets.toArray();
      const t = await db.transactions.toArray();
      const d = await db.debts.toArray();
      const c = await db.categories.toArray();
      const a = await db.activityLog.toArray();
      const backupData = { wallets: w, transactions: t, debts: d, categories: c, activityLog: a, exportedAt: Date.now() };
      const blob = new Blob([JSON.stringify(backupData)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `نسخة_احتياطية_محفظتي_${format(new Date(), 'yyyy-MM-dd')}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('فشل التصدير');
    }
  };

  const handleExportCSV = async () => {
    try {
      const txs = await db.transactions.toArray();
      const wallets = await db.wallets.toArray();
      
      const walletMap = new Map();
      wallets.forEach(w => walletMap.set(w.id, w.name));

      let csv = 'التاريخ,النوع,المحفظة,المبلغ,الفئة,الملاحظات\n';
      txs.forEach(tx => {
        if (tx.isDeleted) return; // Skip deleted
        const date = format(new Date(tx.dateTime), 'yyyy-MM-dd HH:mm');
        const type = tx.type === 'income' ? 'دخل' : tx.type === 'expense' ? 'مصروف' : 'تحويل';
        const wallet = walletMap.get(tx.walletId) || 'غير معروف';
        const amount = (tx.amount / 1000).toFixed(3);
        const category = tx.category || '';
        const notes = (tx.notes || '').replace(/,/g, ' '); // simple escape
        csv += `${date},${type},${wallet},${amount},${category},${notes}\n`;
      });
      
      // UTF-8 BOM for Arabic support in Excel
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `المعاملات_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('فشل التصدير إلى CSV');
    }
  };

  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.wallets && data.transactions) {
          await db.transactions.clear();
          await db.wallets.clear();
          await db.wallets.bulkAdd(data.wallets);
          await db.transactions.bulkAdd(data.transactions);
          if (data.debts) { await db.debts.clear(); await db.debts.bulkAdd(data.debts); }
          if (data.categories) { await db.categories.clear(); await db.categories.bulkAdd(data.categories); }
          if (data.activityLog) { await db.activityLog.clear(); await db.activityLog.bulkAdd(data.activityLog); }
          alert("تم استعادة النسخة الاحتياطية بنجاح!");
          window.location.reload();
        } else {
          alert("ملف النسخة الاحتياطية غير صالح.");
        }
      } catch (err) {
        alert("فشل في قراءة الملف.");
      }
    };
    reader.readAsText(file);
  };

  const handleRestore = async (id: number, type: 'tx' | 'debt' | 'cat' | 'bill') => {
    try {
      if (type === 'tx') await db.restoreTransaction(id);
      else if (type === 'debt') await db.debts.update(id, { isDeleted: false, deletedAt: undefined });
      else if (type === 'cat') await db.categories.update(id, { isDeleted: false, deletedAt: undefined });
      else if (type === 'bill') await db.bills.update(id, { isDeleted: false, deletedAt: undefined });
    } catch (e) {
      alert("فشلت عملية الاستعادة");
    }
  };

  const handlePermanentDelete = async (id: number, type: 'tx' | 'debt' | 'cat' | 'bill') => {
    if (window.confirm("هل أنت متأكد من الحذف النهائي؟")) {
      if (type === 'tx') await db.permanentDeleteTransaction(id);
      else if (type === 'debt') await db.debts.delete(id);
      else if (type === 'cat') await db.categories.delete(id);
      else if (type === 'bill') await db.bills.delete(id);
    }
  };

  const handleEmptyTrash = async () => {
    if (window.confirm("هل أنت متأكد من إفراغ سلة المحذوفات بالكامل؟")) {
      try {
        await db.transactions.filter(tx => !!tx.isDeleted).delete();
        await db.debts.filter(d => !!d.isDeleted).delete();
        await db.categories.filter(c => !!c.isDeleted).delete();
        await db.bills.filter(b => !!b.isDeleted).delete();
      } catch (e) {
        alert("فشل إفراغ السلة");
      }
    }
  };

  const handleDeleteAll = async () => {
    if (deleteInput !== 'حذف') return;
    try {
      await db.transactions.clear();
      await db.wallets.clear();
      await db.debts.clear();
      await db.activityLog.clear();
      setShowDeleteConfirm(false);
      alert("تم حذف جميع البيانات بنجاح");
      window.location.reload();
    } catch (e) {
      alert("حدث خطأ أثناء الحذف");
    }
  };

  const [languageSearch, setLanguageSearch] = useState('');
  
  const filteredCurrencies = COMMON_CURRENCIES.filter(c => 
    c.name.includes(currencySearch) || c.code.toLowerCase().includes(currencySearch.toLowerCase())
  );
  
  const filteredLanguages = APP_LANGUAGES.filter(l => 
    l.name.toLowerCase().includes(languageSearch.toLowerCase()) || l.code.toLowerCase().includes(languageSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-card border border-border rounded-[32px] w-full max-w-md shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">الإعدادات</h2>
          <button onClick={onClose} className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          
          <AccordionItem 
            title="اللغة" 
            icon={Languages} 
            isOpen={openSection === 'language'} 
            onToggle={() => setOpenSection(openSection === 'language' ? null : 'language')}
          >
            <div className="space-y-4">
              <input 
                type="text"
                placeholder="البحث عن لغة..."
                value={languageSearch}
                onChange={e => setLanguageSearch(e.target.value)}
                className="w-full bg-muted border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:border-accent outline-none"
              />
              <div className="max-h-48 overflow-y-auto space-y-1 pr-2">
                {filteredLanguages.map(l => (
                  <button
                    key={l.code}
                    onClick={() => updateSettings({ language: l.code })}
                    className={`w-full flex justify-between items-center p-3 rounded-xl transition-colors ${
                      settings.language === l.code ? 'bg-accent/10 text-accent font-bold border border-accent/20' : 'hover:bg-muted text-foreground'
                    }`}
                  >
                    <span>{l.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </AccordionItem>

          <AccordionItem 
            title="المظهر" 
            icon={Palette} 
            isOpen={openSection === 'appearance'} 
            onToggle={() => setOpenSection(openSection === 'appearance' ? null : 'appearance')}
          >
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">وضع الرؤية</label>
                <div className="flex gap-2 bg-muted p-1 rounded-xl">
                  {(['light', 'dark', 'auto'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => updateSettings({ theme: t })}
                      className={`flex-1 py-2 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors ${
                        settings.theme === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {t === 'light' ? <Sun size={16} /> : t === 'dark' ? <Moon size={16} /> : <Monitor size={16} />}
                      {t === 'light' ? 'فاتح' : t === 'dark' ? 'داكن' : 'تلقائي'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-2 block">لون التطبيق</label>
                <div className="flex flex-wrap gap-3">
                  {ACCENT_COLORS.map(color => (
                    <button
                      key={color.value}
                      onClick={() => updateSettings({ accentColor: color.value })}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform ${
                        settings.accentColor === color.value ? 'scale-110 ring-2 ring-offset-2 ring-offset-card ring-foreground' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                  <div className="w-10 h-10 rounded-full overflow-hidden relative cursor-pointer ring-1 ring-border">
                    <input 
                      type="color" 
                      value={settings.accentColor}
                      onChange={(e) => updateSettings({ accentColor: e.target.value })}
                      className="absolute inset-0 w-16 h-16 -top-2 -left-2 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          </AccordionItem>

          <AccordionItem 
            title="العملة" 
            icon={Coins} 
            isOpen={openSection === 'currency'} 
            onToggle={() => setOpenSection(openSection === 'currency' ? null : 'currency')}
          >
            <div className="space-y-4">
              <input 
                type="text"
                placeholder="البحث عن عملة (مثال: EGP، ريال)..."
                value={currencySearch}
                onChange={e => setCurrencySearch(e.target.value)}
                className="w-full bg-muted border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:border-accent outline-none"
              />
              <div className="max-h-48 overflow-y-auto space-y-1 pr-2">
                {filteredCurrencies.map(c => (
                  <button
                    key={c.code}
                    onClick={() => updateSettings({ currency: c.code })}
                    className={`w-full flex justify-between items-center p-3 rounded-xl transition-colors ${
                      settings.currency === c.code ? 'bg-accent/10 text-accent font-bold border border-accent/20' : 'hover:bg-muted text-foreground'
                    }`}
                  >
                    <span>{c.name}</span>
                    <span className="font-mono text-xs opacity-70">{c.code}</span>
                  </button>
                ))}
              </div>
            </div>
          </AccordionItem>

          <AccordionItem 
            title="التقارير" 
            icon={BarChart3} 
            isOpen={openSection === 'reports'} 
            onToggle={() => setOpenSection(openSection === 'reports' ? null : 'reports')}
          >
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">بداية الأسبوع</label>
                <div className="flex gap-2 bg-muted p-1 rounded-xl">
                  {(['saturday', 'sunday', 'monday'] as const).map(d => (
                    <button
                      key={d}
                      onClick={() => updateSettings({ weekStartDay: d })}
                      className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
                        settings.weekStartDay === d ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {d === 'saturday' ? 'السبت' : d === 'sunday' ? 'الأحد' : 'الاثنين'}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center justify-between p-2">
                <span className="text-sm text-foreground">إظهار النسب المئوية</span>
                <input 
                  type="checkbox" 
                  checked={settings.showPercentages} 
                  onChange={e => updateSettings({ showPercentages: e.target.checked })}
                  className="w-5 h-5 accent-accent"
                />
              </div>
              
              <div className="flex items-center justify-between p-2">
                <span className="text-sm text-foreground">إظهار الرسوم البيانية</span>
                <input 
                  type="checkbox" 
                  checked={settings.showCharts} 
                  onChange={e => updateSettings({ showCharts: e.target.checked })}
                  className="w-5 h-5 accent-accent"
                />
              </div>
            </div>
          </AccordionItem>

          <AccordionItem 
            title="إدارة البيانات" 
            icon={Trash2} 
            isOpen={openSection === 'data'} 
            onToggle={() => setOpenSection(openSection === 'data' ? null : 'data')}
          >
            <div className="space-y-4">
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-bold text-foreground">سلة المحذوفات ({totalTrash})</h4>
                  {totalTrash > 0 && (
                    <button onClick={handleEmptyTrash} className="text-xs text-rose-500 hover:underline">
                      إفراغ السلة
                    </button>
                  )}
                </div>
                {totalTrash === 0 ? (
                  <p className="text-xs text-muted-foreground">سلة المحذوفات فارغة</p>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                    {deletedTransactions.map(tx => (
                      <div key={`tx-${tx.id}`} className="p-3 bg-muted rounded-xl flex justify-between items-center border border-border">
                        <div>
                          <p className="font-bold text-sm text-foreground">معاملة: {tx.category}</p>
                          <p className="text-[10px] text-muted-foreground">{formatCurrency(tx.amount)}</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => handleRestore(tx.id!, 'tx')} className="p-1.5 bg-emerald-500/10 text-emerald-600 rounded-lg hover:bg-emerald-500/20"><RefreshCcw size={14}/></button>
                          <button onClick={() => handlePermanentDelete(tx.id!, 'tx')} className="p-1.5 bg-rose-500/10 text-rose-600 rounded-lg hover:bg-rose-500/20"><Trash2 size={14}/></button>
                        </div>
                      </div>
                    ))}
                    {deletedDebts.map(d => (
                      <div key={`debt-${d.id}`} className="p-3 bg-muted rounded-xl flex justify-between items-center border border-border">
                        <div>
                          <p className="font-bold text-sm text-foreground">دين: {d.title}</p>
                          <p className="text-[10px] text-muted-foreground">{formatCurrency(d.amount)}</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => handleRestore(d.id!, 'debt')} className="p-1.5 bg-emerald-500/10 text-emerald-600 rounded-lg hover:bg-emerald-500/20"><RefreshCcw size={14}/></button>
                          <button onClick={() => handlePermanentDelete(d.id!, 'debt')} className="p-1.5 bg-rose-500/10 text-rose-600 rounded-lg hover:bg-rose-500/20"><Trash2 size={14}/></button>
                        </div>
                      </div>
                    ))}
                    {deletedCategories.map(c => (
                      <div key={`cat-${c.id}`} className="p-3 bg-muted rounded-xl flex justify-between items-center border border-border">
                        <div>
                          <p className="font-bold text-sm text-foreground">فئة: {c.name} {c.emoji}</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => handleRestore(c.id!, 'cat')} className="p-1.5 bg-emerald-500/10 text-emerald-600 rounded-lg hover:bg-emerald-500/20"><RefreshCcw size={14}/></button>
                          <button onClick={() => handlePermanentDelete(c.id!, 'cat')} className="p-1.5 bg-rose-500/10 text-rose-600 rounded-lg hover:bg-rose-500/20"><Trash2 size={14}/></button>
                        </div>
                      </div>
                    ))}
                    {deletedBills.map(b => (
                      <div key={`bill-${b.id}`} className="p-3 bg-muted rounded-xl flex justify-between items-center border border-border">
                        <div>
                          <p className="font-bold text-sm text-foreground">فاتورة: {b.title}</p>
                          <p className="text-[10px] text-muted-foreground">{formatCurrency(b.amount)}</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => handleRestore(b.id!, 'bill')} className="p-1.5 bg-emerald-500/10 text-emerald-600 rounded-lg hover:bg-emerald-500/20"><RefreshCcw size={14}/></button>
                          <button onClick={() => handlePermanentDelete(b.id!, 'bill')} className="p-1.5 bg-rose-500/10 text-rose-600 rounded-lg hover:bg-rose-500/20"><Trash2 size={14}/></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-4 space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={handleBackup} className="flex items-center justify-center gap-2 py-3 bg-accent/10 text-accent hover:bg-accent/20 transition-colors rounded-xl font-bold text-sm">
                    <Download size={18} /> تصدير نسخة (JSON)
                  </button>
                  <button onClick={handleExportCSV} className="flex items-center justify-center gap-2 py-3 bg-accent/10 text-accent hover:bg-accent/20 transition-colors rounded-xl font-bold text-sm">
                    <Download size={18} /> تصدير (CSV)
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} className="col-span-2 flex items-center justify-center gap-2 py-3 bg-muted text-foreground hover:bg-border transition-colors rounded-xl font-bold text-sm">
                    <Upload size={18} /> استيراد (JSON)
                  </button>
                  <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleRestoreBackup} />
                </div>

                {showDeleteConfirm ? (
                  <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-center">
                    <AlertTriangle className="mx-auto text-rose-500 mb-2" size={32} />
                    <h4 className="font-bold text-rose-500 mb-1">تحذير خطير</h4>
                    <p className="text-xs text-rose-500/80 mb-3">سيتم حذف جميع المعاملات والمحافظ. هذه العملية لا يمكن التراجع عنها.</p>
                    <input 
                      type="text" 
                      placeholder="اكتب 'حذف' للتأكيد" 
                      value={deleteInput}
                      onChange={e => setDeleteInput(e.target.value)}
                      className="w-full bg-background border border-rose-500/30 rounded-lg px-3 py-2 text-sm mb-3 text-center focus:border-rose-500 outline-none"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2 bg-muted text-foreground rounded-lg text-sm font-bold">إلغاء</button>
                      <button 
                        onClick={handleDeleteAll} 
                        disabled={deleteInput !== 'حذف'}
                        className="flex-1 py-2 bg-rose-500 text-white rounded-lg text-sm font-bold disabled:opacity-50 transition-opacity"
                      >
                        حذف نهائي
                      </button>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => { setShowDeleteConfirm(true); setDeleteInput(''); }}
                    className="w-full py-3 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors rounded-xl font-bold flex items-center justify-center gap-2"
                  >
                    <Trash2 size={18} /> حذف جميع البيانات
                  </button>
                )}
              </div>
            </div>
          </AccordionItem>

        </div>
      </div>
    </div>
  );
};
