'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getUser } from '@/lib/api';

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    const user = getUser();
    if (!user) { router.replace('/login'); return; }
    if (user.role === 'admin') router.replace('/admin/dashboard');
    else router.replace('/ambassador/home');
  }, [router]);
  return <div className="container"><p>Redirecting...</p></div>;
}
