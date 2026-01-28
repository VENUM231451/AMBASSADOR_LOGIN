import { v4 as uuid } from 'uuid';
import { getDb } from '../db/schema';
import { config } from '../config';
import { validateAndConsumeToken } from './qr';

interface ScanInput {
  ambassadorId: string;
  officeId: string;
  rawToken: string;
  ip?: string;
  deviceHash?: string;
}

interface ScanResult {
  action: 'IN' | 'OUT';
  session_id: string;
  clock_in_at: string;
  clock_out_at?: string;
  total_minutes?: number;
  flags: string[];
}

function logEvent(
  ambassadorId: string | null, eventType: string, officeId: string,
  tokenId: string | null, result: string, reason: string | null,
  ip: string | null, deviceHash: string | null
) {
  getDb().prepare(
    `INSERT INTO clock_events (id, ambassador_id, event_type, at, office_id, token_id, result, reason, ip, device_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(uuid(), ambassadorId, eventType, new Date().toISOString(), officeId, tokenId, result, reason, ip, deviceHash);
}

// Manual clock in/out (no QR token required)
export function processManualClock(ambassadorId: string, officeId: string, ip?: string): { success: boolean; data?: ScanResult; error?: string } {
  const db = getDb();

  const amb = db.prepare('SELECT id, status FROM ambassadors WHERE id = ?').get(ambassadorId) as any;
  if (!amb || amb.status !== 'active') {
    logEvent(ambassadorId, 'FAILED', officeId, null, 'FAIL', 'AMBASSADOR_INACTIVE', ip || null, null);
    return { success: false, error: 'Ambassador is inactive' };
  }

  // Cooldown check
  const lastEvent = db.prepare(
    `SELECT at FROM clock_events WHERE ambassador_id = ? AND result = 'SUCCESS' ORDER BY at DESC LIMIT 1`
  ).get(ambassadorId) as any;
  if (lastEvent) {
    const diff = (Date.now() - new Date(lastEvent.at).getTime()) / 1000;
    if (diff < config.clockCooldownSeconds) {
      logEvent(ambassadorId, 'FAILED', officeId, null, 'FAIL', 'COOLDOWN', ip || null, null);
      return { success: false, error: `Please wait ${Math.ceil(config.clockCooldownSeconds - diff)}s before clocking again` };
    }
  }

  const openSession = db.prepare(
    `SELECT * FROM sessions WHERE ambassador_id = ? AND clock_out_at IS NULL`
  ).get(ambassadorId) as any;

  const now = new Date();
  const nowIso = now.toISOString();

  if (!openSession) {
    const sessionId = uuid();
    db.prepare(
      `INSERT INTO sessions (id, ambassador_id, clock_in_at, clock_in_method, flags_json, created_at, updated_at)
       VALUES (?, ?, ?, 'MANUAL', '[]', ?, ?)`
    ).run(sessionId, ambassadorId, nowIso, nowIso, nowIso);
    logEvent(ambassadorId, 'IN', officeId, null, 'SUCCESS', 'MANUAL', ip || null, null);
    return { success: true, data: { action: 'IN', session_id: sessionId, clock_in_at: nowIso, flags: [] } };
  } else {
    const clockInTime = new Date(openSession.clock_in_at).getTime();
    const totalMinutes = Math.floor((now.getTime() - clockInTime) / 60000);
    const flags: string[] = JSON.parse(openSession.flags_json || '[]');
    if (totalMinutes > config.maxShiftMinutes) flags.push('SHIFT_TOO_LONG');
    if (totalMinutes < 1) flags.push('TOO_SHORT_OR_ACCIDENTAL');

    db.prepare(
      `UPDATE sessions SET clock_out_at = ?, clock_out_method = 'MANUAL', total_minutes = ?, flags_json = ?, updated_at = ? WHERE id = ?`
    ).run(nowIso, totalMinutes, JSON.stringify(flags), nowIso, openSession.id);
    logEvent(ambassadorId, 'OUT', officeId, null, 'SUCCESS', 'MANUAL', ip || null, null);
    return {
      success: true,
      data: {
        action: 'OUT', session_id: openSession.id,
        clock_in_at: openSession.clock_in_at, clock_out_at: nowIso,
        total_minutes: totalMinutes, flags,
      },
    };
  }
}

export function processScan(input: ScanInput): { success: boolean; data?: ScanResult; error?: string } {
  const db = getDb();
  const { ambassadorId, officeId, rawToken, ip, deviceHash } = input;

  // Check ambassador is active
  const amb = db.prepare('SELECT id, status FROM ambassadors WHERE id = ?').get(ambassadorId) as any;
  if (!amb || amb.status !== 'active') {
    logEvent(ambassadorId, 'FAILED', officeId, null, 'FAIL', 'AMBASSADOR_INACTIVE', ip || null, deviceHash || null);
    return { success: false, error: 'Ambassador is inactive' };
  }

  // Validate token
  const tokenResult = validateAndConsumeToken(officeId, rawToken);
  if (!tokenResult.valid) {
    logEvent(ambassadorId, 'FAILED', officeId, null, 'FAIL', tokenResult.reason!, ip || null, deviceHash || null);
    return { success: false, error: `Token invalid: ${tokenResult.reason}` };
  }

  // Cooldown check
  const lastEvent = db.prepare(
    `SELECT at FROM clock_events WHERE ambassador_id = ? AND result = 'SUCCESS' ORDER BY at DESC LIMIT 1`
  ).get(ambassadorId) as any;

  if (lastEvent) {
    const diff = (Date.now() - new Date(lastEvent.at).getTime()) / 1000;
    if (diff < config.clockCooldownSeconds) {
      logEvent(ambassadorId, 'FAILED', officeId, tokenResult.tokenId!, 'FAIL', 'COOLDOWN', ip || null, deviceHash || null);
      return { success: false, error: `Please wait ${Math.ceil(config.clockCooldownSeconds - diff)}s before scanning again` };
    }
  }

  // IP check
  if (config.enableIpCheck && config.allowedIpRanges.length > 0 && ip) {
    if (!config.allowedIpRanges.some(range => ip.startsWith(range))) {
      logEvent(ambassadorId, 'FAILED', officeId, tokenResult.tokenId!, 'FAIL', 'IP_NOT_ALLOWED', ip, deviceHash || null);
      return { success: false, error: 'Not on allowed network' };
    }
  }

  // Check open session
  const openSession = db.prepare(
    `SELECT * FROM sessions WHERE ambassador_id = ? AND clock_out_at IS NULL`
  ).get(ambassadorId) as any;

  const now = new Date();
  const nowIso = now.toISOString();

  if (!openSession) {
    // CLOCK IN
    const sessionId = uuid();
    db.prepare(
      `INSERT INTO sessions (id, ambassador_id, clock_in_at, clock_in_method, flags_json, created_at, updated_at)
       VALUES (?, ?, ?, 'QR', '[]', ?, ?)`
    ).run(sessionId, ambassadorId, nowIso, nowIso, nowIso);

    logEvent(ambassadorId, 'IN', officeId, tokenResult.tokenId!, 'SUCCESS', null, ip || null, deviceHash || null);
    return { success: true, data: { action: 'IN', session_id: sessionId, clock_in_at: nowIso, flags: [] } };
  } else {
    // CLOCK OUT
    const clockInTime = new Date(openSession.clock_in_at).getTime();
    const totalMinutes = Math.floor((now.getTime() - clockInTime) / 60000);
    const flags: string[] = JSON.parse(openSession.flags_json || '[]');

    if (totalMinutes > config.maxShiftMinutes) flags.push('SHIFT_TOO_LONG');
    if (totalMinutes < 1) flags.push('TOO_SHORT_OR_ACCIDENTAL');

    db.prepare(
      `UPDATE sessions SET clock_out_at = ?, clock_out_method = 'QR', total_minutes = ?, flags_json = ?, updated_at = ? WHERE id = ?`
    ).run(nowIso, totalMinutes, JSON.stringify(flags), nowIso, openSession.id);

    logEvent(ambassadorId, 'OUT', officeId, tokenResult.tokenId!, 'SUCCESS', null, ip || null, deviceHash || null);
    return {
      success: true,
      data: {
        action: 'OUT', session_id: openSession.id,
        clock_in_at: openSession.clock_in_at, clock_out_at: nowIso,
        total_minutes: totalMinutes, flags,
      },
    };
  }
}
