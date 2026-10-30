import type { PlanDay } from './plan';

function download(filename: string, mime: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const csvCell = (v: unknown) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Download rows as a spreadsheet-ready CSV (with a byte-order mark so Excel reads rupee signs). */
export function downloadCsv(filename: string, columns: string[], rows: Array<Array<unknown>>) {
  const body = [columns, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
  download(filename, 'text/csv;charset=utf-8', '\ufeff' + body);
}

const pad = (n: number) => String(n).padStart(2, '0');
const stamp = (d: Date, minutes: number) => {
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, minutes);
  return `${t.getFullYear()}${pad(t.getMonth() + 1)}${pad(t.getDate())}T${pad(t.getHours())}${pad(t.getMinutes())}00`;
};
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

/** The plan as a calendar file: one event per stop, in the traveller's local time. */
export function downloadIcs(tripName: string, start: Date, days: PlanDay[]) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Merydian//Trip plan//EN', 'CALSCALE:GREGORIAN', `X-WR-CALNAME:${esc(tripName)}`];
  const now = new Date();
  const created = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}00Z`;
  days.forEach((d) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + (d.day - 1));
    d.stops.forEach((s, i) => {
      lines.push(
        'BEGIN:VEVENT',
        `UID:${tripName.replace(/\W+/g, '-')}-d${d.day}-${i}@merydian`,
        `DTSTAMP:${created}`,
        `DTSTART:${stamp(date, s.start)}`,
        `DTEND:${stamp(date, Math.max(s.end, s.start + 15))}`,
        `SUMMARY:${esc(s.title)}`,
        `DESCRIPTION:${esc(`${tripName}, day ${d.day}, stop ${i + 1}`)}`,
        'END:VEVENT',
      );
    });
  });
  lines.push('END:VCALENDAR');
  download(`${tripName.replace(/\W+/g, '-').toLowerCase() || 'trip'}.ics`, 'text/calendar;charset=utf-8', lines.join('\r\n'));
}
