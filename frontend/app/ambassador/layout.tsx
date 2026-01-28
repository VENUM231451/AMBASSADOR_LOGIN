'use client';
import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUser, clearAuth } from '@/lib/api';

export default function AmbassadorLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  useEffect(() => {
    const user = getUser();
    if (!user || user.role !== 'ambassador') { clearAuth(); router.replace('/login'); }
  }, [router]);

  function logout() { clearAuth(); router.push('/login'); }

  return (
    <div>
      <nav className="nav">
        <strong>Ambassador</strong>
        <Link href="/ambassador/home">Home</Link>
        <Link href="/ambassador/scan">Scan QR</Link>
        <Link href="/ambassador/timesheet">Timesheet</Link>
        <div className="spacer" />
        <button className="btn btn-secondary" onClick={logout}>Logout</button>
      </nav>
      <div className="container">{children}</div>
    </div>
  );
}
