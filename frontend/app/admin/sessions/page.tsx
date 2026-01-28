'use client';

import { useEffect, useState } from 'react';
import { apiJson } from '@/lib/api';
import { formatTime, formatDuration } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/page-header';
import { PageTransition } from '@/components/motion';
import { EmptyState } from '@/components/empty-state';
import { TableSkeleton } from '@/components/ui/skeleton';
import { Clock } from 'lucide-react';

export default function SessionsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [ambassadorId, setAmbassadorId] = useState('');
  const [ambassadors, setAmbassadors] = useState<any[]>([]);

  useEffect(() => {
    apiJson('/admin/ambassadors').then(setAmbassadors).catch(() => {});
  }, []);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (ambassadorId) params.set('ambassador_id', ambassadorId);
      const data = await apiJson(`/admin/sessions?${params}`);
      setSessions(data);
    } catch {} finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [from, to, ambassadorId]);

  return (
    <PageTransition>
      <PageHeader title="Sessions" description="View all clock in/out sessions" />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex gap-3 flex-1">
          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground">From</label>
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground">To</label>
            <Input type="date" value={to} onChange={e => setTo(e.target.value)} />
          </div>
        </div>
        <div className="sm:w-56">
          <label className="text-xs font-medium text-muted-foreground">Ambassador</label>
          <select
            className="flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={ambassadorId}
            onChange={e => setAmbassadorId(e.target.value)}
          >
            <option value="">All</option>
            {ambassadors.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <Card className="p-6"><TableSkeleton rows={8} cols={5} /></Card>
      ) : sessions.length === 0 ? (
        <EmptyState icon={Clock} title="No sessions found" description="Adjust your filters or wait for ambassadors to clock in" />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-semibold text-muted-foreground">Ambassador</th>
                  <th className="text-left p-3 font-semibold text-muted-foreground">Date</th>
                  <th className="text-left p-3 font-semibold text-muted-foreground hidden sm:table-cell">Clock In</th>
                  <th className="text-left p-3 font-semibold text-muted-foreground hidden sm:table-cell">Clock Out</th>
                  <th className="text-left p-3 font-semibold text-muted-foreground">Duration</th>
                  <th className="text-left p-3 font-semibold text-muted-foreground">Flags</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map(s => {
                  const flags = JSON.parse(s.flags_json || '[]');
                  if (!s.clock_out_at) flags.push('OPEN');
                  return (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                            {s.full_name?.[0]}
                          </div>
                          <span className="font-medium">{s.full_name}</span>
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground">{new Date(s.clock_in_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</td>
                      <td className="p-3 hidden sm:table-cell">{formatTime(s.clock_in_at)}</td>
                      <td className="p-3 hidden sm:table-cell">{s.clock_out_at ? formatTime(s.clock_out_at) : '-'}</td>
                      <td className="p-3 font-semibold">{s.total_minutes != null ? formatDuration(s.total_minutes) : '-'}</td>
                      <td className="p-3">
                        {flags.length > 0 ? (
                          <div className="flex gap-1 flex-wrap">
                            {flags.map((f: string) => <Badge key={f} variant="warning" className="text-[10px]">{f}</Badge>)}
                          </div>
                        ) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </PageTransition>
  );
}
