import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { X, Tags, Plus, Trash2 } from 'lucide-react';

interface QuickCategoryModalProps {
  onClose: () => void;
}

export const QuickCategoryModal: React.FC<QuickCategoryModalProps> = ({ onClose }) => {
  const [newCatName, setNewCatName] = useState('');
  const [newCatEmoji, setNewCatEmoji] = useState('🛒');
  const [newCatType, setNewCatType] = useState<'expense' | 'income' | 'all'>('expense');

  const categories = useLiveQuery(() => db.categories.toArray(), []) || [];

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName || !newCatEmoji) return;
    await db.categories.add({
      name: newCatName,
      emoji: newCatEmoji,
      type: newCatType
    });
    setNewCatName('');
    setNewCatEmoji('🛒');
  };

  const handleDelete = async (cat: Category) => {
    if (window.confirm("حذف هذه الفئة؟ سيتم نقلها لسلة المهملات.")) {
      await db.transaction('rw', db.categories, db.transactions, async () => {
        await db.categories.update(cat.id!, { isDeleted: true, deletedAt: Date.now() });
        // Soft delete all transactions with this category
        await db.transactions.filter(tx => tx.category === cat.name && !tx.isDeleted).modify({ isDeleted: true, deletedAt: Date.now() });
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-card border border-border rounded-[32px] w-full max-w-md shadow-2xl flex flex-col overflow-hidden max-h-[80vh]">
        
        <div className="flex justify-between items-center p-6 border-b border-border bg-card z-10">
          <div className="flex items-center gap-3">
             <Tags className="text-accent" size={24} />
             <h2 className="text-xl font-bold text-foreground">إدارة الفئات السريعة</h2>
          </div>
          <button onClick={onClose} className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <form onSubmit={handleAddCategory} className="bg-muted p-4 rounded-2xl border border-border mb-6">
            <h3 className="font-bold text-sm mb-3">إضافة فئة جديدة</h3>
            <div className="flex gap-2 mb-3">
              <input 
                type="text" 
                maxLength={2} 
                required 
                value={newCatEmoji} 
                onChange={e => setNewCatEmoji(e.target.value)} 
                className="w-14 bg-card border border-border rounded-xl text-center text-xl outline-none focus:border-accent" 
                title="إيموجي"
              />
              <input 
                type="text" 
                required 
                placeholder="اسم الفئة..." 
                value={newCatName} 
                onChange={e => setNewCatName(e.target.value)} 
                className="flex-1 bg-card border border-border rounded-xl px-3 outline-none focus:border-accent text-sm text-foreground" 
              />
            </div>
            <div className="flex gap-2 justify-between items-center">
              <select 
                value={newCatType} 
                onChange={e => setNewCatType(e.target.value as any)}
                className="bg-card border border-border rounded-xl px-2 py-1.5 text-sm outline-none focus:border-accent text-foreground"
              >
                <option value="expense">مصروف</option>
                <option value="income">دخل</option>
                <option value="all">عام</option>
              </select>
              <button type="submit" className="bg-accent text-white px-4 py-1.5 rounded-xl font-bold text-sm hover:bg-accent/90 transition-colors flex items-center gap-1">
                <Plus size={16} /> إضافة
              </button>
            </div>
          </form>

          <div className="space-y-2">
            {categories.map(cat => (
              <div key={cat.id} className="flex justify-between items-center bg-card border border-border p-3 rounded-xl hover:bg-muted transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{cat.emoji}</span>
                  <div>
                    <span className="font-bold text-foreground block">{cat.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {cat.type === 'expense' ? 'مصروف' : cat.type === 'income' ? 'دخل' : 'عام'}
                    </span>
                  </div>
                </div>
                <button onClick={() => handleDelete(cat)} className="text-muted-foreground hover:text-rose-500 p-2">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
