'use client';

import { useEffect, useState } from 'react';
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
import { ScanLine, Clock, CalendarDays, CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';

export default function AmbassadorHome() {
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [clocking, setClocking] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [monthData, setMonthData] = useState<any>(null);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const router = useRouter();
  const { toast } = useToast();

  async function loadMe() {
    try {
      const data = await apiJson('/me');
      setMe(data);
    } catch {} finally { setLoading(false); }
  }

  async function loadMonth() {
    try {
      const data = await apiJson(`/me/sessions?month=${currentMonth()}`);
      setMonthData(data);
    } catch {}
  }

  useEffect(() => { loadMe(); loadMonth(); }, []);

  async function handleManualClock() {
    setClocking(true);
    setResult(null);
    try {
      const data = await apiJson('/clock/manual', {
        method: 'POST',
        body: JSON.stringify({ office_id: 'APU_MAIN_OFFICE' }),
      });
      setResult(data);
      toast('success', data.action === 'IN' ? 'Clocked in successfully' : 'Clocked out successfully');
      await loadMe();
      await loadMonth();
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      setClocking(false);
    }
  }

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
        <Card className={me?.open_session ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200'}>
          <CardContent className="py-4 flex items-center gap-4">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
              me?.open_session ? 'bg-emerald-100' : 'bg-slate-100'
            }`}>
              {me?.open_session
                ? <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                : <Circle className="h-5 w-5 text-slate-400" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">
                {me?.open_session ? 'Clocked In' : 'Not Clocked In'}
              </p>
              <p className="text-xs text-muted-foreground">
                {me?.open_session
                  ? `Since ${formatTime(me.open_session.clock_in_at)}`
                  : 'Tap below to start your shift'
                }
              </p>
            </div>
            <Badge variant={me?.open_session ? 'success' : 'secondary'}>
              {me?.open_session ? 'Active' : 'Idle'}
            </Badge>
          </CardContent>
        </Card>

        {/* Primary action */}
        <FadeIn delay={0.05}>
          <Card>
            <CardContent className="py-8 text-center">
              <h2 className="text-lg font-semibold mb-2">Clock {me?.open_session ? 'Out' : 'In'}</h2>
              <p className="text-sm text-muted-foreground mb-6">Tap the button or scan the office QR code</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button size="xl" onClick={handleManualClock} disabled={clocking}>
                  {clocking ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Clock className="h-5 w-5 mr-2" />}
                  {clocking ? 'Processing...' : me?.open_session ? 'Clock Out' : 'Clock In'}
                </Button>
                <Button variant="outline" size="lg" onClick={() => router.push('/ambassador/scan')}>
                  <ScanLine className="h-4 w-4 mr-2" />
                  Scan QR
                </Button>
              </div>
            </CardContent>
          </Card>
        </FadeIn>

        {/* Result sheet */}
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
              value={monthData?.total_hours?.toFixed(1) || '0'}
              icon={Clock}
            />
            <StatCard
              label="Shifts this month"
              value={monthData?.sessions?.length || 0}
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
