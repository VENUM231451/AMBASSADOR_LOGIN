'use client';
import { useEffect, useState } from 'react';
import { apiJson, getToken } from '@/lib/api';

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001/api';

export default function ReportsPage() {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [month, setMonth] = useState(defaultMonth);
  const [summary, setSummary] = useState<any[]>([]);
  const [ambassadors, setAmbassadors] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    apiJson('/admin/ambassadors').then(setAmbassadors).catch(() => {});
  }, []);

  async function load() {
    const data = await apiJson(`/admin/reports/timesheets?month=${month}`);
    setSummary(data.summary || []);
    setLoaded(true);
  }

  function downloadExcel() {
    const token = getToken();
    window.open(`${API}/admin/reports/timesheets.xlsx?month=${month}&token=${token}`, '_blank');
  }

  function downloadIndividual(ambassadorId: string) {
    const token = getToken();
    window.open(`${API}/admin/reports/ambassador/${ambassadorId}/timesheet.xlsx?month=${month}&token=${token}`, '_blank');
  }

  // Map email to ambassador id for individual download
  function findAmbassadorId(email: string): string | null {
    const a = ambassadors.find((a: any) => a.email === email);
    return a?.id || null;
  }

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Monthly Reports</h2>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'end' }}>
        <div>
          <label>Month</label>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={load}>Load</button>
        <button className="btn btn-secondary" onClick={downloadExcel}>Download All (Excel)</button>
      </div>

      {loaded && (
        <div className="card">
          <table>
            <thead>
              <tr><th>Name</th><th>Email</th><th>Shifts</th><th>Hours</th><th>Minutes</th><th>Flags</th><th>Export</th></tr>
            </thead>
            <tbody>
              {summary.map((s, i) => {
                const ambId = findAmbassadorId(s.email);
                return (
                  <tr key={i}>
                    <td>{s.full_name}</td>
                    <td>{s.email}</td>
                    <td>{s.shifts}</td>
                    <td>{(s.totalMinutes / 60).toFixed(2)}</td>
                    <td>{s.totalMinutes}</td>
                    <td>{s.flagsCount > 0 ? <span className="badge badge-yellow">{s.flagsCount}</span> : '0'}</td>
                    <td>
                      {ambId && (
                        <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }}
                                onClick={() => downloadIndividual(ambId)}>
                          Download
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {summary.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: '#999' }}>No data for this month</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
