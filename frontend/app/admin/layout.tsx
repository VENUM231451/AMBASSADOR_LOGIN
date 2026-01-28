'use client';
import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUser, clearAuth } from '@/lib/api';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  useEffect(() => {
    const user = getUser();
    if (!user || user.role !== 'admin') { clearAuth(); router.replace('/login'); }
  }, [router]);

  function logout() { clearAuth(); router.push('/login'); }

  return (
    <div>
      <nav className="nav">
        <strong>Admin</strong>
        <Link href="/admin/dashboard">Dashboard</Link>
        <Link href="/admin/ambassadors">Ambassadors</Link>
        <Link href="/admin/sessions">Sessions</Link>
        <Link href="/admin/reports">Reports</Link>
        <div className="spacer" />
        <button className="btn btn-secondary" onClick={logout}>Logout</button>
      </nav>
      <div className="container">{children}</div>
    </div>
  );
}
