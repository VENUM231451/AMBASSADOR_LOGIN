'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getUser, clearAuth } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Home, ScanLine, CalendarDays, LogOut, Fingerprint } from 'lucide-react';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/ambassador/home', label: 'Home', icon: Home },
  { href: '/ambassador/scan', label: 'Scan', icon: ScanLine },
  { href: '/ambassador/timesheet', label: 'Timesheet', icon: CalendarDays },
];

export default function AmbassadorLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const u = getUser();
    if (!u || u.role !== 'ambassador') { clearAuth(); router.replace('/login'); return; }
    setUser(u);
  }, [router]);

  function logout() { clearAuth(); router.push('/login'); }

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      {/* Desktop top nav */}
      <header className="sticky top-0 z-30 hidden lg:flex items-center h-14 border-b bg-card/80 backdrop-blur-md px-6">
        <div className="flex items-center gap-2.5 mr-8">
          <Fingerprint className="h-5 w-5 text-primary" />
          <span className="font-bold">Ambassador</span>
        </div>
        <nav className="flex items-center gap-1">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                pathname === item.href
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{user?.full_name}</span>
          <Button variant="ghost" size="sm" onClick={logout}>
            <LogOut className="h-4 w-4 mr-1.5" />
            Sign out
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-2xl px-4 sm:px-6 py-6">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-30 lg:hidden border-t bg-card/90 backdrop-blur-md">
        <div className="flex items-center justify-around h-16 max-w-md mx-auto">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 py-2 px-4 text-xs font-medium transition-colors min-w-[64px]',
                pathname === item.href
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )}
            >
              <item.icon className={cn('h-5 w-5', pathname === item.href && 'text-primary')} />
              {item.label}
            </Link>
          ))}
          <button
            onClick={logout}
            className="flex flex-col items-center gap-1 py-2 px-4 text-xs font-medium text-muted-foreground min-w-[64px]"
          >
            <LogOut className="h-5 w-5" />
            Sign out
          </button>
        </div>
      </nav>
    </div>
  );
}
