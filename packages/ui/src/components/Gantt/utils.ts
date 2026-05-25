import type { ZoomLevel } from './types';

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function startOfQuarter(date: Date): Date {
  const q = Math.floor(date.getMonth() / 3);
  return new Date(date.getFullYear(), q * 3, 1);
}

export function formatHeader(date: Date, zoom: ZoomLevel): string {
  switch (zoom) {
    case 'day':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    case 'week':
      return `W${getWeekNumber(date)} ${date.getFullYear()}`;
    case 'month':
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    case 'quarter': {
      const q = Math.floor(date.getMonth() / 3) + 1;
      return `Q${q} ${date.getFullYear()}`;
    }
  }
}

export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/** Returns the column width in px for one unit at the given zoom level */
export function colWidth(zoom: ZoomLevel): number {
  switch (zoom) {
    case 'day': return 40;
    case 'week': return 120;
    case 'month': return 160;
    case 'quarter': return 200;
  }
}

/** Returns the number of days per column at the given zoom level */
export function daysPerCol(zoom: ZoomLevel): number {
  switch (zoom) {
    case 'day': return 1;
    case 'week': return 7;
    case 'month': return 30;
    case 'quarter': return 91;
  }
}

/** Generate column header dates for a date range */
export function generateColumns(start: Date, end: Date, zoom: ZoomLevel): Date[] {
  const cols: Date[] = [];
  let current = new Date(start);

  while (current <= end) {
    cols.push(new Date(current));
    current = addDays(current, daysPerCol(zoom));
  }

  return cols;
}

/** Map a date to x offset from timeline start */
export function dateToX(date: Date, timelineStart: Date, zoom: ZoomLevel): number {
  const diffMs = date.getTime() - timelineStart.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return (diffDays / daysPerCol(zoom)) * colWidth(zoom);
}

/** Map a bar width in days to px */
export function durationToWidth(startDate: Date, endDate: Date, zoom: ZoomLevel): number {
  const diffMs = endDate.getTime() - startDate.getTime();
  const diffDays = Math.max(1, diffMs / (1000 * 60 * 60 * 24));
  return (diffDays / daysPerCol(zoom)) * colWidth(zoom);
}
