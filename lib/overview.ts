export const modules = [
  { key: 'pairs', table: 'links', label: 'Connected pairs', event: 'Partner connected', icon: '↗', color: '#bd7894' },
  { key: 'cycles', table: 'cycles', label: 'Period entries', event: 'Period logged', icon: '◷', color: '#9182b7' },
  { key: 'logs', table: 'day_logs', label: 'Daily check-ins', event: 'Daily check-in saved', icon: '✓', color: '#639384' },
  { key: 'notes', table: 'notes', label: 'Private notes', event: 'Note sent', icon: '✉', color: '#c49661' },
  { key: 'ratings', table: 'date_ratings', label: 'Date reflections', event: 'Date rated', icon: '☆', color: '#859ab5' },
] as const;
export type Metric = typeof modules[number]['key'];
export type Activity = { kind: string; module: Metric; date: string };
export type Overview = {
  counts: Record<Metric | 'profiles', number | null>;
  week: { date: string; counts: Record<Metric, number | null> }[];
  activities: Activity[];
  unavailable: string[];
  services: { emailKey: boolean; emailSender: boolean; emailHook: boolean };
  checkedAt: string;
};
export function weekWindows(now: Date) {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return Array.from({ length: 7 }, (_, i) => {
    const start = new Date(today.getTime() - (6 - i) * 86400000);
    return { date: start.toISOString().slice(0, 10), start: start.toISOString(),
      end: new Date(start.getTime() + 86400000).toISOString() };
  });
}
export function weekTotal(week: Overview['week'], metric?: Metric): number | null {
  const values = week.flatMap(day => metric ? [day.counts[metric]] : Object.values(day.counts));
  return values.some(value => value === null) ? null : values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
}
export function recentActivities(groups: Activity[][]) {
  return groups.flat().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30);
}

export function summaryCsv(data: Overview) {
  const rows = [['Mahila Mitr aggregate report', data.checkedAt], ['Metric', 'Current total', 'Created in last 7 UTC days'],
    ['Profiles', String(data.counts.profiles ?? 'Unavailable'), 'Not measured'],
    ...modules.map(item => [item.label, String(data.counts[item.key] ?? 'Unavailable'), String(weekTotal(data.week, item.key) ?? 'Unavailable')]),
    [], ['UTC date', ...modules.map(item => item.label)],
    ...data.week.map(day => [day.date, ...modules.map(item => String(day.counts[item.key] ?? 'Unavailable'))])];
  return rows.map(row => row.map(value => `"${value.replaceAll('"', '""')}"`).join(',')).join('\r\n');
}
