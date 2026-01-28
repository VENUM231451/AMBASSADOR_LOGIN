import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  dbPath: process.env.DB_PATH || './data/app.db',
  qrTokenTtlSeconds: parseInt(process.env.QR_TOKEN_TTL_SECONDS || '20', 10),
  qrRefreshSeconds: parseInt(process.env.QR_REFRESH_SECONDS || '15', 10),
  clockCooldownSeconds: parseInt(process.env.CLOCK_COOLDOWN_SECONDS || '20', 10),
  maxShiftMinutes: parseInt(process.env.MAX_SHIFT_MINUTES || '720', 10),
  officeIds: (process.env.OFFICE_IDS || 'APU_MAIN_OFFICE').split(',').map(s => s.trim()),
  allowedIpRanges: (process.env.ALLOWED_IP_RANGES || '').split(',').map(s => s.trim()).filter(Boolean),
  enableIpCheck: process.env.ENABLE_IP_CHECK === 'true',
};
