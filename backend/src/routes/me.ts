import { Router, Request, Response } from 'express';
import { authMiddleware } from '../auth/middleware';
import { getDb } from '../db/schema';

const router = Router();
router.use(authMiddleware);

router.get('/', (req: Request, res: Response) => {
  const db = getDb();
  const user = db.prepare(
    'SELECT id, full_name, email, student_id, role, status, created_at FROM ambassadors WHERE id = ?'
  ).get(req.user!.userId) as any;
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Include open session info
  const openSession = db.prepare(
    'SELECT id, clock_in_at FROM sessions WHERE ambassador_id = ? AND clock_out_at IS NULL'
  ).get(req.user!.userId) as any;

  res.json({ ...user, open_session: openSession || null });
});

router.get('/sessions', (req: Request, res: Response) => {
  const db = getDb();
  const month = req.query.month as string; // YYYY-MM
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: 'Provide month as YYYY-MM' });
  }

  const start = `${month}-01T00:00:00.000Z`;
  const [y, m] = month.split('-').map(Number);
  const end = new Date(Date.UTC(y, m, 1)).toISOString();

  const sessions = db.prepare(
    `SELECT * FROM sessions WHERE ambassador_id = ? AND clock_in_at >= ? AND clock_in_at < ? ORDER BY clock_in_at DESC`
  ).all(req.user!.userId, start, end);

  const totalMinutes = (sessions as any[]).reduce((sum, s) => sum + (s.total_minutes || 0), 0);

  res.json({ sessions, total_minutes: totalMinutes, total_hours: Math.round((totalMinutes / 60) * 100) / 100 });
});

export default router;
