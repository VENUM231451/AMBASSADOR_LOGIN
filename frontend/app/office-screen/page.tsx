'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Fingerprint } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001/api';

export default function OfficeScreen() {
  const searchParams = useSearchParams();
  const officeId = searchParams.get('office_id') || 'APU_MAIN_OFFICE';
  const [qrImage, setQrImage] = useState<string>('');
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState('');
  const [qrKey, setQrKey] = useState(0);
  const expiresRef = useRef<number>(0);

  const fetchQr = useCallback(async () => {
    try {
      const res = await fetch(`${API}/office/${officeId}/qr`);
      if (!res.ok) throw new Error('Failed to fetch QR');
      const data = await res.json();

      const payload = JSON.stringify(data);
      const QRCode = (await import('qrcode')).default;
      const url = await QRCode.toDataURL(payload, { width: 400, margin: 2, color: { dark: '#1a1a2e', light: '#ffffff' } });
      setQrImage(url);
      setQrKey(prev => prev + 1);
      expiresRef.current = new Date(data.expires_at).getTime();
      setError('');
    } catch (e: any) {
      setError(e.message);
    }
  }, [officeId]);

  useEffect(() => {
    fetchQr();
    const interval = setInterval(fetchQr, 15000);
    return () => clearInterval(interval);
  }, [fetchQr]);

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((expiresRef.current - Date.now()) / 1000));
      setCountdown(remaining);
    }, 200);
    return () => clearInterval(interval);
  }, []);

  const progress = Math.min(100, (countdown / 20) * 100);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white no-scrollbar overflow-hidden">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-white/10 mb-4">
          <Fingerprint className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Scan to Clock In / Out</h1>
        <p className="text-white/50 mt-2 text-sm">Office: {officeId}</p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-xl px-6 py-3 mb-6 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* QR Code */}
      <div className="relative mb-8">
        <AnimatePresence mode="wait">
          {qrImage && (
            <motion.div
              key={qrKey}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.25 }}
              className="bg-white rounded-3xl p-6 shadow-2xl shadow-white/5"
            >
              <img src={qrImage} alt="QR Code" className="w-[300px] h-[300px] sm:w-[360px] sm:h-[360px]" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Countdown */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10">
            <svg className="h-10 w-10 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15.5" fill="none"
                stroke={countdown <= 5 ? '#ef4444' : '#4ecdc4'}
                strokeWidth="3"
                strokeDasharray={`${progress} 100`}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
              {countdown}
            </span>
          </div>
          <span className="text-lg font-semibold">
            {countdown <= 5 ? (
              <span className="text-red-400">Expiring...</span>
            ) : (
              <span className="text-white/70">seconds remaining</span>
            )}
          </span>
        </div>
        <p className="text-white/30 text-xs">QR refreshes automatically every 15 seconds</p>
      </div>
    </div>
  );
}
