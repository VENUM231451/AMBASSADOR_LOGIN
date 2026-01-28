'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiJson } from '@/lib/api';

export default function AmbassadorHome() {
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const router = useRouter();

  async function loadMe() {
    try {
      const data = await apiJson('/me');
      setMe(data);
    } catch {}
  }

  useEffect(() => { loadMe(); }, []);

  async function handleManualClock() {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await apiJson('/clock/manual', {
        method: 'POST',
        body: JSON.stringify({ office_id: 'APU_MAIN_OFFICE' }),
      });
      setResult(data);
      await loadMe();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

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

        <button
          className="btn btn-primary"
          style={{ fontSize: 18, padding: '16px 40px', marginBottom: 12 }}
          onClick={handleManualClock}
          disabled={loading}
        >
          {loading ? 'Processing...' : me?.open_session ? 'Clock Out' : 'Clock In'}
        </button>

        <br />
        <button
          className="btn btn-secondary"
          style={{ fontSize: 14, padding: '10px 24px', marginTop: 8 }}
          onClick={() => router.push('/ambassador/scan')}
        >
          Or Scan QR Code Instead
        </button>
      </div>

      {result && (
        <div className="card" style={{ textAlign: 'center', marginTop: 16 }}>
          <div className={`badge ${result.action === 'IN' ? 'badge-green' : 'badge-red'}`}
               style={{ fontSize: 18, padding: '8px 20px', marginBottom: 12 }}>
            Clocked {result.action}
          </div>
          <p><strong>Clock In:</strong> {new Date(result.clock_in_at).toLocaleString()}</p>
          {result.clock_out_at && <p><strong>Clock Out:</strong> {new Date(result.clock_out_at).toLocaleString()}</p>}
          {result.total_minutes != null && (
            <p><strong>Total:</strong> {Math.floor(result.total_minutes / 60)}h {result.total_minutes % 60}m</p>
          )}
          {result.flags?.length > 0 && (
            <p><span className="badge badge-yellow">{result.flags.join(', ')}</span></p>
          )}
        </div>
      )}

      {error && (
        <div className="msg-error" style={{ marginTop: 16 }}>{error}</div>
      )}
    </div>
  );
}
