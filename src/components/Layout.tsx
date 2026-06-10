import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboardIcon, ReceiptIcon, SettingsIcon, SunIcon, MoonIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStore } from '@/store/useStore';
import { getCurrentMonth, formatCurrency } from '@/lib/rewards';
import { useTheme } from '@/lib/useTheme';

export function Layout() {
  const getMonthlyReward = useStore((s) => s.getMonthlyReward);
  const currentMonth = getCurrentMonth();
  const reward = getMonthlyReward(currentMonth);
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { to: '/', icon: LayoutDashboardIcon, label: 'Dashboard' },
    { to: '/transactions', icon: ReceiptIcon, label: 'Transactions' },
    { to: '/settings', icon: SettingsIcon, label: 'Settings' },
  ];

  return (
    <div className="flex h-dvh flex-col md:flex-row overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border bg-card">
        <div className="flex h-14 items-center justify-between px-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">$</span>
            </div>
            <span className="text-base font-semibold tracking-tight">CashTrack</span>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
          </Button>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`
              }
            >
              <Icon className="size-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">
            This Month&apos;s Reward
          </div>
          <div className="mt-1 text-lg font-semibold text-primary tabular-nums">
            {formatCurrency(reward.totalRewardCash)}
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="flex md:hidden h-12 shrink-0 items-center justify-between border-b border-border bg-card px-4">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary">
            <span className="text-xs font-bold text-primary-foreground">$</span>
          </div>
          <span className="text-sm font-semibold tracking-tight">CashTrack</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-xs" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
          </Button>
          <div className="text-sm font-medium text-primary tabular-nums">
            {formatCurrency(reward.totalRewardCash)}
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
        <div className="mx-auto max-w-4xl px-4 py-4 md:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom tab bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-border bg-card"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2 px-3 min-w-0 flex-1 transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`
            }
          >
            <Icon className="size-5" />
            <span className="text-[10px] font-medium leading-none">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
