'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiJson } from '@/lib/api';
import { formatTime, formatDuration } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageTransition } from '@/components/motion';
import { CheckCircle2, XCircle, RotateCcw, ArrowLeft, ScanLine } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type ScanState = 'scanning' | 'success' | 'error';

export default function ScanPage() {
  const [state, setState] = useState<ScanState>('scanning');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const scannerRef = useRef<any>(null);
  const router = useRouter();

  useEffect(() => {
    if (state !== 'scanning') return;
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
            try { await html5QrCode.stop(); } catch {}
            await handleScan(decodedText);
          },
          () => {}
        );
      } catch (err: any) {
        setError('Camera access denied or not available.');
        setState('error');
      }
    }

    startScanner();
    return () => { if (html5QrCode) html5QrCode.stop().catch(() => {}); };
  }, [state]);

  async function handleScan(text: string) {
    setError('');
    try {
      let payload: any;
      try { payload = JSON.parse(text); } catch {
        try { payload = JSON.parse(atob(text)); } catch { throw new Error('Invalid QR code'); }
      }
      if (!payload.office_id || !payload.token || !payload.expires_at) throw new Error('Invalid QR code format');

      const data = await apiJson('/clock/scan', {
        method: 'POST',
        body: JSON.stringify({ office_id: payload.office_id, token: payload.token }),
      });
      setResult(data);
      setState('success');
    } catch (err: any) {
      setError(err.message);
      setState('error');
    }
  }

  function retry() {
    setResult(null);
    setError('');
    setState('scanning');
  }

  return (
    <PageTransition>
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Scan QR Code</h1>
        </div>

        <AnimatePresence mode="wait">
          {state === 'scanning' && (
            <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <div id="qr-reader" className="w-full" style={{ minHeight: 320 }} />
                </CardContent>
              </Card>
              <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
                <ScanLine className="h-4 w-4 animate-pulse" />
                Point your camera at the office QR code
              </div>
            </motion.div>
          )}

          {state === 'success' && result && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
              <Card className={result.action === 'IN' ? 'border-emerald-200' : 'border-blue-200'}>
                <CardContent className="py-10 text-center space-y-4">
                  <div className={`inline-flex items-center justify-center h-16 w-16 rounded-full mx-auto ${
                    result.action === 'IN' ? 'bg-emerald-100' : 'bg-blue-100'
                  }`}>
                    <CheckCircle2 className={`h-8 w-8 ${result.action === 'IN' ? 'text-emerald-600' : 'text-blue-600'}`} />
                  </div>
                  <div>
                    <Badge variant={result.action === 'IN' ? 'success' : 'default'} className="text-base px-5 py-1.5">
                      Clocked {result.action}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{formatTime(result.action === 'IN' ? result.clock_in_at : result.clock_out_at!)}</p>
                  {result.total_minutes != null && (
                    <p className="text-lg font-bold">Shift: {formatDuration(result.total_minutes)}</p>
                  )}
                  {result.flags?.length > 0 && (
                    <div className="flex justify-center gap-2">
                      {result.flags.map((f: string) => <Badge key={f} variant="warning">{f}</Badge>)}
                    </div>
                  )}
                  <Button onClick={() => router.push('/ambassador/home')} className="mt-4">Done</Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {state === 'error' && (
            <motion.div key="error" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
              <Card className="border-red-200">
                <CardContent className="py-10 text-center space-y-4">
                  <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mx-auto">
                    <XCircle className="h-8 w-8 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Scan Failed</h3>
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto">{error || 'Something went wrong'}</p>
                  </div>
                  <Button variant="outline" onClick={retry}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
}
