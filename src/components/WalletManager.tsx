import React, { useState } from 'react';
import { db, Wallet } from '../db/db';
import { formatCurrency } from '../utils/format';
import { X, Plus, Wallet as WalletIcon } from 'lucide-react';

interface WalletManagerProps {
  wallets: Wallet[];
  onClose: () => void;
}

export const WalletManager: React.FC<WalletManagerProps> = ({ wallets, onClose }) => {
  const [newWalletName, setNewWalletName] = useState('');
  const [error, setError] = useState('');

  const handleCreateWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWalletName.trim()) {
      setError('يرجى إدخال اسم المحفظة');
      return;
    }

    try {
      await db.wallets.add({
        name: newWalletName.trim(),
        balance: 0,
        createdAt: Date.now()
      });
      setNewWalletName('');
      setError('');
    } catch (err) {
      setError('حدث خطأ أثناء الإنشاء');
    }
  };

  const totalWealth = wallets.reduce((sum, w) => sum + w.balance, 0);

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-card border border-border rounded-[32px] w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-foreground">إدارة المحافظ</h2>
          <button onClick={onClose} className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="bg-accent/10 rounded-2xl p-4 mb-6 border border-accent/20 flex items-center justify-between">
          <div>
            <p className="text-sm text-accent font-semibold mb-1">إجمالي الثروة</p>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(totalWealth)}</p>
          </div>
          <div className="p-3 bg-accent/20 text-accent rounded-full">
            <WalletIcon size={24} />
          </div>
        </div>

        <div className="space-y-3 mb-8">
          <h3 className="font-bold text-muted-foreground mb-2">المحافظ الحالية</h3>
          {wallets.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">لا توجد محافظ حالياً</p>
          ) : (
            wallets.map(w => (
              <div key={w.id} className="flex justify-between items-center p-4 bg-muted/50 rounded-xl border border-border">
                <span className="font-bold text-foreground">{w.name}</span>
                <span className="font-bold text-accent">{formatCurrency(w.balance)}</span>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleCreateWallet} className="border-t border-border pt-6">
          <h3 className="font-bold text-muted-foreground mb-4">إنشاء محفظة جديدة</h3>
          {error && <p className="text-rose-500 text-sm mb-2">{error}</p>}
          <div className="flex gap-2">
            <input
              type="text"
              value={newWalletName}
              onChange={(e) => setNewWalletName(e.target.value)}
              className="flex-1 bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-accent transition-colors"
              placeholder="اسم المحفظة (مثال: الراتب)"
            />
            <button
              type="submit"
              className="bg-accent text-white p-3 rounded-xl hover:bg-accent/90 transition-colors flex items-center justify-center shrink-0"
            >
              <Plus size={24} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
