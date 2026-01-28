import ExcelJS from 'exceljs';
import { getDb } from '../db/schema';

interface SessionRow {
  id: string;
  ambassador_id: string;
  full_name: string;
  email: string;
  clock_in_at: string;
  clock_out_at: string | null;
  total_minutes: number | null;
  flags_json: string;
}

function getMonthRange(month: string) {
  const start = `${month}-01T00:00:00.000Z`;
  const [y, m] = month.split('-').map(Number);
  const endDate = new Date(Date.UTC(y, m, 1));
  return { start, end: endDate.toISOString(), year: y, mon: m };
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function getTimesheetData(month: string) {
  const db = getDb();
  const { start, end } = getMonthRange(month);

  const rows = db.prepare(`
    SELECT s.*, a.full_name, a.email
    FROM sessions s
    JOIN ambassadors a ON a.id = s.ambassador_id
    WHERE s.clock_in_at >= ? AND s.clock_in_at < ?
    ORDER BY a.full_name, s.clock_in_at
  `).all(start, end) as SessionRow[];

  const summaryMap = new Map<string, { full_name: string; email: string; shifts: number; totalMinutes: number; flagsCount: number }>();
  for (const row of rows) {
    let entry = summaryMap.get(row.ambassador_id);
    if (!entry) {
      entry = { full_name: row.full_name, email: row.email, shifts: 0, totalMinutes: 0, flagsCount: 0 };
      summaryMap.set(row.ambassador_id, entry);
    }
    entry.shifts++;
    entry.totalMinutes += row.total_minutes || 0;
    const flags: string[] = JSON.parse(row.flags_json || '[]');
    if (!row.clock_out_at) flags.push('OPEN_SESSION');
    entry.flagsCount += flags.length;
  }

  return { rows, summary: Array.from(summaryMap.values()) };
}

export async function generateTimesheetExcel(month: string): Promise<Buffer> {
  const db = getDb();
  const { start, end, year, mon } = getMonthRange(month);
  const daysInMonth = getDaysInMonth(year, mon);

  const rows = db.prepare(`
    SELECT s.*, a.full_name, a.email
    FROM sessions s
    JOIN ambassadors a ON a.id = s.ambassador_id
    WHERE s.clock_in_at >= ? AND s.clock_in_at < ?
    ORDER BY a.full_name, s.clock_in_at
  `).all(start, end) as SessionRow[];

  // Group by ambassador
  const byAmbassador = new Map<string, { full_name: string; email: string; sessions: SessionRow[] }>();
  for (const r of rows) {
    let entry = byAmbassador.get(r.ambassador_id);
    if (!entry) {
      entry = { full_name: r.full_name, email: r.email, sessions: [] };
      byAmbassador.set(r.ambassador_id, entry);
    }
    entry.sessions.push(r);
  }

  const workbook = new ExcelJS.Workbook();

  // Sheet 1: Summary
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.columns = [
    { header: 'Ambassador Name', key: 'full_name', width: 25 },
    { header: 'Ambassador Email', key: 'email', width: 30 },
    { header: 'Total Shifts', key: 'shifts', width: 12 },
    { header: 'Total Hours', key: 'hours', width: 12 },
    { header: 'Total Minutes', key: 'minutes', width: 14 },
    { header: 'Flags Count', key: 'flagsCount', width: 12 },
  ];
  summarySheet.getRow(1).font = { bold: true };
  summarySheet.views = [{ state: 'frozen', ySplit: 1, xSplit: 0 }];

  for (const [, amb] of byAmbassador) {
    const totalMin = amb.sessions.reduce((s, r) => s + (r.total_minutes || 0), 0);
    let flagsCount = 0;
    for (const r of amb.sessions) {
      const f: string[] = JSON.parse(r.flags_json || '[]');
      if (!r.clock_out_at) f.push('OPEN_SESSION');
      flagsCount += f.length;
    }
    summarySheet.addRow({
      full_name: amb.full_name, email: amb.email,
      shifts: amb.sessions.length,
      hours: Math.round((totalMin / 60) * 100) / 100,
      minutes: totalMin, flagsCount,
    });
  }

  // One sheet per ambassador with daily detail
  for (const [, amb] of byAmbassador) {
    const sheetName = amb.full_name.slice(0, 31); // Excel max 31 chars
    const sheet = workbook.addWorksheet(sheetName);
    sheet.columns = [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Day', key: 'day', width: 12 },
      { header: 'Clock In', key: 'clock_in', width: 22 },
      { header: 'Clock Out', key: 'clock_out', width: 22 },
      { header: 'Minutes', key: 'minutes', width: 10 },
      { header: 'Hours', key: 'hours', width: 10 },
      { header: 'Flags', key: 'flags', width: 30 },
    ];
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: 'frozen', ySplit: 1, xSplit: 0 }];

    // Build a map: date string -> sessions for that day
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const sessionsByDate = new Map<string, SessionRow[]>();
    for (const s of amb.sessions) {
      const dateStr = s.clock_in_at.slice(0, 10);
      let arr = sessionsByDate.get(dateStr);
      if (!arr) { arr = []; sessionsByDate.set(dateStr, arr); }
      arr.push(s);
    }

    let totalMinutesAll = 0;

    // List every day of the month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(mon).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = dayNames[new Date(dateStr + 'T00:00:00Z').getUTCDay()];
      const daySessions = sessionsByDate.get(dateStr);

      if (!daySessions || daySessions.length === 0) {
        // No login this day
        sheet.addRow({ date: dateStr, day: dayOfWeek, clock_in: '-', clock_out: '-', minutes: '-', hours: '-', flags: '' });
      } else {
        for (const s of daySessions) {
          const flags: string[] = JSON.parse(s.flags_json || '[]');
          if (!s.clock_out_at) flags.push('OPEN_SESSION');
          const mins = s.total_minutes ?? 0;
          totalMinutesAll += mins;
          sheet.addRow({
            date: dateStr,
            day: dayOfWeek,
            clock_in: s.clock_in_at.replace('T', ' ').slice(0, 19),
            clock_out: s.clock_out_at ? s.clock_out_at.replace('T', ' ').slice(0, 19) : '-',
            minutes: s.total_minutes ?? '-',
            hours: s.total_minutes != null ? Math.round((s.total_minutes / 60) * 100) / 100 : '-',
            flags: flags.join(', '),
          });
        }
      }
    }

    // Totals row at bottom
    sheet.addRow({});
    const totalRow = sheet.addRow({
      date: 'TOTAL',
      day: '',
      clock_in: '',
      clock_out: '',
      minutes: totalMinutesAll,
      hours: Math.round((totalMinutesAll / 60) * 100) / 100,
      flags: '',
    });
    totalRow.font = { bold: true };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// Individual ambassador Excel export
