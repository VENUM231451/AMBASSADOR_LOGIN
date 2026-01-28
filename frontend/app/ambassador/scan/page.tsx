'use client';
import { useEffect, useRef, useState } from 'react';
import { apiJson } from '@/lib/api';

export default function ScanPage() {
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(true);
  const scannerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scanning) return;
    let html5QrCode: any = null;

    async function startScanner() {
      const { Html5Qrcode } = await import('html5-qrcode');
      html5QrCode = new Html5Qrcode('qr-reader');
      scannerRef.current = html5QrCode;

      try {
        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText: string) => {
            // Stop scanning immediately
            try { await html5QrCode.stop(); } catch {}
            setScanning(false);
            await handleScan(decodedText);
          },
          () => {} // ignore errors during scanning
        );
      } catch (err: any) {
        setError('Camera access denied or not available. ' + err.message);
        setScanning(false);
      }
    }

    startScanner();

    return () => {
      if (html5QrCode) {
        html5QrCode.stop().catch(() => {});
      }
    };
  }, [scanning]);

  async function handleScan(text: string) {
    setError('');
    setResult(null);
    try {
      // Try to parse as JSON directly or base64
      let payload: any;
      try {
        payload = JSON.parse(text);
      } catch {
        try {
          payload = JSON.parse(atob(text));
        } catch {
          throw new Error('Invalid QR code format');
        }
      }

      if (!payload.office_id || !payload.token || !payload.expires_at) {
        throw new Error('QR code missing required fields');
      }

      const data = await apiJson('/clock/scan', {
        method: 'POST',
        body: JSON.stringify({ office_id: payload.office_id, token: payload.token }),
      });
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    }
  }

  function scanAgain() {
    setResult(null);
    setError('');
    setScanning(true);
  }

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Scan QR Code</h2>

      {scanning && (
        <div className="card" style={{ textAlign: 'center' }}>
          <div id="qr-reader" ref={containerRef} style={{ width: '100%', maxWidth: 400, margin: '0 auto' }} />
          <p style={{ marginTop: 12, color: '#666' }}>Point your camera at the office QR code</p>
        </div>
      )}

      {result && (
        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
          <div className={`badge ${result.action === 'IN' ? 'badge-green' : 'badge-red'}`}
               style={{ fontSize: 20, padding: '10px 24px', marginBottom: 16 }}>
            Clocked {result.action}
          </div>
          <p><strong>Session:</strong> {result.session_id?.slice(0, 8)}...</p>
          <p><strong>Clock In:</strong> {new Date(result.clock_in_at).toLocaleString()}</p>
          {result.clock_out_at && <p><strong>Clock Out:</strong> {new Date(result.clock_out_at).toLocaleString()}</p>}
          {result.total_minutes != null && (
            <p><strong>Total:</strong> {Math.floor(result.total_minutes / 60)}h {result.total_minutes % 60}m</p>
          )}
          {result.flags?.length > 0 && (
            <p><span className="badge badge-yellow">{result.flags.join(', ')}</span></p>
          )}
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={scanAgain}>Scan Again</button>
        </div>
      )}

      {error && !result && (
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="msg-error">{error}</div>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={scanAgain}>Try Again</button>
        </div>
      )}
    </div>
  );
}
