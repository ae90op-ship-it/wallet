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

export class WalletDB extends Dexie {
  wallets!: Table<Wallet, number>;
  transactions!: Table<Transaction, number>;

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
  }

  // Preemptive Fix: Atomicity in Transfers using Database Transactions
  async performTransfer(fromWalletId: number, toWalletId: number, amountInt: number, dateUtc: number, notes: string) {
    return this.transaction('rw', this.wallets, this.transactions, async () => {
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
    return this.transaction('rw', this.wallets, this.transactions, async () => {
      const wallet = await this.wallets.get(walletId);
      if (!wallet) throw new Error("المحفظة غير موجودة");

      const newBalance = type === 'income' ? wallet.balance + amountInt : wallet.balance - amountInt;
      await this.wallets.update(walletId, { balance: newBalance });

      await this.transactions.add({
        walletId,
        amount: amountInt,
        type,
        dateTime: dateUtc,
        category,
        notes,
        isDeleted: false,
        updatedAt: Date.now()
      });
    });
  }

  // Edit transaction
  async editTransaction(id: number, walletId: number, amountInt: number, type: 'income' | 'expense' | 'transfer', dateUtc: number, category: string, notes: string, toWalletId?: number) {
    return this.transaction('rw', this.wallets, this.transactions, async () => {
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
    });
  }

  // Soft delete transaction
  async softDeleteTransaction(id: number) {
    return this.transaction('rw', this.wallets, this.transactions, async () => {
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
    });
  }

  // Restore transaction
  async restoreTransaction(id: number) {
    return this.transaction('rw', this.wallets, this.transactions, async () => {
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
    });
  }

  // Permanent delete
  async permanentDeleteTransaction(id: number) {
     await this.transactions.delete(id);
  }
}

export const db = new WalletDB();
