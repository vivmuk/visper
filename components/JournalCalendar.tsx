"use client";

import { useMemo, useState } from "react";
import {
  computeStreaks,
  dayKey,
  entriesByDay,
  findMemories,
  localParts,
} from "@/lib/entries/shared";
import { MemoriesStrip } from "./MemoriesCard";
import { ChevronLeftIcon, ChevronRightIcon } from "./ui/Icons";
import type { Entry } from "@/types";

const MONTHS = Array.from({ length: 12 }, (_, m) =>
  new Date(2024, m, 1).toLocaleDateString(undefined, { month: "short" })
);
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

/** Watercolor intensity scale: teal -> purple -> pink as you write more. */
function levelClass(count: number) {
  if (count === 0) return "bg-white/70 border border-teal-100";
  if (count === 1) return "bg-teal-200";
  if (count === 2) return "bg-teal-400";
  if (count <= 4) return "bg-purple-400";
  return "bg-pink-500";
}
const LEGEND = [0, 1, 2, 3, 5];

interface JournalCalendarProps {
  entries: Entry[];
  onOpenDay: (key: string, label: string, entries: Entry[]) => void;
  onEdited?: (entry: Entry) => void;
  onDeleted?: (id: string) => void;
  onTagClick?: (tag: string) => void;
}

/** A year of mini-month calendars shaded by how much you wrote each day. */
export default function JournalCalendar({ entries, onOpenDay, onEdited, onDeleted, onTagClick }: JournalCalendarProps) {
  const today = useMemo(() => localParts(new Date()), []);
  const todayKey = dayKey(today);
  const byDay = useMemo(() => entriesByDay(entries), [entries]);

  const years = useMemo(() => {
    const ys = Array.from(byDay.keys()).map((k) => Number(k.slice(0, 4)));
    const first = ys.length ? Math.min(...ys) : today.y;
    return Array.from({ length: today.y - first + 1 }, (_, i) => today.y - i);
  }, [byDay, today.y]);
  const [year, setYear] = useState(today.y);

  const streaks = useMemo(() => computeStreaks(byDay.keys(), today), [byDay, today]);
  const memories = useMemo(() => findMemories(entries, today), [entries, today]);

  const yearStats = useMemo(() => {
    let count = 0;
    let days = 0;
    const perMonth = Array(12).fill(0) as number[];
    byDay.forEach((list, key) => {
      if (!key.startsWith(`${year}-`)) return;
      count += list.length;
      days += 1;
      perMonth[Number(key.slice(5, 7)) - 1] += list.length;
    });
    return { count, days, perMonth };
  }, [byDay, year]);

  const idx = years.indexOf(year);

  return (
    <div className="animate-rise-in space-y-5">
      <section className="watercolor-card rounded-3xl border border-white/70 p-4">
        {/* Year switcher */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setYear(years[idx + 1])}
            disabled={idx >= years.length - 1}
            className="h-10 w-10 grid place-items-center rounded-full text-slate-500 hover:bg-white/80 disabled:opacity-30"
            aria-label="Previous year"
          >
            <ChevronLeftIcon />
          </button>
          <h2 className="text-2xl font-bold gradient-text tabular-nums">{year}</h2>
          <button
            onClick={() => setYear(years[idx - 1])}
            disabled={idx <= 0}
            className="h-10 w-10 grid place-items-center rounded-full text-slate-500 hover:bg-white/80 disabled:opacity-30"
            aria-label="Next year"
          >
            <ChevronRightIcon />
          </button>
        </div>

        {/* Stats */}
        <div className="mt-2 grid grid-cols-4 gap-2 text-center">
          <Stat value={yearStats.count} label="entries" />
          <Stat value={yearStats.days} label="days" />
          <Stat value={streaks.current} label={streaks.wroteToday ? "day streak 🔥" : "day streak"} highlight={streaks.current > 0} />
          <Stat value={streaks.longest} label="best streak" />
        </div>

        {/* Months */}
        <div className="mt-4 grid grid-cols-3 md:grid-cols-4 gap-x-3 gap-y-4">
          {MONTHS.map((name, m) => {
            const firstWeekday = new Date(year, m, 1).getDay();
            const daysInMonth = new Date(year, m + 1, 0).getDate();
            const monthCount = yearStats.perMonth[m];
            return (
              <div key={name}>
                <div className="flex items-baseline justify-between px-0.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">{name}</span>
                </div>
                <div className="mt-1 grid grid-cols-7 gap-[3px]">
                  {WEEKDAYS.map((w, i) => (
                    <span key={i} className="text-[7px] leading-none text-center text-slate-400" aria-hidden="true">
                      {w}
                    </span>
                  ))}
                  {Array.from({ length: firstWeekday }).map((_, i) => (
                    <span key={`b${i}`} />
                  ))}
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const d = i + 1;
                    const key = dayKey({ y: year, m: m + 1, d });
                    const list = byDay.get(key) || [];
                    const isToday = key === todayKey;
                    const isFuture = key > todayKey;
                    const label = new Date(year, m, d).toLocaleDateString(undefined, {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    });
                    return (
                      <button
                        key={key}
                        disabled={list.length === 0}
                        onClick={() => onOpenDay(key, label, list)}
                        aria-label={`${label}: ${list.length} entr${list.length === 1 ? "y" : "ies"}`}
                        className={`aspect-square rounded-[4px] transition-transform ${levelClass(list.length)} ${
                          isToday ? "ring-2 ring-offset-1 ring-purple-500" : ""
                        } ${isFuture ? "opacity-40" : ""} ${list.length ? "active:scale-90 hover:scale-110" : "cursor-default"}`}
                      />
                    );
                  })}
                </div>
                <p className="mt-1 text-[10px] text-slate-400 px-0.5 tabular-nums">
                  {monthCount > 0 ? `${monthCount} entr${monthCount === 1 ? "y" : "ies"}` : " "}
                </p>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-3 flex items-center justify-end gap-1.5 text-[11px] text-slate-500">
          Less
          {LEGEND.map((n) => (
            <span key={n} className={`h-3 w-3 rounded-[3px] ${levelClass(n)}`} />
          ))}
          More
        </div>
      </section>

      <MemoriesStrip memories={memories} onEdited={onEdited} onDeleted={onDeleted} onTagClick={onTagClick} />
      {memories.onThisDay.length === 0 && memories.thisWeek.length === 0 && (
        <p className="text-center text-sm text-slate-400 px-6">
          Memories from this day in past years will appear here once your journal is a year old.
        </p>
      )}
    </div>
  );
}

function Stat({ value, label, highlight }: { value: number; label: string; highlight?: boolean }) {
  return (
    <div className="rounded-2xl bg-white/70 border border-white py-2">
      <div className={`text-xl font-bold tabular-nums ${highlight ? "gradient-text" : "text-slate-800"}`}>{value}</div>
      <div className="text-[10px] leading-tight text-slate-500">{label}</div>
    </div>
  );
}
