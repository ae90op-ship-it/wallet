import Dexie, { Table } from 'dexie';

export interface Wallet {
  id?: number;
  name: string;
  balance: number; // Stored as integer (Amount * 1000) for 3-decimal precision
  createdAt: number; // Epoch UTC
}

export interface Transaction {
  id?: number;
  walletId: number;
  amount: number; // Stored as integer (Amount * 1000)
  type: 'income' | 'expense' | 'transfer';
  dateTime: number; // Epoch UTC
  category: string;
  notes: string;
  toWalletId?: number; // Only for transfers
  isDeleted?: boolean;
  deletedAt?: number;
  updatedAt?: number;
}

export interface Debt {
  id?: number;
  title: string;
  type: 'to_me' | 'on_me';
  amount: number; // Stored as integer (Amount * 1000)
  remaining: number; // Stored as integer (Amount * 1000)
  dueDate?: number; // Epoch UTC
  createdAt: number;
  updatedAt: number;
  isDeleted?: boolean;
}

export interface Category {
  id?: number;
  name: string;
  emoji: string;
  type: 'expense' | 'income' | 'all';
  isDeleted?: boolean;
  deletedAt?: number;
}

export interface ActivityLog {
  id?: number;
  action: 'add' | 'edit' | 'delete' | 'restore' | 'pay_debt';
  entityType: 'transaction' | 'wallet' | 'debt' | 'category' | 'bill';
  entityId: number;
  details: string;
  timestamp: number;
}

export interface Bill {
  id?: number;
  title: string;
  accountNumber?: string;
  amount: number; // Stored as integer
  dueDate: number; // Epoch UTC
  isPaid: boolean;
  walletId?: number; // Optional, wallet used to pay
  createdAt: number;
  updatedAt: number;
  isDeleted?: boolean;
  deletedAt?: number;
}

export class WalletDB extends Dexie {
  wallets!: Table<Wallet, number>;
  transactions!: Table<Transaction, number>;
  debts!: Table<Debt, number>;
  categories!: Table<Category, number>;
  activityLog!: Table<ActivityLog, number>;
  bills!: Table<Bill, number>;

  constructor() {
    super('WalletDB');
    // Schema definition. Indexing on walletId and dateTime for fast queries.
    this.version(1).stores({
      wallets: '++id, name',
      transactions: '++id, walletId, dateTime, type, category'
    });
    
    // Version 2 adds soft deletes and updates index
    this.version(2).stores({
      wallets: '++id, name',
      transactions: '++id, walletId, dateTime, type, category, isDeleted'
    }).upgrade(tx => {
      return tx.table('transactions').toCollection().modify(transaction => {
        transaction.isDeleted = false;
        transaction.updatedAt = transaction.dateTime;
      });
    });

    // Version 6 adds bills and isDeleted to categories
    this.version(6).stores({
      wallets: '++id, name',
      transactions: '++id, walletId, dateTime, type, category, isDeleted',
      debts: '++id, type, dueDate, isDeleted',
      categories: '++id, type, isDeleted',
      activityLog: '++id, timestamp, action, entityType',
      bills: '++id, dueDate, isPaid, isDeleted'
    }).upgrade(async tx => {
      // Seed default categories if none exist
      const count = await tx.table('categories').count();
      if (count === 0) {
        const PRESET_CATEGORIES = [
          { name: 'طعام', emoji: '🍔', type: 'expense' },
          { name: 'مواصلات', emoji: '🚗', type: 'expense' },
          { name: 'تسوق', emoji: '🛍️', type: 'expense' },
          { name: 'فواتير', emoji: '📄', type: 'expense' },
          { name: 'صحة', emoji: '💊', type: 'expense' },
          { name: 'ترفيه', emoji: '🎮', type: 'expense' },
          { name: 'راتب', emoji: '💰', type: 'income' },
          { name: 'أخرى', emoji: '✨', type: 'all' }
        ];
        await tx.table('categories').bulkAdd(PRESET_CATEGORIES);
      }
      
      // Upgrade existing categories to have isDeleted
      await tx.table('categories').toCollection().modify(c => {
         if (c.isDeleted === undefined) c.isDeleted = false;
      });
    });
  }

