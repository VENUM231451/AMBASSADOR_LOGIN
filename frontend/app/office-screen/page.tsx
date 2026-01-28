'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001/api';

export default function OfficeScreen() {
  const searchParams = useSearchParams();
  const officeId = searchParams.get('office_id') || 'APU_MAIN_OFFICE';
  const [qrData, setQrData] = useState<string>('');
  const [qrImage, setQrImage] = useState<string>('');
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState('');
  const expiresRef = useRef<number>(0);
  const intervalRef = useRef<any>(null);

  const fetchQr = useCallback(async () => {
    try {
      const res = await fetch(`${API}/office/${officeId}/qr`);
      if (!res.ok) throw new Error('Failed to fetch QR');
      const data = await res.json();

      const payload = JSON.stringify(data);
      setQrData(payload);

      // Generate QR image using qrcode library
      const QRCode = (await import('qrcode')).default;
      const url = await QRCode.toDataURL(payload, { width: 400, margin: 2 });
      setQrImage(url);

      expiresRef.current = new Date(data.expires_at).getTime();
      setError('');
    } catch (e: any) {
      setError(e.message);
    }
  }, [officeId]);

  useEffect(() => {
    fetchQr();
    const refreshInterval = setInterval(fetchQr, 15000); // refresh every 15s
    return () => clearInterval(refreshInterval);
  }, [fetchQr]);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((expiresRef.current - Date.now()) / 1000));
      setCountdown(remaining);
    }, 200);
    return () => clearInterval(intervalRef.current);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#1a1a2e', color: '#fff' }}>
      <h1 style={{ marginBottom: 8, fontSize: 28 }}>Ambassador Clock In / Out</h1>
      <p style={{ marginBottom: 24, color: '#aaa' }}>Office: {officeId}</p>

      {error && <div className="msg-error" style={{ marginBottom: 16 }}>{error}</div>}

      {qrImage && (
        <div style={{ background: '#fff', padding: 24, borderRadius: 12, marginBottom: 24 }}>
          <img src={qrImage} alt="QR Code" style={{ width: 350, height: 350 }} />
        </div>
      )}

      <div style={{ fontSize: 24, fontWeight: 700 }}>
        Expires in: <span style={{ color: countdown <= 5 ? '#ff4444' : '#4ecdc4' }}>{countdown}s</span>
      </div>
      <p style={{ marginTop: 12, color: '#888', fontSize: 14 }}>QR refreshes automatically every 15 seconds</p>
    </div>
  );
}
