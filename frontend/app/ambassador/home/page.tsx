'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiJson } from '@/lib/api';

export default function AmbassadorHome() {
  const [me, setMe] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    apiJson('/me').then(setMe).catch(() => {});
  }, []);

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Welcome{me ? `, ${me.full_name}` : ''}</h2>

      <div className="card" style={{ textAlign: 'center', padding: 40 }}>
        {me?.open_session ? (
          <div>
            <div className="badge badge-green" style={{ fontSize: 16, padding: '8px 16px', marginBottom: 16 }}>
              Clocked In
            </div>
            <p style={{ marginBottom: 16 }}>Since: {new Date(me.open_session.clock_in_at).toLocaleString()}</p>
          </div>
        ) : (
          <div>
            <div className="badge badge-red" style={{ fontSize: 16, padding: '8px 16px', marginBottom: 16 }}>
              Not Clocked In
            </div>
          </div>
        )}
        <button className="btn btn-primary" style={{ fontSize: 18, padding: '16px 40px' }} onClick={() => router.push('/ambassador/scan')}>
          Scan QR to {me?.open_session ? 'Clock Out' : 'Clock In'}
        </button>
      </div>
    </div>
  );
}
