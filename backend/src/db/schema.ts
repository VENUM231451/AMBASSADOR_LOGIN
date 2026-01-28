import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { config } from '../config';

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    const dir = path.dirname(config.dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    db = new Database(config.dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ambassadors (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      student_id TEXT,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','ambassador')),
      status TEXT NOT NULL CHECK(status IN ('active','inactive')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      ambassador_id TEXT NOT NULL REFERENCES ambassadors(id),
      clock_in_at TEXT NOT NULL,
      clock_out_at TEXT,
      clock_in_method TEXT NOT NULL DEFAULT 'QR',
      clock_out_method TEXT DEFAULT 'QR',
      total_minutes INTEGER,
      flags_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS clock_events (
      id TEXT PRIMARY KEY,
      ambassador_id TEXT,
      event_type TEXT NOT NULL,
      at TEXT NOT NULL,
      office_id TEXT NOT NULL,
      token_id TEXT,
      result TEXT NOT NULL,
      reason TEXT,
      ip TEXT,
      device_hash TEXT
    );

    CREATE TABLE IF NOT EXISTS qr_tokens (
      id TEXT PRIMARY KEY,
      office_id TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_ambassador ON sessions(ambassador_id, clock_in_at);
    CREATE INDEX IF NOT EXISTS idx_sessions_open ON sessions(ambassador_id) WHERE clock_out_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_qr_tokens_office ON qr_tokens(office_id, expires_at);
    CREATE INDEX IF NOT EXISTS idx_clock_events_ambassador ON clock_events(ambassador_id, at);
  `);
}
