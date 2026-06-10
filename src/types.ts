export type TransactionCategory = 'designated' | 'online' | 'other';

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  shop: string;
  category: TransactionCategory;
  createdAt: string;
}

export interface DesignatedShop {
  name: string;
}

export interface RewardConfig {
  designatedCap: number;
  designatedRate: number;
  onlineCap: number;
  onlineRate: number;
  baseRate: number;
}

export interface MonthlyReward {
  month: string;
  designatedSpending: number;
  onlineSpending: number;
  otherSpending: number;
  totalSpending: number;
  designatedRewardCash: number;
  onlineRewardCash: number;
  otherRewardCash: number;
  totalRewardCash: number;
}

export const CATEGORY_LABELS: Record<TransactionCategory, string> = {
  designated: 'Designated Shop',
  online: 'Online Shopping',
  other: 'Other',
};

export const CATEGORY_COLORS: Record<TransactionCategory, string> = {
  designated: '#6366f1',
  online: '#0ea5e9',
  other: '#94a3b8',
};
