import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, ambassadorOnly } from '../auth/middleware';
import { processScan, processManualClock } from '../services/clock';

const router = Router();
router.use(authMiddleware, ambassadorOnly);

const scanSchema = z.object({
  office_id: z.string().min(1),
  token: z.string().min(1),
  device_hash: z.string().optional(),
});

router.post('/scan', (req: Request, res: Response) => {
  const parsed = scanSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });

  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || null;

  const result = processScan({
    ambassadorId: req.user!.userId,
    officeId: parsed.data.office_id,
    rawToken: parsed.data.token,
    ip: ip || undefined,
    deviceHash: parsed.data.device_hash,
  });

  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  res.json(result.data);
});

// Manual clock in/out (no QR needed)
router.post('/manual', (req: Request, res: Response) => {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || null;
  const officeId = req.body.office_id || 'APU_MAIN_OFFICE';

  const result = processManualClock(req.user!.userId, officeId, ip || undefined);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  res.json(result.data);
});

export default router;
