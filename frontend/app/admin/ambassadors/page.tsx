'use client';
import { useEffect, useState } from 'react';
import { apiJson } from '@/lib/api';

export default function AmbassadorsPage() {
  const [list, setList] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<any>(null);
  const [form, setForm] = useState({ full_name: '', email: '', student_id: '', temp_password: '' });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  async function load() {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const data = await apiJson(`/admin/ambassadors?${params}`);
      setList(data);
    } catch {}
  }

  useEffect(() => { load(); }, [search, statusFilter]);

  async function handleCreate() {
    setError(''); setMsg('');
    try {
      const body: any = { full_name: form.full_name, email: form.email };
      if (form.student_id) body.student_id = form.student_id;
      if (form.temp_password) body.temp_password = form.temp_password;
      const data = await apiJson('/admin/ambassadors', { method: 'POST', body: JSON.stringify(body) });
      setMsg(`Created! Temp password: ${data.temp_password}`);
      setShowCreate(false);
      setForm({ full_name: '', email: '', student_id: '', temp_password: '' });
      load();
    } catch (e: any) { setError(e.message); }
  }

  async function handleUpdate() {
    setError('');
    try {
      const body: any = {};
      if (showEdit.full_name) body.full_name = showEdit.full_name;
      if (showEdit.email) body.email = showEdit.email;
      if (showEdit.student_id !== undefined) body.student_id = showEdit.student_id;
      if (showEdit.status) body.status = showEdit.status;
      await apiJson(`/admin/ambassadors/${showEdit.id}`, { method: 'PATCH', body: JSON.stringify(body) });
      setShowEdit(null);
      load();
    } catch (e: any) { setError(e.message); }
  }

  async function resetPassword(id: string) {
    try {
      const data = await apiJson(`/admin/ambassadors/${id}/reset-password`, { method: 'POST' });
      setMsg(`New temp password: ${data.temp_password}`);
    } catch (e: any) { setError(e.message); }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2>Ambassadors</h2>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>Create Ambassador</button>
      </div>
      {msg && <div className="msg-success">{msg}</div>}
      {error && <div className="msg-error">{error}</div>}

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <input placeholder="Search name or email..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 300 }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ maxWidth: 150 }}>
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="card">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Student ID</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {list.map(a => (
              <tr key={a.id}>
                <td>{a.full_name}</td>
                <td>{a.email}</td>
                <td>{a.student_id || '-'}</td>
                <td>{a.role}</td>
                <td><span className={`badge ${a.status === 'active' ? 'badge-green' : 'badge-red'}`}>{a.status}</span></td>
                <td>
                  <button className="btn btn-secondary" style={{ marginRight: 8, padding: '4px 12px', fontSize: 12 }} onClick={() => setShowEdit({ ...a })}>Edit</button>
                  <button className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => resetPassword(a.id)}>Reset PW</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 16 }}>Create Ambassador</h3>
            <label>Full Name</label>
            <input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
            <label>Email</label>
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <label>Student ID (optional)</label>
            <input value={form.student_id} onChange={e => setForm({ ...form, student_id: e.target.value })} />
            <label>Temp Password (optional, auto-generated if blank)</label>
            <input value={form.temp_password} onChange={e => setForm({ ...form, temp_password: e.target.value })} />
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn btn-primary" onClick={handleCreate}>Create</button>
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showEdit && (
        <div className="modal-overlay" onClick={() => setShowEdit(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 16 }}>Edit Ambassador</h3>
            <label>Full Name</label>
            <input value={showEdit.full_name} onChange={e => setShowEdit({ ...showEdit, full_name: e.target.value })} />
            <label>Email</label>
            <input value={showEdit.email} onChange={e => setShowEdit({ ...showEdit, email: e.target.value })} />
            <label>Student ID</label>
            <input value={showEdit.student_id || ''} onChange={e => setShowEdit({ ...showEdit, student_id: e.target.value })} />
            <label>Status</label>
            <select value={showEdit.status} onChange={e => setShowEdit({ ...showEdit, status: e.target.value })}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn btn-primary" onClick={handleUpdate}>Save</button>
              <button className="btn btn-secondary" onClick={() => setShowEdit(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
