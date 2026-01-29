'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiJson } from '@/lib/api';
import { formatTime, formatDuration, currentMonth } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/stat-card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageTransition, FadeIn } from '@/components/motion';
import { useToast } from '@/components/toast-provider';
import { ScanLine, Clock, CalendarDays, CheckCircle2, Circle, Loader2, Timer } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';

function ElapsedTimer({ clockInAt }: { clockInAt: string }) {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    function update() {
      const diff = Date.now() - new Date(clockInAt).getTime();
      if (diff < 0) { setElapsed('0h 0m 0s'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setElapsed(`${h}h ${m}m ${s}s`);
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [clockInAt]);

  return (
    <div className="flex items-center gap-2 mt-2">
      <Timer className="h-4 w-4 text-emerald-600 animate-pulse" />
      <span className="text-lg font-bold text-emerald-700 tabular-nums">{elapsed}</span>
    </div>
  );
}

export default function AmbassadorHome() {
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [clocking, setClocking] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [monthData, setMonthData] = useState<any>(null);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const router = useRouter();
  const { toast } = useToast();

  const loadMe = useCallback(async () => {
    try {
      const data = await apiJson('/me');
      setMe(data);
    } catch (e: any) {
      console.error('loadMe error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMonth = useCallback(async () => {
    try {
      const data = await apiJson(`/me/sessions?month=${currentMonth()}`);
      setMonthData(data);
    } catch (e: any) {
      console.error('loadMonth error:', e);
    }
  }, []);

  useEffect(() => {
    loadMe();
    loadMonth();
  }, [loadMe, loadMonth]);

  async function handleManualClock() {
    if (clocking) return;
    setClocking(true);
    setResult(null);
    try {
      const data = await apiJson('/clock/manual', {
        method: 'POST',
        body: JSON.stringify({ office_id: 'APU_MAIN_OFFICE' }),
      });
      setResult(data);
      toast('success', data.action === 'IN' ? 'Clocked in successfully!' : 'Clocked out successfully!');
      // Refresh state
      await loadMe();
      await loadMonth();
    } catch (e: any) {
      console.error('Manual clock error:', e);
      toast('error', e.message || 'Failed to clock in/out. Please try again.');
    } finally {
      setClocking(false);
    }
  }

  const isClockedIn = !!me?.open_session;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Status banner */}
        <Card className={isClockedIn ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200'}>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                isClockedIn ? 'bg-emerald-100' : 'bg-slate-100'
              }`}>
                {isClockedIn
                  ? <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  : <Circle className="h-5 w-5 text-slate-400" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">
                  {isClockedIn ? 'Clocked In' : 'Not Clocked In'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isClockedIn
                    ? `Since ${formatTime(me.open_session.clock_in_at)}`
                    : 'Tap below to start your shift'
                  }
                </p>
                {/* Live elapsed timer */}
                {isClockedIn && me.open_session.clock_in_at && (
                  <ElapsedTimer clockInAt={me.open_session.clock_in_at} />
                )}
              </div>
              <Badge variant={isClockedIn ? 'success' : 'secondary'}>
                {isClockedIn ? 'Active' : 'Idle'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Primary action */}
        <FadeIn delay={0.05}>
          <Card>
            <CardContent className="py-8 text-center">
              <h2 className="text-lg font-semibold mb-2">Clock {isClockedIn ? 'Out' : 'In'}</h2>
              <p className="text-sm text-muted-foreground mb-6">Tap the button or scan the office QR code</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  size="xl"
                  onClick={handleManualClock}
                  disabled={clocking}
                  className={isClockedIn ? 'bg-red-600 hover:bg-red-700' : ''}
                >
                  {clocking ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Clock className="h-5 w-5 mr-2" />}
                  {clocking ? 'Processing...' : isClockedIn ? 'Clock Out' : 'Clock In'}
                </Button>
                <Button variant="outline" size="lg" onClick={() => router.push('/ambassador/scan')}>
                  <ScanLine className="h-4 w-4 mr-2" />
                  Scan QR
                </Button>
              </div>
            </CardContent>
          </Card>
        </FadeIn>

        {/* Result feedback */}
        <AnimatePresence>
          {result && (
            <FadeIn>
              <Card className={result.action === 'IN' ? 'border-emerald-200 bg-emerald-50/30' : 'border-blue-200 bg-blue-50/30'}>
                <CardContent className="py-5 text-center">
                  <Badge variant={result.action === 'IN' ? 'success' : 'default'} className="text-sm px-4 py-1.5 mb-3">
                    Clocked {result.action}
                  </Badge>
                  {result.total_minutes != null && (
                    <p className="text-sm text-muted-foreground">
                      Shift duration: <span className="font-semibold text-foreground">{formatDuration(result.total_minutes)}</span>
                    </p>
                  )}
                </CardContent>
              </Card>
            </FadeIn>
          )}
        </AnimatePresence>

        {/* Stats */}
        <FadeIn delay={0.1}>
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              label="Hours this month"
              value={monthData ? (monthData.total_hours?.toFixed(1) ?? '0') : '—'}
              icon={Clock}
            />
            <StatCard
              label="Shifts this month"
              value={monthData ? (monthData.sessions?.length ?? 0) : '—'}
              icon={CalendarDays}
            />
          </div>
        </FadeIn>

        {/* Recent sessions */}
        {monthData?.sessions?.length > 0 && (
          <FadeIn delay={0.15}>
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Recent shifts</h3>
              <div className="space-y-2">
                {monthData.sessions.slice(0, 3).map((s: any) => {
                  const flags = JSON.parse(s.flags_json || '[]');
                  if (!s.clock_out_at) flags.push('OPEN');
                  return (
                    <Card key={s.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedSession(s)}>
                      <CardContent className="py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{new Date(s.clock_in_at).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatTime(s.clock_in_at)} {s.clock_out_at ? `- ${formatTime(s.clock_out_at)}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {flags.length > 0 && <Badge variant="warning" className="text-[10px]">{flags[0]}</Badge>}
                          <span className="text-sm font-semibold">
                            {s.total_minutes != null ? formatDuration(s.total_minutes) : '-'}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </FadeIn>
        )}
      </div>

      {/* Session detail sheet */}
      <Sheet open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Shift Details</SheetTitle>
            <SheetDescription>
              {selectedSession && new Date(selectedSession.clock_in_at).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </SheetDescription>
          </SheetHeader>
          {selectedSession && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Clock In</p>
                  <p className="font-semibold">{formatTime(selectedSession.clock_in_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Clock Out</p>
                  <p className="font-semibold">{selectedSession.clock_out_at ? formatTime(selectedSession.clock_out_at) : '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="font-semibold">{selectedSession.total_minutes != null ? formatDuration(selectedSession.total_minutes) : '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Method</p>
                  <p className="font-semibold">{selectedSession.clock_in_method}</p>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </PageTransition>
  );
}