export async function generateAmbassadorExcel(ambassadorId: string, month: string): Promise<{ buffer: Buffer; name: string } | null> {
  const db = getDb();
  const { start, end, year, mon } = getMonthRange(month);
  const daysInMonth = getDaysInMonth(year, mon);

  const amb = db.prepare('SELECT id, full_name, email FROM ambassadors WHERE id = ?').get(ambassadorId) as any;
  if (!amb) return null;

  const sessions = db.prepare(`
    SELECT * FROM sessions WHERE ambassador_id = ? AND clock_in_at >= ? AND clock_in_at < ? ORDER BY clock_in_at
  `).all(ambassadorId, start, end) as any[];

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Timesheet');
  sheet.columns = [
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Day', key: 'day', width: 12 },
    { header: 'Clock In', key: 'clock_in', width: 22 },
    { header: 'Clock Out', key: 'clock_out', width: 22 },
    { header: 'Minutes', key: 'minutes', width: 10 },
    { header: 'Hours', key: 'hours', width: 10 },
    { header: 'Flags', key: 'flags', width: 30 },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: 'frozen', ySplit: 1, xSplit: 0 }];

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const sessionsByDate = new Map<string, any[]>();
  for (const s of sessions) {
    const dateStr = s.clock_in_at.slice(0, 10);
    let arr = sessionsByDate.get(dateStr);
    if (!arr) { arr = []; sessionsByDate.set(dateStr, arr); }
    arr.push(s);
  }

  let totalMinutesAll = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(mon).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayOfWeek = dayNames[new Date(dateStr + 'T00:00:00Z').getUTCDay()];
    const daySessions = sessionsByDate.get(dateStr);

    if (!daySessions || daySessions.length === 0) {
      sheet.addRow({ date: dateStr, day: dayOfWeek, clock_in: '-', clock_out: '-', minutes: '-', hours: '-', flags: '' });
    } else {
      for (const s of daySessions) {
        const flags: string[] = JSON.parse(s.flags_json || '[]');
        if (!s.clock_out_at) flags.push('OPEN_SESSION');
        const mins = s.total_minutes ?? 0;
        totalMinutesAll += mins;
        sheet.addRow({
          date: dateStr, day: dayOfWeek,
          clock_in: s.clock_in_at.replace('T', ' ').slice(0, 19),
          clock_out: s.clock_out_at ? s.clock_out_at.replace('T', ' ').slice(0, 19) : '-',
          minutes: s.total_minutes ?? '-',
          hours: s.total_minutes != null ? Math.round((s.total_minutes / 60) * 100) / 100 : '-',
          flags: flags.join(', '),
        });
      }
    }
  }

  sheet.addRow({});
  const totalRow = sheet.addRow({
    date: 'TOTAL', day: '', clock_in: '', clock_out: '',
    minutes: totalMinutesAll,
    hours: Math.round((totalMinutesAll / 60) * 100) / 100,
    flags: '',
  });
  totalRow.font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  return { buffer: Buffer.from(buffer), name: amb.full_name };
}
