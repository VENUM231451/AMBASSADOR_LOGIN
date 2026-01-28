'use client';

import { useEffect, useState } from 'react';
import { apiJson, getToken } from '@/lib/api';
import { currentMonth } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/page-header';
import { PageTransition } from '@/components/motion';
import { EmptyState } from '@/components/empty-state';
import { TableSkeleton } from '@/components/ui/skeleton';
import { Download, FileBarChart } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001/api';

export default function ReportsPage() {
  const [month, setMonth] = useState(currentMonth());
  const [summary, setSummary] = useState<any[]>([]);
  const [ambassadors, setAmbassadors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    apiJson('/admin/ambassadors').then(setAmbassadors).catch(() => {});
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await apiJson(`/admin/reports/timesheets?month=${month}`);
      setSummary(data.summary || []);
      setLoaded(true);
    } catch {} finally { setLoading(false); }
  }

  function downloadAll() {
    const token = getToken();
    window.open(`${API}/admin/reports/timesheets.xlsx?month=${month}&token=${token}`, '_blank');
  }

  function downloadIndividual(email: string) {
    const a = ambassadors.find((a: any) => a.email === email);
    if (!a) return;
    const token = getToken();
    window.open(`${API}/admin/reports/ambassador/${a.id}/timesheet.xlsx?month=${month}&token=${token}`, '_blank');
  }

  return (
    <PageTransition>
      <PageHeader title="Monthly Reports" description="Export and review ambassador timesheets">
        <Button onClick={downloadAll} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Download All
        </Button>
      </PageHeader>

      <div className="flex gap-3 mb-6 items-end">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Month</label>
          <Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-[180px]" />
        </div>
        <Button onClick={load} disabled={loading}>
          {loading ? 'Loading...' : 'Load Report'}
        </Button>
      </div>

      {loading ? (
        <Card className="p-6"><TableSkeleton rows={5} cols={6} /></Card>
      ) : !loaded ? (
        <EmptyState icon={FileBarChart} title="Select a month" description="Pick a month and click Load to view the report" />
      ) : summary.length === 0 ? (
        <EmptyState icon={FileBarChart} title="No data for this month" description="No sessions recorded during this period" />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-semibold text-muted-foreground">Name</th>
                  <th className="text-left p-3 font-semibold text-muted-foreground hidden sm:table-cell">Email</th>
                  <th className="text-right p-3 font-semibold text-muted-foreground">Shifts</th>
                  <th className="text-right p-3 font-semibold text-muted-foreground">Hours</th>
                  <th className="text-right p-3 font-semibold text-muted-foreground hidden sm:table-cell">Minutes</th>
                  <th className="text-center p-3 font-semibold text-muted-foreground">Flags</th>
                  <th className="text-center p-3 font-semibold text-muted-foreground">Export</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((s, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="p-3 font-medium">{s.full_name}</td>
                    <td className="p-3 hidden sm:table-cell text-muted-foreground">{s.email}</td>
                    <td className="p-3 text-right">{s.shifts}</td>
                    <td className="p-3 text-right font-semibold">{(s.totalMinutes / 60).toFixed(1)}</td>
                    <td className="p-3 text-right hidden sm:table-cell text-muted-foreground">{s.totalMinutes}</td>
                    <td className="p-3 text-center">
                      {s.flagsCount > 0 ? <Badge variant="warning">{s.flagsCount}</Badge> : <span className="text-muted-foreground">0</span>}
                    </td>
                    <td className="p-3 text-center">
                      <Button variant="ghost" size="sm" onClick={() => downloadIndividual(s.email)}>
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </PageTransition>
  );
}
