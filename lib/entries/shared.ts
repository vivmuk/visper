// Pure entry helpers shared by the server and the browser.
import type { Entry, EntryImage } from "@/types";

export function toDate(value: any): Date | null {
  if (!value) return null;
  try {
    if (typeof value.toDate === "function") return value.toDate();
    if (typeof value.seconds === "number") return new Date(value.seconds * 1000);
    if (typeof value._seconds === "number") return new Date(value._seconds * 1000);
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

/** All images on an entry, including the legacy single-image fields. */
export function entryImages(entry: Partial<Entry>): EntryImage[] {
  if (entry.images && entry.images.length > 0) return entry.images;
  if (entry.imageUrl) {
    return [
      {
        url: entry.imageUrl,
        storagePath: entry.imageStoragePath || "",
        filename: entry.imageMetadata?.filename,
        size: entry.imageMetadata?.size,
        contentType: entry.imageMetadata?.contentType,
        description: entry.imageDescription,
      },
    ];
  }
  return [];
}

// ---------------------------------------------------------------------------
// Calendar days, streaks and "on this day" memories
// ---------------------------------------------------------------------------

export interface DayParts {
  y: number;
  m: number; // 1-12
  d: number;
}

/** The calendar day of a moment, in the given IANA time zone (or the device's). */
export function localParts(date: Date, timeZone?: string): DayParts {
  if (!timeZone) return { y: date.getFullYear(), m: date.getMonth() + 1, d: date.getDate() };
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { y: get("year"), m: get("month"), d: get("day") };
}

export function dayKey(p: DayParts) {
  return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}

export function parseDayKey(key: string): DayParts | null {
  const m = key.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) } : null;
}

const DAY_MS = 86400000;
const utcDay = (p: DayParts) => Date.UTC(p.y, p.m - 1, p.d);

/** Groups entries by the calendar day they were written (device time zone by default). */
export function entriesByDay(entries: Entry[], timeZone?: string): Map<string, Entry[]> {
  const map = new Map<string, Entry[]>();
  for (const entry of entries) {
    const date = toDate(entry.createdAt);
    if (!date) continue;
    const key = dayKey(localParts(date, timeZone));
    const list = map.get(key);
    if (list) list.push(entry);
    else map.set(key, [entry]);
  }
  return map;
}

/**
 * Current streak: consecutive days with at least one entry, ending today (or
 * yesterday, so the streak isn't "broken" before you've had a chance to write
 * today). Longest: the best run ever.
 */
export function computeStreaks(days: Iterable<string>, today: DayParts) {
  const set = new Set(days);
  const stamps = Array.from(set)
    .map(parseDayKey)
    .filter((p): p is DayParts => !!p)
    .map(utcDay)
    .sort((a, b) => a - b);

  let longest = 0;
  let run = 0;
  for (let i = 0; i < stamps.length; i++) {
    run = i > 0 && stamps[i] - stamps[i - 1] === DAY_MS ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  const has = (t: number) => {
    const d = new Date(t);
    return set.has(dayKey({ y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() }));
  };
  let cursor = utcDay(today);
  if (!has(cursor)) cursor -= DAY_MS;
  let current = 0;
  while (has(cursor)) {
    current++;
    cursor -= DAY_MS;
  }
  return { current, longest, wroteToday: has(utcDay(today)) };
}

export interface MemoryGroup {
  yearsAgo: number;
  entries: Entry[];
}

export interface Memories {
  onThisDay: MemoryGroup[];
  thisWeek: MemoryGroup[];
}

/**
 * Entries from previous years written on today's date ("on this day") or
 * within `windowDays` of it ("this week in past years").
 */
export function findMemories(
  entries: Entry[],
  today: DayParts,
  timeZone?: string,
  windowDays = 3
): Memories {
  const onThisDay = new Map<number, Entry[]>();
  const thisWeek = new Map<number, Entry[]>();

  for (const entry of entries) {
    const date = toDate(entry.createdAt);
    if (!date) continue;
    const p = localParts(date, timeZone);
    // Compare with today's month/day in that year and its neighbours, so a
    // Dec 30 entry still counts for "this week" on Jan 2.
    let best: { dist: number; year: number } | null = null;
    for (const year of [p.y - 1, p.y, p.y + 1]) {
      if (year >= today.y) continue; // only past anniversaries
      const anniversary = Date.UTC(year, today.m - 1, today.d);
      const dist = Math.abs(utcDay(p) - anniversary) / DAY_MS;
      if (!best || dist < best.dist) best = { dist, year };
    }
    if (!best || best.dist > windowDays) continue;
    const yearsAgo = today.y - best.year;
    const target = best.dist === 0 ? onThisDay : thisWeek;
    const list = target.get(yearsAgo);
    if (list) list.push(entry);
    else target.set(yearsAgo, [entry]);
  }

  const toGroups = (map: Map<number, Entry[]>) =>
    Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([yearsAgo, list]) => ({
        yearsAgo,
        entries: list.sort(
          (a, b) => (toDate(a.createdAt)?.getTime() || 0) - (toDate(b.createdAt)?.getTime() || 0)
        ),
      }));

  return { onThisDay: toGroups(onThisDay), thisWeek: toGroups(thisWeek) };
}
