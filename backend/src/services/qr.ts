import { v4 as uuid } from 'uuid';
import { getDb } from '../db/schema';
import { config } from '../config';
import { generateToken, hashToken } from '../utils/hash';

export function createQrToken(officeId: string) {
  const db = getDb();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + config.qrTokenTtlSeconds * 1000);
  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);
  const id = uuid();

  db.prepare(`INSERT INTO qr_tokens (id, office_id, token_hash, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?)`).run(id, officeId, tokenHash, expiresAt.toISOString(), now.toISOString());

  return {
    office_id: officeId,
    token: rawToken,
    expires_at: expiresAt.toISOString(),
  };
}

export function validateAndConsumeToken(officeId: string, rawToken: string): { valid: boolean; reason?: string; tokenId?: string } {
  const db = getDb();
  const tokenHash = hashToken(rawToken);
  const now = new Date().toISOString();

  const row = db.prepare(
    `SELECT id, expires_at, used_at FROM qr_tokens WHERE office_id = ? AND token_hash = ?`
  ).get(officeId, tokenHash) as any;

  if (!row) return { valid: false, reason: 'TOKEN_NOT_FOUND' };
  if (row.used_at) return { valid: false, reason: 'TOKEN_ALREADY_USED' };
  if (row.expires_at < now) return { valid: false, reason: 'TOKEN_EXPIRED' };

  // Mark as used
  db.prepare('UPDATE qr_tokens SET used_at = ? WHERE id = ?').run(now, row.id);
  return { valid: true, tokenId: row.id };
}

export function cleanupExpiredTokens() {
  const db = getDb();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  db.prepare('DELETE FROM qr_tokens WHERE expires_at < ?').run(cutoff);
}
