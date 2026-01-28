'use client';
import { useEffect, useState } from 'react';
import { apiJson } from '@/lib/api';

export default function SessionsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [ambassadorId, setAmbassadorId] = useState('');
  const [ambassadors, setAmbassadors] = useState<any[]>([]);

  useEffect(() => {
    apiJson('/admin/ambassadors').then(setAmbassadors).catch(() => {});
  }, []);

  async function load() {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (ambassadorId) params.set('ambassador_id', ambassadorId);
    const data = await apiJson(`/admin/sessions?${params}`);
    setSessions(data);
  }

  useEffect(() => { load(); }, [from, to, ambassadorId]);

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Sessions</h2>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div>
          <label>From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div>
          <label>To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} />
        </div>
        <div>
          <label>Ambassador</label>
          <select value={ambassadorId} onChange={e => setAmbassadorId(e.target.value)}>
            <option value="">All</option>
            {ambassadors.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
          </select>
        </div>
      </div>
      <div className="card">
        <table>
          <thead>
            <tr><th>Ambassador</th><th>Clock In</th><th>Clock Out</th><th>Minutes</th><th>Flags</th></tr>
          </thead>
          <tbody>
            {sessions.map(s => {
              const flags = JSON.parse(s.flags_json || '[]');
              if (!s.clock_out_at) flags.push('OPEN_SESSION');
              return (
                <tr key={s.id}>
                  <td>{s.full_name}</td>
                  <td>{new Date(s.clock_in_at).toLocaleString()}</td>
                  <td>{s.clock_out_at ? new Date(s.clock_out_at).toLocaleString() : '-'}</td>
                  <td>{s.total_minutes ?? '-'}</td>
                  <td>{flags.length > 0 ? <span className="badge badge-yellow">{flags.join(', ')}</span> : '-'}</td>
                </tr>
              );
            })}
            {sessions.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: '#999' }}>No sessions found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
