import { useState, useRef } from 'react';
import { Trash2Icon, PlusIcon, DownloadIcon, UploadIcon, AlertTriangleIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useStore } from '@/store/useStore';
import type { Transaction } from '@/types';

export default function Settings() {
  const designatedShops = useStore((s) => s.designatedShops);
  const config = useStore((s) => s.config);
  const transactions = useStore((s) => s.transactions);
  const addDesignatedShop = useStore((s) => s.addDesignatedShop);
  const removeDesignatedShop = useStore((s) => s.removeDesignatedShop);
  const updateConfig = useStore((s) => s.updateConfig);
  const importTransactions = useStore((s) => s.importTransactions);
  const clearAllData = useStore((s) => s.clearAllData);

  const [newShop, setNewShop] = useState('');
  const [formConfig, setFormConfig] = useState({ ...config });
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleAddShop() {
    const name = newShop.trim().toLowerCase();
    if (!name) return;
    if (designatedShops.some((s) => s.name === name)) return;
    addDesignatedShop(name);
    setNewShop('');
  }

  function handleSaveConfig() {
    updateConfig(formConfig);
  }

  function handleExport() {
    const data = {
      transactions,
      designatedShops,
      config,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `money-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (Array.isArray(data.transactions)) {
          importTransactions(data.transactions as Transaction[]);
        }
      } catch {
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function handleClear() {
    clearAllData();
    setShowClearConfirm(false);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage shops, reward rates, and data</p>
      </div>

      <Tabs defaultValue="shops">
        <TabsList>
          <TabsTrigger value="shops">Shops</TabsTrigger>
          <TabsTrigger value="rates">Rates</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
        </TabsList>

        <TabsContent value="shops" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Designated Shops</CardTitle>
              <CardDescription>
                Transactions matching these shop names will be auto-categorized as &ldquo;Designated Shop&rdquo;
                with 8% reward cash.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Add shop name (e.g. uniqlo)"
                  value={newShop}
                  onChange={(e) => setNewShop(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddShop()}
                />
                <Button variant="outline" size="icon" onClick={handleAddShop}>
                  <PlusIcon className="size-4" />
                </Button>
              </div>
              <Separator />
              {designatedShops.length === 0 ? (
                <p className="text-sm text-muted-foreground">No designated shops configured.</p>
              ) : (
                <div className="space-y-2">
                  {designatedShops.map((shop) => (
                    <div
                      key={shop.name}
                      className="flex items-center justify-between rounded-lg border px-3 py-2"
                    >
                      <span className="text-sm font-medium capitalize">{shop.name}</span>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => removeDesignatedShop(shop.name)}
                      >
                        <Trash2Icon className="size-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rates" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Reward Rate Configuration</CardTitle>
              <CardDescription>
                Adjust caps and rates. Changes take effect immediately for all calculations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Designated Shops</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="designatedCap">Monthly Cap (HKD)</Label>
                    <Input
                      id="designatedCap"
                      type="number"
                      min="0"
                      step="1"
                      value={formConfig.designatedCap}
                      onChange={(e) =>
                        setFormConfig((p) => ({
                          ...p,
                          designatedCap: Number(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="designatedRate">Reward Rate (%)</Label>
                    <Input
                      id="designatedRate"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={formConfig.designatedRate * 100}
                      onChange={(e) =>
                        setFormConfig((p) => ({
                          ...p,
                          designatedRate: (Number(e.target.value) || 0) / 100,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Online Shopping</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="onlineCap">Monthly Cap (HKD)</Label>
                    <Input
                      id="onlineCap"
                      type="number"
                      min="0"
                      step="1"
                      value={formConfig.onlineCap}
                      onChange={(e) =>
                        setFormConfig((p) => ({
                          ...p,
                          onlineCap: Number(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="onlineRate">Reward Rate (%)</Label>
                    <Input
                      id="onlineRate"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={formConfig.onlineRate * 100}
                      onChange={(e) =>
                        setFormConfig((p) => ({
                          ...p,
                          onlineRate: (Number(e.target.value) || 0) / 100,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Base Rate (Other &amp; After Cap)</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="baseRate">Base Reward Rate (%)</Label>
                    <Input
                      id="baseRate"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={formConfig.baseRate * 100}
                      onChange={(e) =>
                        setFormConfig((p) => ({
                          ...p,
                          baseRate: (Number(e.target.value) || 0) / 100,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <Button onClick={handleSaveConfig}>Save Configuration</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Data Management</CardTitle>
              <CardDescription>
                Export your data as backup or import from a previous backup.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={handleExport}>
                  <DownloadIcon className="size-4" />
                  Export Backup (JSON)
                </Button>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <UploadIcon className="size-4" />
                  Import Backup (JSON)
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImport}
                />
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-destructive">Danger Zone</h4>
                <p className="text-sm text-muted-foreground">
                  This will permanently delete all transactions, shops, and reset configuration.
                </p>
                {!showClearConfirm ? (
                  <Button variant="destructive" onClick={() => setShowClearConfirm(true)}>
                    <AlertTriangleIcon className="size-4" />
                    Clear All Data
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button variant="destructive" onClick={handleClear}>
                      Confirm Clear All
                    </Button>
                    <Button variant="outline" onClick={() => setShowClearConfirm(false)}>
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
