import { Router, Request, Response } from 'express';
import { authMiddleware, adminOnly } from '../auth/middleware';
import { getTimesheetData, generateTimesheetExcel } from '../services/reports';
import { getDb } from '../db/schema';

const router = Router();
router.use(authMiddleware, adminOnly);

// Sessions list with filters
router.get('/sessions', (req: Request, res: Response) => {
  const db = getDb();
  const { from, to, ambassador_id } = req.query as Record<string, string>;
  let query = `SELECT s.*, a.full_name, a.email FROM sessions s JOIN ambassadors a ON a.id = s.ambassador_id WHERE 1=1`;
  const params: any[] = [];

  if (from) { query += ' AND s.clock_in_at >= ?'; params.push(from + 'T00:00:00.000Z'); }
  if (to) { query += ' AND s.clock_in_at <= ?'; params.push(to + 'T23:59:59.999Z'); }
  if (ambassador_id) { query += ' AND s.ambassador_id = ?'; params.push(ambassador_id); }

  query += ' ORDER BY s.clock_in_at DESC LIMIT 500';
  const rows = db.prepare(query).all(...params);
  res.json(rows);
});

// JSON timesheet summary
router.get('/reports/timesheets', (req: Request, res: Response) => {
  const month = req.query.month as string;
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ error: 'Provide month as YYYY-MM' });
  const data = getTimesheetData(month);
  res.json(data);
});

// Excel download
router.get('/reports/timesheets.xlsx', async (req: Request, res: Response) => {
  const month = req.query.month as string;
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ error: 'Provide month as YYYY-MM' });

  const buffer = await generateTimesheetExcel(month);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=Timesheets-${month}.xlsx`);
  res.send(buffer);
});

export default router;
