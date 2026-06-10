import type { Transaction, RewardConfig, MonthlyReward } from '@/types';

export const DEFAULT_CONFIG: RewardConfig = {
  designatedCap: 1250,
  designatedRate: 0.08,
  onlineCap: 10000,
  onlineRate: 0.04,
  baseRate: 0.004,
};

export function calculateMonthlyReward(
  transactions: Transaction[],
  month: string,
  config: RewardConfig
): MonthlyReward {
  const monthTransactions = transactions.filter((t) => t.date.startsWith(month));

  const designatedSpending = monthTransactions
    .filter((t) => t.category === 'designated')
    .reduce((sum, t) => sum + t.amount, 0);
  const onlineSpending = monthTransactions
    .filter((t) => t.category === 'online')
    .reduce((sum, t) => sum + t.amount, 0);
  const otherSpending = monthTransactions
    .filter((t) => t.category === 'other')
    .reduce((sum, t) => sum + t.amount, 0);

  const designatedRewardCash =
    Math.min(designatedSpending, config.designatedCap) * config.designatedRate +
    Math.max(designatedSpending - config.designatedCap, 0) * config.baseRate;

  const onlineRewardCash =
    Math.min(onlineSpending, config.onlineCap) * config.onlineRate +
    Math.max(onlineSpending - config.onlineCap, 0) * config.baseRate;

  const otherRewardCash = otherSpending * config.baseRate;

  const total = designatedRewardCash + onlineRewardCash + otherRewardCash;

  return {
    month,
    designatedSpending: round(designatedSpending),
    onlineSpending: round(onlineSpending),
    otherSpending: round(otherSpending),
    totalSpending: round(designatedSpending + onlineSpending + otherSpending),
    designatedRewardCash: round(designatedRewardCash),
    onlineRewardCash: round(onlineRewardCash),
    otherRewardCash: round(otherRewardCash),
    totalRewardCash: round(total),
  };
}

export function getEffectiveRate(
  category: 'designated' | 'online' | 'other',
  currentCategorySpending: number,
  config: RewardConfig
): number {
  if (category === 'other') return config.baseRate;
  const cap = category === 'designated' ? config.designatedCap : config.onlineCap;
  const rate = category === 'designated' ? config.designatedRate : config.onlineRate;
  if (currentCategorySpending < cap) return rate;
  return config.baseRate;
}

export function getAllMonths(transactions: Transaction[]): string[] {
  const months = new Set<string>();
  transactions.forEach((t) => {
    months.add(t.date.substring(0, 7));
  });
  return Array.from(months).sort().reverse();
}

export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
