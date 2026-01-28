'use client';
import { useEffect, useState } from 'react';
import { apiJson } from '@/lib/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ activeAmbassadors: 0, sessionsThisMonth: 0, flaggedSessions: 0 });

  useEffect(() => {
    async function load() {
      try {
        const ambassadors = await apiJson('/admin/ambassadors');
        const active = ambassadors.filter((a: any) => a.status === 'active' && a.role === 'ambassador').length;

        const now = new Date();
        const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const report = await apiJson(`/admin/reports/timesheets?month=${month}`);

        const totalSessions = report.rows?.length || 0;
        const flagged = (report.rows || []).filter((r: any) => {
          const flags = JSON.parse(r.flags_json || '[]');
          return flags.length > 0 || !r.clock_out_at;
        }).length;

        setStats({ activeAmbassadors: active, sessionsThisMonth: totalSessions, flaggedSessions: flagged });
      } catch {}
    }
    load();
  }, []);

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Dashboard</h2>
      <div className="grid3">
        <div className="card tile">
          <div className="number">{stats.activeAmbassadors}</div>
          <div className="label">Active Ambassadors</div>
        </div>
        <div className="card tile">
          <div className="number">{stats.sessionsThisMonth}</div>
          <div className="label">Sessions This Month</div>
        </div>
        <div className="card tile">
          <div className="number">{stats.flaggedSessions}</div>
          <div className="label">Flagged Sessions</div>
        </div>
      </div>
    </div>
  );
}
