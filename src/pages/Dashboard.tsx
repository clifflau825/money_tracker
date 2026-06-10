import { useMemo, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useStore } from '@/store/useStore';
import { formatCurrency, formatPercent, getCurrentMonth } from '@/lib/rewards';
import type { TransactionCategory } from '@/types';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '@/types';

const RADIAN = Math.PI / 180;

function pieLabel({
  cx,
  cy,
  midAngle = 0,
  innerRadius = 0,
  outerRadius = 0,
  percent = 0,
}: {
  cx: number;
  cy: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
}) {
  if (percent < 0.05) return '';
  const radius = innerRadius + (outerRadius - innerRadius) * 0.7;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      className="text-xs font-medium"
    >
      {(percent * 100).toFixed(0)}%
    </text>
  );
}

function CapProgress({
  label,
  spending,
  cap,
  rate,
  fallbackRate,
  color,
}: {
  label: string;
  spending: number;
  cap: number;
  rate: number;
  fallbackRate: number;
  color: string;
}) {
  const percent = Math.min((spending / cap) * 100, 100);
  const isOverCap = spending >= cap;
  const effectiveRate = isOverCap ? fallbackRate : rate;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {formatCurrency(spending)} / {formatCurrency(cap)}
        </span>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${percent}%`,
            backgroundColor: isOverCap ? '#f59e0b' : color,
          }}
        />
        {isOverCap && (
          <div
            className="absolute right-0 top-0 h-full rounded-r-full"
            style={{ width: `${Math.min(((spending - cap) / cap) * 100, 100 - percent)}%`, backgroundColor: '#ef4444' }}
          />
        )}
      </div>
      <div className="flex items-center justify-between">
        <span
          className="rounded px-1.5 py-0.5 text-xs font-medium"
          style={{ backgroundColor: `${isOverCap ? '#f59e0b' : color}20`, color: isOverCap ? '#b45309' : color }}
        >
          {formatPercent(effectiveRate)} reward
        </span>
        {isOverCap && (
          <span className="text-xs text-muted-foreground">
            Cap reached — {formatPercent(fallbackRate)} on remainder
          </span>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const getMonthlyReward = useStore((s) => s.getMonthlyReward);
  const getAllMonths = useStore((s) => s.getAllMonths);
  const config = useStore((s) => s.config);
  const months = getAllMonths();
  const currentMonth = getCurrentMonth();
  const [selectedMonth, setSelectedMonth] = useState(
    months.length > 0 ? months[0] : currentMonth
  );

  const reward = useMemo(
    () => getMonthlyReward(selectedMonth),
    [selectedMonth, getMonthlyReward]
  );

  const recentRewards = useMemo(() => {
    return months.slice(0, 6).map((m) => getMonthlyReward(m)).reverse();
  }, [months, getMonthlyReward]);

  const pieData = useMemo(() => {
    const categories: TransactionCategory[] = ['designated', 'online', 'other'];
    return categories
      .map((cat) => ({
        name: CATEGORY_LABELS[cat],
        value: reward[`${cat}Spending` as keyof typeof reward] as number,
        color: CATEGORY_COLORS[cat],
      }))
      .filter((d) => d.value > 0);
  }, [reward]);

  const [monthLabel, yearLabel] = selectedMonth
    ? (() => {
        const [y, m] = selectedMonth.split('-');
        const date = new Date(Number(y), Number(m) - 1);
        return [
          date.toLocaleString('en-US', { month: 'long' }),
          y,
        ];
      })()
    : ['', ''];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
            {monthLabel} {yearLabel}
          </h1>
          <p className="text-sm text-muted-foreground">Monthly reward cash summary</p>
        </div>
        {months.length > 0 && (
          <Select value={selectedMonth} onValueChange={(v) => { if (v) setSelectedMonth(v); }}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => {
                const d = new Date(Number(m.split('-')[0]), Number(m.split('-')[1]) - 1);
                return (
                  <SelectItem key={m} value={m}>
                    {d.toLocaleString('en-US', { month: 'short', year: 'numeric' })}
                  </SelectItem>
                );
              })}
              <SelectItem value={currentMonth}>
                {new Date().toLocaleString('en-US', { month: 'short', year: 'numeric' })}
              </SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total Reward
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold tabular-nums text-primary">
              {formatCurrency(reward.totalRewardCash)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              from {formatCurrency(reward.totalSpending)} spending
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Designated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold tabular-nums" style={{ color: CATEGORY_COLORS.designated }}>
              {formatCurrency(reward.designatedRewardCash)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {formatCurrency(reward.designatedSpending)} at{' '}
              {formatPercent(
                reward.designatedSpending <= config.designatedCap
                  ? config.designatedRate
                  : config.baseRate
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Online
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold tabular-nums" style={{ color: CATEGORY_COLORS.online }}>
              {formatCurrency(reward.onlineRewardCash)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {formatCurrency(reward.onlineSpending)} at{' '}
              {formatPercent(
                reward.onlineSpending <= config.onlineCap
                  ? config.onlineRate
                  : config.baseRate
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Other
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold tabular-nums" style={{ color: CATEGORY_COLORS.other }}>
              {formatCurrency(reward.otherRewardCash)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {formatCurrency(reward.otherSpending)} at {formatPercent(config.baseRate)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Cap Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <CapProgress
              label="Designated Shops"
              spending={reward.designatedSpending}
              cap={config.designatedCap}
              rate={config.designatedRate}
              fallbackRate={config.baseRate}
              color={CATEGORY_COLORS.designated}
            />
            <CapProgress
              label="Online Shopping"
              spending={reward.onlineSpending}
              cap={config.onlineCap}
              rate={config.onlineRate}
              fallbackRate={config.baseRate}
              color={CATEGORY_COLORS.online}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Spending Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    label={pieLabel}
                    labelLine={false}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                No spending data for this month
              </div>
            )}
            <div className="mt-2 flex items-center justify-center gap-4">
              {pieData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                  <div
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-muted-foreground">{entry.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {recentRewards.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Reward Cash — Last 6 Months</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={recentRewards}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="month"
                  tickFormatter={(v: string) => {
                    const [y, m] = v.split('-');
                    const d = new Date(Number(y), Number(m) - 1);
                    return d.toLocaleString('en-US', { month: 'short' });
                  }}
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                  tickFormatter={(v) => `$${Number(v)}`}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  labelFormatter={(label) => {
                    const s = String(label);
                    const [y, m] = s.split('-');
                    const d = new Date(Number(y), Number(m) - 1);
                    return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
                  }}
                />
                <Bar dataKey="designatedRewardCash" stackId="a" fill={CATEGORY_COLORS.designated} name="Designated" />
                <Bar dataKey="onlineRewardCash" stackId="a" fill={CATEGORY_COLORS.online} name="Online" />
                <Bar dataKey="otherRewardCash" stackId="a" fill={CATEGORY_COLORS.other} name="Other" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
