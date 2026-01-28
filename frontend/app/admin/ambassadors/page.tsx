'use client';

import { useEffect, useState } from 'react';
import { apiJson } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/page-header';
import { PageTransition } from '@/components/motion';
import { EmptyState } from '@/components/empty-state';
import { TableSkeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/toast-provider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { UserPlus, Users, Search, Key, Loader2 } from 'lucide-react';

export default function AmbassadorsPage() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState({ full_name: '', email: '', student_id: '', temp_password: '' });
  const [editForm, setEditForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  async function load() {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const data = await apiJson(`/admin/ambassadors?${params}`);
      setList(data);
    } catch {} finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [search, statusFilter]);

  async function handleCreate() {
    setSaving(true);
    try {
      const body: any = { full_name: form.full_name, email: form.email };
      if (form.student_id) body.student_id = form.student_id;
      if (form.temp_password) body.temp_password = form.temp_password;
      const data = await apiJson('/admin/ambassadors', { method: 'POST', body: JSON.stringify(body) });
      toast('success', `Created! Temp password: ${data.temp_password}`);
      setShowCreate(false);
      setForm({ full_name: '', email: '', student_id: '', temp_password: '' });
      load();
    } catch (e: any) { toast('error', e.message); } finally { setSaving(false); }
  }

  async function handleUpdate() {
    if (!editForm) return;
    setSaving(true);
    try {
      const body: any = {};
      if (editForm.full_name) body.full_name = editForm.full_name;
      if (editForm.email) body.email = editForm.email;
      if (editForm.student_id !== undefined) body.student_id = editForm.student_id;
      if (editForm.status) body.status = editForm.status;
      await apiJson(`/admin/ambassadors/${editForm.id}`, { method: 'PATCH', body: JSON.stringify(body) });
      toast('success', 'Ambassador updated');
      setSelected(null);
      setEditForm(null);
      load();
    } catch (e: any) { toast('error', e.message); } finally { setSaving(false); }
  }

  async function resetPassword(id: string) {
    try {
      const data = await apiJson(`/admin/ambassadors/${id}/reset-password`, { method: 'POST' });
      toast('success', `New temp password: ${data.temp_password}`);
    } catch (e: any) { toast('error', e.message); }
  }

  function openDetail(a: any) {
    setSelected(a);
    setEditForm({ ...a });
  }

  return (
    <PageTransition>
      <PageHeader title="Ambassadors" description="Manage ambassador accounts">
        <Button onClick={() => setShowCreate(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          New Ambassador
        </Button>
      </PageHeader>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search name or email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2">
          {['', 'active', 'inactive'].map(s => (
            <Button key={s} variant={statusFilter === s ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter(s)}>
              {s || 'All'}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <Card className="p-6"><TableSkeleton /></Card>
      ) : list.length === 0 ? (
        <EmptyState icon={Users} title="No ambassadors found" description="Create your first ambassador to get started" actionLabel="Create Ambassador" onAction={() => setShowCreate(true)} />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-semibold text-muted-foreground">Name</th>
                  <th className="text-left p-3 font-semibold text-muted-foreground hidden sm:table-cell">Email</th>
                  <th className="text-left p-3 font-semibold text-muted-foreground hidden md:table-cell">Student ID</th>
                  <th className="text-left p-3 font-semibold text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {list.map(a => (
                  <tr key={a.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => openDetail(a)}>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                          {a.full_name?.[0]}
                        </div>
                        <div>
                          <p className="font-medium">{a.full_name}</p>
                          <p className="text-xs text-muted-foreground sm:hidden">{a.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 hidden sm:table-cell text-muted-foreground">{a.email}</td>
                    <td className="p-3 hidden md:table-cell text-muted-foreground">{a.student_id || '-'}</td>
                    <td className="p-3">
                      <Badge variant={a.status === 'active' ? 'success' : 'destructive'}>{a.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Ambassador</DialogTitle>
            <DialogDescription>Create a new ambassador account</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div><label className="text-sm font-medium">Full Name *</label><Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} /></div>
            <div><label className="text-sm font-medium">Email *</label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div><label className="text-sm font-medium">Student ID</label><Input value={form.student_id} onChange={e => setForm({ ...form, student_id: e.target.value })} /></div>
            <div><label className="text-sm font-medium">Temp Password <span className="text-muted-foreground font-normal">(auto if blank)</span></label><Input value={form.temp_password} onChange={e => setForm({ ...form, temp_password: e.target.value })} /></div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={saving || !form.full_name || !form.email}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail sheet */}
      <Sheet open={!!selected} onOpenChange={() => { setSelected(null); setEditForm(null); }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Ambassador Details</SheetTitle>
            <SheetDescription>{selected?.email}</SheetDescription>
          </SheetHeader>
          {editForm && (
            <div className="space-y-4 mt-4">
              <div><label className="text-sm font-medium">Full Name</label><Input value={editForm.full_name} onChange={e => setEditForm({ ...editForm, full_name: e.target.value })} /></div>
              <div><label className="text-sm font-medium">Email</label><Input value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} /></div>
              <div><label className="text-sm font-medium">Student ID</label><Input value={editForm.student_id || ''} onChange={e => setEditForm({ ...editForm, student_id: e.target.value })} /></div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <div className="flex gap-2 mt-1">
                  {['active', 'inactive'].map(s => (
                    <Button key={s} variant={editForm.status === s ? 'default' : 'outline'} size="sm" onClick={() => setEditForm({ ...editForm, status: s })}>
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <Button onClick={handleUpdate} disabled={saving} className="flex-1">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => resetPassword(editForm.id)}>
                  <Key className="h-4 w-4 mr-2" />
                  Reset PW
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </PageTransition>
  );
}
