'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getUser, clearAuth } from '@/lib/api';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Users, Clock, FileBarChart, LogOut, Menu, X, Fingerprint } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimatePresence, motion } from 'framer-motion';

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/ambassadors', label: 'Ambassadors', icon: Users },
  { href: '/admin/sessions', label: 'Sessions', icon: Clock },
  { href: '/admin/reports', label: 'Reports', icon: FileBarChart },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const u = getUser();
    if (!u || u.role !== 'admin') { clearAuth(); router.replace('/login'); return; }
    setUser(u);
  }, [router]);

  function logout() { clearAuth(); router.push('/login'); }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden lg:flex lg:w-64 flex-col border-r bg-card">
        <div className="flex items-center gap-2.5 px-6 h-16 border-b">
          <Fingerprint className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg">ClockAdmin</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                pathname === item.href
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
              {user?.full_name?.[0] || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.full_name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={logout}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-30 lg:hidden flex items-center justify-between h-14 border-b bg-card/80 backdrop-blur-md px-4">
        <div className="flex items-center gap-2">
          <Fingerprint className="h-5 w-5 text-primary" />
          <span className="font-bold">ClockAdmin</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)}>
          <Menu className="h-5 w-5" />
        </Button>
      </header>

      {/* Mobile slide-in menu */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/40 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 w-72 bg-card border-r lg:hidden"
            >
              <div className="flex items-center justify-between px-6 h-14 border-b">
                <span className="font-bold">Menu</span>
                <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <nav className="px-3 py-4 space-y-1">
                {navItems.map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                      pathname === item.href
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="absolute bottom-0 left-0 right-0 border-t p-4">
                <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={logout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
