import express from 'express';
import cors from 'cors';
import { config } from './config';
import { getDb } from './db/schema';
import { cleanupExpiredTokens } from './services/qr';

import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import officeRoutes from './routes/office';
import clockRoutes from './routes/clock';
import meRoutes from './routes/me';
import reportsRoutes from './routes/reports';

const app = express();
app.use(cors());
app.use(express.json());

// Initialize DB
getDb();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin', reportsRoutes);
app.use('/api/office', officeRoutes);
app.use('/api/clock', clockRoutes);
app.use('/api/me', meRoutes);

// Health
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Cleanup expired tokens every 5 minutes
setInterval(cleanupExpiredTokens, 5 * 60 * 1000);

app.listen(config.port, () => {
  console.log(`Backend running on http://localhost:${config.port}`);
});
