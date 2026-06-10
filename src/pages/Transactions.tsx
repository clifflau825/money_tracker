import { useState, useMemo, useRef } from 'react';
import { Trash2Icon, PencilIcon, PlusIcon, UploadIcon, ReceiptIcon } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useStore } from '@/store/useStore';
import { formatCurrency, formatPercent, getCurrentMonth, calculateMonthlyReward } from '@/lib/rewards';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '@/types';
import type { Transaction, TransactionCategory } from '@/types';

function formatDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  return `${m}/${d}`;
}

function CategoryBadge({ category }: { category: TransactionCategory }) {
  const colors: Record<TransactionCategory, string> = {
    designated: 'bg-indigo-100 text-indigo-700',
    online: 'bg-sky-100 text-sky-700',
    other: 'bg-slate-100 text-slate-600',
  };
  return (
    <span className={`inline-flex rounded-md px-1.5 py-0.5 text-xs font-medium ${colors[category]}`}>
      {CATEGORY_LABELS[category]}
    </span>
  );
}

export function Transactions() {
  const transactions = useStore((s) => s.transactions);
  const config = useStore((s) => s.config);
  const addTransaction = useStore((s) => s.addTransaction);
  const updateTransaction = useStore((s) => s.updateTransaction);
  const deleteTransaction = useStore((s) => s.deleteTransaction);
  const getAllMonths = useStore((s) => s.getAllMonths);
  const importTransactions = useStore((s) => s.importTransactions);
  const getCategoryForShop = useStore((s) => s.getCategoryForShop);

  const months = getAllMonths();
  const currentMonth = getCurrentMonth();

  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    shop: '',
    description: '',
    category: 'other' as TransactionCategory,
  });

  const sortedTransactions = useMemo(() => {
    return [...transactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return sortedTransactions.filter((t) => {
      if (monthFilter !== 'all' && !t.date.startsWith(monthFilter)) return false;
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
      if (search && !t.shop.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [sortedTransactions, monthFilter, categoryFilter, search]);

  const summary = useMemo(() => {
    const count = filteredTransactions.length;
    const total = filteredTransactions.reduce((s, t) => s + t.amount, 0);
    const currentMonthTxs = filteredTransactions.filter((t) => t.date.startsWith(currentMonth));
    const monthlyReward = calculateMonthlyReward(currentMonthTxs, currentMonth, config);
    return { count, total, reward: monthlyReward.totalRewardCash };
  }, [filteredTransactions, currentMonth, config]);

  const recentShops = useMemo(() => {
    const seen = new Set<string>();
    const shops: string[] = [];
    for (const t of sortedTransactions) {
      if (!seen.has(t.shop)) {
        seen.add(t.shop);
        shops.push(t.shop);
        if (shops.length >= 5) break;
      }
    }
    return shops;
  }, [sortedTransactions]);

  const recentDescriptions = useMemo(() => {
    const seen = new Set<string>();
    const descs: string[] = [];
    for (const t of sortedTransactions) {
      if (t.description && !seen.has(t.description)) {
        seen.add(t.description);
        descs.push(t.description);
        if (descs.length >= 5) break;
      }
    }
    return descs;
  }, [sortedTransactions]);

  const designatedShopsState = useStore((s) => s.designatedShops);

  function calculateTransactionReward(tx: Transaction): { rate: number; cash: number } {
    if (tx.category === 'other') {
      return { rate: config.baseRate, cash: Math.round(tx.amount * config.baseRate * 100) / 100 };
    }
    const monthTxs = transactions
      .filter((t) => t.date.startsWith(tx.date.substring(0, 7)) && t.category === tx.category)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const cap = tx.category === 'designated' ? config.designatedCap : config.onlineCap;
    const rate = tx.category === 'designated' ? config.designatedRate : config.onlineRate;

    let cumulativeBefore = 0;
    for (const t of monthTxs) {
      if (t.id === tx.id) break;
      cumulativeBefore += t.amount;
    }

    const remainingCap = Math.max(cap - cumulativeBefore, 0);
    const withinCap = Math.min(tx.amount, remainingCap);
    const overCap = tx.amount - withinCap;

    const cash = withinCap * rate + overCap * config.baseRate;
    const effectiveRate = withinCap > 0 ? rate : config.baseRate;
    return {
      rate: effectiveRate,
      cash: Math.round(cash * 100) / 100,
    };
  }

  function openAddDialog() {
    setEditingId(null);
    setForm({
      date: new Date().toISOString().split('T')[0],
      amount: '',
      shop: '',
      description: '',
      category: 'other',
    });
    setDialogOpen(true);
  }

  function openEditDialog(tx: Transaction) {
    setEditingId(tx.id);
    setForm({
      date: tx.date,
      amount: String(tx.amount),
      shop: tx.shop,
      description: tx.description,
      category: tx.category,
    });
    setDialogOpen(true);
  }

  function handleShopChange(shop: string) {
    const detected = getCategoryForShop(shop);
    setForm((prev) => ({ ...prev, shop, category: detected }));
  }

  function handleSubmit() {
    const amount = parseFloat(form.amount);
    if (!form.date || !form.shop || isNaN(amount) || amount <= 0) return;

    const data = {
      date: form.date,
      amount,
      shop: form.shop.trim(),
      description: form.description.trim(),
      category: form.category,
    };

    if (editingId) {
      updateTransaction(editingId, data);
    } else {
      addTransaction(data);
    }
    setDialogOpen(false);
  }

  function handleCSVImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter((l) => l.trim());
      if (lines.length < 2) return;

      const newTxs: Transaction[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map((c) => c.trim());
        if (cols.length < 3) continue;
        const [date, amountStr, shop, description = '', category = 'other'] = cols;
        const amount = parseFloat(amountStr);
        if (!date || isNaN(amount) || !shop) continue;

        newTxs.push({
          id: crypto.randomUUID(),
          date,
          amount,
          shop,
          description,
          category: category as TransactionCategory,
          createdAt: new Date().toISOString(),
        });
      }
      if (newTxs.length > 0) {
        importTransactions(newTxs);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  const monthOptions = months.length > 0 ? months : [currentMonth];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
          <p className="text-sm text-muted-foreground">Manage your spending records</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleCSVImport}
          />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <UploadIcon className="size-3.5" />
            Import CSV
          </Button>
          <Button size="sm" onClick={openAddDialog}>
            <PlusIcon className="size-3.5" />
            Add
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={monthFilter} onValueChange={(v) => { if (v) setMonthFilter(v); }}>
              <SelectTrigger size="sm" className="w-36">
                <SelectValue placeholder="All months" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All months</SelectItem>
                {monthOptions.map((m) => {
                  const d = new Date(Number(m.split('-')[0]), Number(m.split('-')[1]) - 1);
                  return (
                    <SelectItem key={m} value={m}>
                      {d.toLocaleString('en-US', { month: 'short', year: 'numeric' })}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={(v) => { if (v) setCategoryFilter(v); }}>
              <SelectTrigger size="sm" className="w-36">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                <SelectItem value="designated">Designated Shops</SelectItem>
                <SelectItem value="online">Online Shopping</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Search shop..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7 w-full text-sm sm:w-48"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ReceiptIcon className="mb-3 size-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No transactions found</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={openAddDialog}>
                <PlusIcon className="size-3.5" />
                Add your first transaction
              </Button>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">Date</TableHead>
                      <TableHead>Shop</TableHead>
                      <TableHead className="hidden lg:table-cell">Description</TableHead>
                      <TableHead className="w-28">Category</TableHead>
                      <TableHead className="w-24 text-right">Amount</TableHead>
                      <TableHead className="w-20 text-right">Rate</TableHead>
                      <TableHead className="w-24 text-right">Reward</TableHead>
                      <TableHead className="w-16" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((tx) => {
                      const reward = calculateTransactionReward(tx);
                      return (
                        <TableRow key={tx.id}>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatDate(tx.date)}
                          </TableCell>
                          <TableCell className="font-medium">{tx.shop}</TableCell>
                          <TableCell className="hidden max-w-32 truncate lg:table-cell text-muted-foreground">
                            {tx.description || '—'}
                          </TableCell>
                          <TableCell>
                            <CategoryBadge category={tx.category} />
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatCurrency(tx.amount)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">
                            {formatPercent(reward.rate)}
                          </TableCell>
                          <TableCell
                            className="text-right tabular-nums font-medium"
                            style={{ color: CATEGORY_COLORS[tx.category] }}
                          >
                            {formatCurrency(reward.cash)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-0.5">
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => openEditDialog(tx)}
                              >
                                <PencilIcon className="size-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => deleteTransaction(tx.id)}
                              >
                                <Trash2Icon className="size-3 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile card list */}
              <div className="space-y-2 md:hidden">
                {filteredTransactions.map((tx) => {
                  const reward = calculateTransactionReward(tx);
                  return (
                    <div
                      key={tx.id}
                      className="rounded-lg border border-border p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{tx.shop}</span>
                            <CategoryBadge category={tx.category} />
                          </div>
                          {tx.description && (
                            <p className="mt-0.5 text-xs text-muted-foreground truncate">
                              {tx.description}
                            </p>
                          )}
                          <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{formatDate(tx.date)}</span>
                            <span style={{ color: CATEGORY_COLORS[tx.category] }}>
                              {formatPercent(reward.rate)} → {formatCurrency(reward.cash)}
                            </span>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className="text-sm font-semibold tabular-nums">
                            {formatCurrency(tx.amount)}
                          </span>
                          <div className="flex items-center gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => openEditDialog(tx)}
                            >
                              <PencilIcon className="size-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => deleteTransaction(tx.id)}
                            >
                              <Trash2Icon className="size-3 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm text-muted-foreground">
                <span>
                  {summary.count} transaction{summary.count !== 1 ? 's' : ''}
                </span>
                <span>
                  Total: {formatCurrency(summary.total)} &middot; Reward:{' '}
                  <span className="font-medium text-primary">{formatCurrency(summary.reward)}</span>
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Transaction' : 'Add Transaction'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="amount">Amount (HKD)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="shop">Shop</Label>
              {recentShops.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {recentShops.map((shop) => (
                    <button
                      key={shop}
                      type="button"
                      onClick={() => handleShopChange(shop)}
                      className="inline-flex items-center rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted active:scale-95"
                    >
                      {shop}
                    </button>
                  ))}
                </div>
              )}
              {designatedShopsState.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {designatedShopsState.map((ds) => (
                    <button
                      key={ds.name}
                      type="button"
                      onClick={() => handleShopChange(ds.name)}
                      className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100 active:scale-95 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 dark:hover:bg-indigo-900"
                    >
                      <span className="size-1.5 rounded-full bg-indigo-500" />
                      {ds.name}
                    </button>
                  ))}
                </div>
              )}
              <Input
                id="shop"
                placeholder="Or type a new shop..."
                value={form.shop}
                onChange={(e) => handleShopChange(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="description">Description (optional)</Label>
              {recentDescriptions.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {recentDescriptions.map((desc) => (
                    <button
                      key={desc}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, description: desc }))}
                      className="inline-flex items-center rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted active:scale-95"
                    >
                      {desc}
                    </button>
                  ))}
                </div>
              )}
              <Input
                id="description"
                placeholder="Or type a new description..."
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm((p) => ({ ...p, category: v as TransactionCategory }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="designated">Designated Shop (8%)</SelectItem>
                  <SelectItem value="online">Online Shopping (4%)</SelectItem>
                  <SelectItem value="other">Other (0.4%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingId ? 'Save Changes' : 'Add Transaction'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
