import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { Transaction, DesignatedShop, RewardConfig, TransactionCategory } from '@/types';
import { DEFAULT_CONFIG, calculateMonthlyReward, getAllMonths } from '@/lib/rewards';
import type { MonthlyReward } from '@/types';

const DEFAULT_SHOPS: DesignatedShop[] = [
  { name: 'sushiro' },
  { name: 'taijai' },
  { name: 'decathlon' },
  { name: 'gu' },
  { name: 'namco' },
  { name: 'taito station' },
];

interface AppState {
  transactions: Transaction[];
  designatedShops: DesignatedShop[];
  config: RewardConfig;

  addTransaction: (data: Omit<Transaction, 'id' | 'createdAt'>) => void;
  updateTransaction: (id: string, data: Partial<Omit<Transaction, 'id' | 'createdAt'>>) => void;
  deleteTransaction: (id: string) => void;
  addDesignatedShop: (name: string) => void;
  removeDesignatedShop: (name: string) => void;
  updateConfig: (config: Partial<RewardConfig>) => void;
  importTransactions: (transactions: Transaction[]) => void;
  clearAllData: () => void;

  getMonthlyReward: (month: string) => MonthlyReward;
  getAllMonths: () => string[];
  getCategoryForShop: (shop: string) => TransactionCategory;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      transactions: [],
      designatedShops: DEFAULT_SHOPS,
      config: DEFAULT_CONFIG,

      addTransaction: (data) => {
        const transaction: Transaction = {
          ...data,
          id: uuidv4(),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ transactions: [...state.transactions, transaction] }));
      },

      updateTransaction: (id, data) => {
        set((state) => ({
          transactions: state.transactions.map((t) =>
            t.id === id ? { ...t, ...data } : t
          ),
        }));
      },

      deleteTransaction: (id) => {
        set((state) => ({
          transactions: state.transactions.filter((t) => t.id !== id),
        }));
      },

      addDesignatedShop: (name) => {
        set((state) => ({
          designatedShops: [...state.designatedShops, { name }],
        }));
      },

      removeDesignatedShop: (name) => {
        set((state) => ({
          designatedShops: state.designatedShops.filter((s) => s.name !== name),
        }));
      },

      updateConfig: (config) => {
        set((state) => ({ config: { ...state.config, ...config } }));
      },

      importTransactions: (transactions) => {
        set((state) => ({ transactions: [...state.transactions, ...transactions] }));
      },

      clearAllData: () => {
        set({ transactions: [], designatedShops: DEFAULT_SHOPS, config: DEFAULT_CONFIG });
      },

      getMonthlyReward: (month) => {
        const { transactions, config } = get();
        return calculateMonthlyReward(transactions, month, config);
      },

      getAllMonths: () => {
        const { transactions } = get();
        return getAllMonths(transactions);
      },

      getCategoryForShop: (shop) => {
        const { designatedShops } = get();
        const lowerShop = shop.toLowerCase().trim();
        const isDesignated = designatedShops.some(
          (s) =>
            lowerShop.includes(s.name.toLowerCase()) ||
            s.name.toLowerCase().includes(lowerShop)
        );
        if (isDesignated) return 'designated';
        return 'other';
      },
    }),
    {
      name: 'money-tracker-storage',
    }
  )
);
