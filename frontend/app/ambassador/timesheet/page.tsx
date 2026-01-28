'use client';

import { useEffect, useState } from 'react';
import { apiJson } from '@/lib/api';
import { formatTime, formatDuration, currentMonth } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { PageTransition } from '@/components/motion';
import { EmptyState } from '@/components/empty-state';
import { TableSkeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/page-header';
import { Clock, CalendarDays } from 'lucide-react';

export default function TimesheetPage() {
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiJson(`/me/sessions?month=${month}`)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [month]);

  return (
    <PageTransition>
      <PageHeader title="My Timesheet" description="View your shifts and hours" />

      <div className="mb-6">
        <Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="max-w-[200px]" />
      </div>

      {data && !loading && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Total Hours</p>
            <p className="text-xl font-bold">{data.total_hours}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Total Shifts</p>
            <p className="text-xl font-bold">{data.sessions.length}</p>
          </Card>
        </div>
      )}

      {loading ? (
        <Card className="p-6"><TableSkeleton rows={5} cols={4} /></Card>
      ) : !data?.sessions?.length ? (
        <EmptyState icon={CalendarDays} title="No shifts yet" description="No shifts recorded for this month" />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-semibold text-muted-foreground">Date</th>
                  <th className="text-left p-3 font-semibold text-muted-foreground">In</th>
                  <th className="text-left p-3 font-semibold text-muted-foreground">Out</th>
                  <th className="text-left p-3 font-semibold text-muted-foreground">Duration</th>
                  <th className="text-left p-3 font-semibold text-muted-foreground">Flags</th>
                </tr>
              </thead>
              <tbody>
                {data.sessions.map((s: any) => {
                  const flags = JSON.parse(s.flags_json || '[]');
                  if (!s.clock_out_at) flags.push('OPEN');
                  return (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="p-3 font-medium">{new Date(s.clock_in_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</td>
                      <td className="p-3">{formatTime(s.clock_in_at)}</td>
                      <td className="p-3">{s.clock_out_at ? formatTime(s.clock_out_at) : '-'}</td>
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
