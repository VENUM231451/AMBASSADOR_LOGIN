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

export function getTimesheetData(month: string) {
  const db = getDb();
  const start = `${month}-01T00:00:00.000Z`;
  // compute end of month
  const [y, m] = month.split('-').map(Number);
  const endDate = new Date(Date.UTC(y, m, 1)); // first day of next month
  const end = endDate.toISOString();

  const rows = db.prepare(`
    SELECT s.*, a.full_name, a.email
    FROM sessions s
    JOIN ambassadors a ON a.id = s.ambassador_id
    WHERE s.clock_in_at >= ? AND s.clock_in_at < ?
    ORDER BY a.full_name, s.clock_in_at
  `).all(start, end) as SessionRow[];

  // Build summary
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
  const { rows, summary } = getTimesheetData(month);

  const workbook = new ExcelJS.Workbook();

  // Sheet 1: Summary
  const sheet1 = workbook.addWorksheet('Summary');
  sheet1.columns = [
    { header: 'Ambassador Name', key: 'full_name', width: 25 },
    { header: 'Ambassador Email', key: 'email', width: 30 },
    { header: 'Total Shifts', key: 'shifts', width: 12 },
    { header: 'Total Hours', key: 'hours', width: 12 },
    { header: 'Total Minutes', key: 'minutes', width: 14 },
    { header: 'Flags Count', key: 'flagsCount', width: 12 },
  ];
  sheet1.getRow(1).font = { bold: true };
  sheet1.views = [{ state: 'frozen', ySplit: 1, xSplit: 0 }];

  for (const s of summary) {
    sheet1.addRow({
      full_name: s.full_name, email: s.email, shifts: s.shifts,
      hours: Math.round((s.totalMinutes / 60) * 100) / 100,
      minutes: s.totalMinutes, flagsCount: s.flagsCount,
    });
  }

  // Sheet 2: Detailed Logs
  const sheet2 = workbook.addWorksheet('Detailed Logs');
  sheet2.columns = [
    { header: 'Ambassador Name', key: 'full_name', width: 25 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Date', key: 'date', width: 12 },
    { header: 'Clock In', key: 'clock_in', width: 22 },
    { header: 'Clock Out', key: 'clock_out', width: 22 },
    { header: 'Minutes', key: 'minutes', width: 10 },
    { header: 'Hours', key: 'hours', width: 10 },
    { header: 'Flags', key: 'flags', width: 30 },
  ];
  sheet2.getRow(1).font = { bold: true };
  sheet2.views = [{ state: 'frozen', ySplit: 1, xSplit: 0 }];

  for (const r of rows) {
    const flags: string[] = JSON.parse(r.flags_json || '[]');
    if (!r.clock_out_at) flags.push('OPEN_SESSION');
    sheet2.addRow({
      full_name: r.full_name, email: r.email,
      date: r.clock_in_at.slice(0, 10),
      clock_in: r.clock_in_at,
      clock_out: r.clock_out_at || '',
      minutes: r.total_minutes ?? '',
      hours: r.total_minutes != null ? Math.round((r.total_minutes / 60) * 100) / 100 : '',
      flags: flags.join(', '),
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
