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
        notes
      });
    });
  }
}

export const db = new WalletDB();
