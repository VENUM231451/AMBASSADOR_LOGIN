import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import crypto from 'crypto';
import { getDb } from '../db/schema';
import { authMiddleware, adminOnly } from '../auth/middleware';

const router = Router();
router.use(authMiddleware, adminOnly);

const createSchema = z.object({
  full_name: z.string().min(1),
  email: z.string().email(),
  student_id: z.string().optional(),
  temp_password: z.string().min(6).optional(),
});

router.post('/ambassadors', async (req: Request, res: Response) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });

  const { full_name, email, student_id } = parsed.data;
  const tempPassword = parsed.data.temp_password || crypto.randomBytes(8).toString('base64url');
  const db = getDb();

  const exists = db.prepare('SELECT id FROM ambassadors WHERE email = ?').get(email);
  if (exists) return res.status(409).json({ error: 'Email already exists' });

  const hash = await bcrypt.hash(tempPassword, 10);
  const now = new Date().toISOString();
  const id = uuid();

  db.prepare(`INSERT INTO ambassadors (id, full_name, email, student_id, password_hash, role, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'ambassador', 'active', ?, ?)`).run(id, full_name, email, student_id || null, hash, now, now);

  res.status(201).json({ id, full_name, email, student_id, temp_password: tempPassword });
});

router.get('/ambassadors', (req: Request, res: Response) => {
  const db = getDb();
  const status = req.query.status as string | undefined;
  const search = req.query.search as string | undefined;

  let query = 'SELECT id, full_name, email, student_id, role, status, created_at, updated_at FROM ambassadors WHERE 1=1';
  const params: any[] = [];

  if (status) { query += ' AND status = ?'; params.push(status); }
  if (search) { query += ' AND (full_name LIKE ? OR email LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

  query += ' ORDER BY created_at DESC';
  const rows = db.prepare(query).all(...params);
  res.json(rows);
});

router.get('/ambassadors/:id', (req: Request, res: Response) => {
  const db = getDb();
  const row = db.prepare('SELECT id, full_name, email, student_id, role, status, created_at, updated_at FROM ambassadors WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

const updateSchema = z.object({
  full_name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  student_id: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

router.patch('/ambassadors/:id', (req: Request, res: Response) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });

  const db = getDb();
  const existing = db.prepare('SELECT id FROM ambassadors WHERE id = ?').get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const fields = parsed.data;
  const sets: string[] = [];
  const params: any[] = [];

  if (fields.full_name) { sets.push('full_name = ?'); params.push(fields.full_name); }
  if (fields.email) { sets.push('email = ?'); params.push(fields.email); }
  if (fields.student_id !== undefined) { sets.push('student_id = ?'); params.push(fields.student_id); }
  if (fields.status) { sets.push('status = ?'); params.push(fields.status); }

  if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' });

  sets.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(req.params.id);

  db.prepare(`UPDATE ambassadors SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  res.json({ message: 'Updated' });
});

router.post('/ambassadors/:id/reset-password', async (req: Request, res: Response) => {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM ambassadors WHERE id = ?').get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const tempPassword = crypto.randomBytes(8).toString('base64url');
  const hash = await bcrypt.hash(tempPassword, 10);
  db.prepare('UPDATE ambassadors SET password_hash = ?, updated_at = ? WHERE id = ?').run(hash, new Date().toISOString(), req.params.id);

  res.json({ temp_password: tempPassword });
});

export default router;
