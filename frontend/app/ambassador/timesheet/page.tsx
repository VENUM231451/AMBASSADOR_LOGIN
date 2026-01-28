'use client';
import { useEffect, useState } from 'react';
import { apiJson } from '@/lib/api';

export default function TimesheetPage() {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [month, setMonth] = useState(defaultMonth);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    apiJson(`/me/sessions?month=${month}`).then(setData).catch(() => {});
  }, [month]);

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>My Timesheet</h2>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'end' }}>
        <div>
          <label>Month</label>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)} />
        </div>
      </div>

      {data && (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <strong>Total Hours:</strong> {data.total_hours} ({data.total_minutes} minutes)
            &nbsp;|&nbsp; <strong>Sessions:</strong> {data.sessions.length}
          </div>
          <div className="card">
            <table>
              <thead><tr><th>Date</th><th>Clock In</th><th>Clock Out</th><th>Minutes</th><th>Flags</th></tr></thead>
              <tbody>
                {data.sessions.map((s: any) => {
                  const flags = JSON.parse(s.flags_json || '[]');
                  if (!s.clock_out_at) flags.push('OPEN_SESSION');
                  return (
                    <tr key={s.id}>
                      <td>{s.clock_in_at.slice(0, 10)}</td>
                      <td>{new Date(s.clock_in_at).toLocaleTimeString()}</td>
                      <td>{s.clock_out_at ? new Date(s.clock_out_at).toLocaleTimeString() : '-'}</td>
                      <td>{s.total_minutes ?? '-'}</td>
                      <td>{flags.length > 0 ? <span className="badge badge-yellow">{flags.join(', ')}</span> : '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
