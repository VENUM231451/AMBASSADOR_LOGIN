import { Router, Request, Response } from 'express';
import { config } from '../config';
import { createQrToken } from '../services/qr';

const router = Router();

router.get('/:office_id/qr', (req: Request, res: Response) => {
  const officeId = req.params.office_id;
  if (!config.officeIds.includes(officeId)) {
    return res.status(400).json({ error: 'Unknown office_id' });
  }
  const payload = createQrToken(officeId);
  res.json(payload);
});

export default router;
