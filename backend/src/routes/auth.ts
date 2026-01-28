import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { getDb } from '../db/schema';
import { config } from '../config';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/login', async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });

  const { email, password } = parsed.data;
  const db = getDb();
  const user = db.prepare('SELECT * FROM ambassadors WHERE email = ?').get(email) as any;
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  if (user.status !== 'active') return res.status(403).json({ error: 'Account is inactive' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ userId: user.id, role: user.role }, config.jwtSecret, { expiresIn: '24h' });

  res.json({
    token,
    user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role },
  });
});

router.post('/logout', (_req: Request, res: Response) => {
  // Client-side token deletion is sufficient; no server-side blacklist needed
  res.json({ message: 'Logged out' });
});

export default router;
