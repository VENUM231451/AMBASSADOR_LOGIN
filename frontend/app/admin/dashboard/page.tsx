'use client';

import { useEffect, useState } from 'react';
import { apiJson } from '@/lib/api';
import { currentMonth, formatDuration } from '@/lib/utils';
import { StatCard } from '@/components/stat-card';
import { PageHeader } from '@/components/page-header';
import { PageTransition, FadeIn } from '@/components/motion';
import { CardSkeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Clock, Timer, AlertTriangle } from 'lucide-react';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ active: 0, sessions: 0, hours: 0, flagged: 0 });
  const [flaggedSessions, setFlaggedSessions] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const [ambassadors, report] = await Promise.all([
          apiJson('/admin/ambassadors'),
          apiJson(`/admin/reports/timesheets?month=${currentMonth()}`),
        ]);
        const active = ambassadors.filter((a: any) => a.status === 'active' && a.role === 'ambassador').length;
        const rows = report.rows || [];
        const totalMin = rows.reduce((s: number, r: any) => s + (r.total_minutes || 0), 0);
        const flagged = rows.filter((r: any) => {
          const flags = JSON.parse(r.flags_json || '[]');
          return flags.length > 0 || !r.clock_out_at;
        });
        setStats({ active, sessions: rows.length, hours: Math.round((totalMin / 60) * 10) / 10, flagged: flagged.length });
        setFlaggedSessions(flagged.slice(0, 5));
      } catch {} finally { setLoading(false); }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div>
        <PageHeader title="Dashboard" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <CardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <PageHeader title="Dashboard" description="Overview of this month's activity" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <FadeIn delay={0}><StatCard label="Active Ambassadors" value={stats.active} icon={Users} /></FadeIn>
        <FadeIn delay={0.05}><StatCard label="Shifts This Month" value={stats.sessions} icon={Clock} /></FadeIn>
        <FadeIn delay={0.1}><StatCard label="Total Hours" value={stats.hours} icon={Timer} /></FadeIn>
        <FadeIn delay={0.15}><StatCard label="Flagged Sessions" value={stats.flagged} icon={AlertTriangle} /></FadeIn>
      </div>

      {flaggedSessions.length > 0 && (
        <FadeIn delay={0.2}>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">Recent Flags</h3>
          <Card>
            <div className="divide-y">
              {flaggedSessions.map((s: any) => {
                const flags = JSON.parse(s.flags_json || '[]');
                if (!s.clock_out_at) flags.push('OPEN_SESSION');
                return (
                  <div key={s.id} className="flex items-center justify-between p-4">
                    <div>
                      <p className="text-sm font-medium">{s.full_name}</p>
                      <p className="text-xs text-muted-foreground">{new Date(s.clock_in_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-1.5">
                      {flags.map((f: string) => <Badge key={f} variant="warning">{f}</Badge>)}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </FadeIn>
      )}
    </PageTransition>
  );
}