  async logActivity(action: ActivityLog['action'], entityType: ActivityLog['entityType'], entityId: number, details: string) {
    try {
      await this.activityLog.add({
        action,
        entityType,
        entityId,
        details,
        timestamp: Date.now()
      });
      // Optionally trim the log to keep it under e.g., 500 items (not strictly required here since we limit display to 100)
    } catch (e) {
      console.error("Failed to log activity", e);
    }
  }

  // Preemptive Fix: Atomicity in Transfers using Database Transactions
  async performTransfer(fromWalletId: number, toWalletId: number, amountInt: number, dateUtc: number, notes: string) {
    return this.transaction('rw', this.wallets, this.transactions, this.activityLog, async () => {
      const fromWallet = await this.wallets.get(fromWalletId);
      const toWallet = await this.wallets.get(toWalletId);

      if (!fromWallet) throw new Error("المحفظة المحول منها غير موجودة");
      if (!toWallet) throw new Error("المحفظة المحول إليها غير موجودة");
      
      // Ensure sufficient funds (though for personal finance, negative balances might sometimes be allowed, 
      // let's enforce it or at least warn. We will allow it but just subtract.)
      
      // 1. Deduct from sender
      await this.wallets.update(fromWalletId, { balance: fromWallet.balance - amountInt });
      
      // 2. Add to receiver
      await this.wallets.update(toWalletId, { balance: toWallet.balance + amountInt });

      // 3. Record the transaction in the sender's wallet history
      await this.transactions.add({
        walletId: fromWalletId,
        amount: amountInt,
        type: 'transfer',
        dateTime: dateUtc,
        category: 'تحويل صادر',
        notes: notes,
        toWalletId: toWalletId
      });
      
      // 4. Record the transaction in the receiver's wallet history
      await this.transactions.add({
        walletId: toWalletId,
        amount: amountInt,
        type: 'transfer',
        dateTime: dateUtc,
        category: 'تحويل وارد',
        notes: notes,
        toWalletId: fromWalletId // In this context, toWalletId points back to sender
      });
    });
  }

  // Atomicity for regular income/expense
  async addTransaction(walletId: number, amountInt: number, type: 'income' | 'expense', dateUtc: number, category: string, notes: string) {
    return this.transaction('rw', this.wallets, this.transactions, this.activityLog, async () => {
      const wallet = await this.wallets.get(walletId);
      if (!wallet) throw new Error("المحفظة غير موجودة");

      const newBalance = type === 'income' ? wallet.balance + amountInt : wallet.balance - amountInt;
      await this.wallets.update(walletId, { balance: newBalance });

      const txId = await this.transactions.add({
        walletId,
        amount: amountInt,
        type,
        dateTime: dateUtc,
        category,
        notes,
        isDeleted: false,
        updatedAt: Date.now()
      });
      await this.logActivity('add', 'transaction', txId as number, `إضافة ${type === 'income' ? 'دخل' : 'مصروف'} بمبلغ ${amountInt/1000}`);
    });
  }

  // Edit transaction
  async editTransaction(id: number, walletId: number, amountInt: number, type: 'income' | 'expense' | 'transfer', dateUtc: number, category: string, notes: string, toWalletId?: number) {
    return this.transaction('rw', this.wallets, this.transactions, this.activityLog, async () => {
      const oldTx = await this.transactions.get(id);
      if (!oldTx) throw new Error("المعاملة غير موجودة");
      
      // Revert old transaction effect on balance
      if (oldTx.type === 'transfer') {
        const fromWallet = await this.wallets.get(oldTx.walletId);
        const toWalletIdOld = oldTx.toWalletId;
        if (toWalletIdOld) {
           const toWallet = await this.wallets.get(toWalletIdOld);
           if (fromWallet) await this.wallets.update(oldTx.walletId, { balance: fromWallet.balance + oldTx.amount });
           if (toWallet) await this.wallets.update(toWalletIdOld, { balance: toWallet.balance - oldTx.amount });
        }
      } else {
        const wallet = await this.wallets.get(oldTx.walletId);
        if (wallet) {
           const revertedBalance = oldTx.type === 'income' ? wallet.balance - oldTx.amount : wallet.balance + oldTx.amount;
           await this.wallets.update(oldTx.walletId, { balance: revertedBalance });
        }
      }

      // Apply new transaction effect
      if (type === 'transfer' && toWalletId) {
        const fromWallet = await this.wallets.get(walletId);
        const toWallet = await this.wallets.get(toWalletId);
        if (fromWallet) await this.wallets.update(walletId, { balance: fromWallet.balance - amountInt });
        if (toWallet) await this.wallets.update(toWalletId, { balance: toWallet.balance + amountInt });
      } else {
        const wallet = await this.wallets.get(walletId);
        if (wallet) {
          const newBalance = type === 'income' ? wallet.balance + amountInt : wallet.balance - amountInt;
          await this.wallets.update(walletId, { balance: newBalance });
        }
      }

      await this.transactions.update(id, {
        walletId, amount: amountInt, type, dateTime: dateUtc, category, notes, toWalletId, updatedAt: Date.now()
      });
      await this.logActivity('edit', 'transaction', id, `تعديل معاملة بمبلغ ${amountInt/1000}`);
    });
  }

