import { getDb } from './schema';
import bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';

async function seed() {
  const db = getDb();
  const now = new Date().toISOString();

  const adminExists = db.prepare('SELECT id FROM ambassadors WHERE email = ?').get('admin@example.com');
  if (!adminExists) {
    const hash = await bcrypt.hash('admin123', 10);
    db.prepare(`INSERT INTO ambassadors (id, full_name, email, student_id, password_hash, role, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(uuid(), 'Admin User', 'admin@example.com', null, hash, 'admin', 'active', now, now);
    console.log('Created admin: admin@example.com / admin123');
  } else {
    console.log('Admin already exists.');
  }

  const ambExists = db.prepare('SELECT id FROM ambassadors WHERE email = ?').get('ambassador@example.com');
  if (!ambExists) {
    const hash = await bcrypt.hash('ambassador123', 10);
    db.prepare(`INSERT INTO ambassadors (id, full_name, email, student_id, password_hash, role, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(uuid(), 'Jane Ambassador', 'ambassador@example.com', 'STU001', hash, 'ambassador', 'active', now, now);
    console.log('Created ambassador: ambassador@example.com / ambassador123');
  } else {
    console.log('Ambassador already exists.');
  }

  console.log('Seed complete.');
}

seed().catch(console.error);