  // Soft delete transaction
  async softDeleteTransaction(id: number) {
    return this.transaction('rw', this.wallets, this.transactions, this.activityLog, async () => {
      const tx = await this.transactions.get(id);
      if (!tx || tx.isDeleted) return;

      // Revert balance
      if (tx.type === 'transfer') {
         if (tx.toWalletId) {
            const fromWallet = await this.wallets.get(tx.walletId);
            const toWallet = await this.wallets.get(tx.toWalletId);
            if (fromWallet) await this.wallets.update(tx.walletId, { balance: fromWallet.balance + tx.amount });
            if (toWallet) await this.wallets.update(tx.toWalletId, { balance: toWallet.balance - tx.amount });
         }
      } else {
         const wallet = await this.wallets.get(tx.walletId);
         if (wallet) {
            const revertedBalance = tx.type === 'income' ? wallet.balance - tx.amount : wallet.balance + tx.amount;
            await this.wallets.update(tx.walletId, { balance: revertedBalance });
         }
      }

      await this.transactions.update(id, { isDeleted: true, deletedAt: Date.now() });
      await this.logActivity('delete', 'transaction', id, `حذف معاملة بمبلغ ${tx.amount/1000}`);
    });
  }

  // Restore transaction
  async restoreTransaction(id: number) {
    return this.transaction('rw', this.wallets, this.transactions, this.activityLog, async () => {
      const tx = await this.transactions.get(id);
      if (!tx || !tx.isDeleted) return;

      // Re-apply balance
      if (tx.type === 'transfer') {
         if (tx.toWalletId) {
            const fromWallet = await this.wallets.get(tx.walletId);
            const toWallet = await this.wallets.get(tx.toWalletId);
            if (fromWallet) await this.wallets.update(tx.walletId, { balance: fromWallet.balance - tx.amount });
            if (toWallet) await this.wallets.update(tx.toWalletId, { balance: toWallet.balance + tx.amount });
         }
      } else {
         const wallet = await this.wallets.get(tx.walletId);
         if (wallet) {
            const newBalance = tx.type === 'income' ? wallet.balance + tx.amount : wallet.balance - tx.amount;
            await this.wallets.update(tx.walletId, { balance: newBalance });
         }
      }

      await this.transactions.update(id, { isDeleted: false, deletedAt: undefined, updatedAt: Date.now() });
      await this.logActivity('restore', 'transaction', id, `استعادة معاملة بمبلغ ${tx.amount/1000}`);
    });
  }

  // Permanent delete
  async permanentDeleteTransaction(id: number) {
     await this.transactions.delete(id);
  }
  async cleanOldTrash() {
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const cutoff = now - THIRTY_DAYS;

    try {
      await this.transaction('rw', this.transactions, this.debts, this.categories, this.bills, async () => {
        await this.transactions.filter(tx => !!tx.isDeleted && !!tx.deletedAt && tx.deletedAt < cutoff).delete();
        await this.debts.filter(d => !!d.isDeleted && !!d.deletedAt && d.deletedAt < cutoff).delete();
        await this.categories.filter(c => !!c.isDeleted && !!c.deletedAt && c.deletedAt < cutoff).delete();
        await this.bills.filter(b => !!b.isDeleted && !!b.deletedAt && b.deletedAt < cutoff).delete();
      });
    } catch (e) {
      console.error("Failed to clean old trash", e);
    }
  }
}

export const db = new WalletDB();
