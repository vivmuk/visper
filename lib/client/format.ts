import { toDate } from "@/lib/entries/shared";

/** "Today, 9:41 AM" / "Yesterday, 8:02 PM" / "Tue, Nov 18" / "Nov 18, 2025" */
export function friendlyDate(value: unknown): string {
  const date = toDate(value);
  if (!date) return "Just now";
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);
  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (days === 0) return `Today, ${time}`;
  if (days === 1) return `Yesterday, ${time}`;
  if (days > 1 && days < 7) {
    return `${date.toLocaleDateString(undefined, { weekday: "long" })}, ${time}`;
  }
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  });
}

export function monthKey(value: unknown) {
  const d = toDate(value) || new Date(0);
  return {
    key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    label: d.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
  };
}

export function wordCount(text: string) {
  const words = text.trim().match(/\S+/g);
  return words ? words.length : 0;
}

export function greeting(name?: string) {
  const h = new Date().getHours();
  const who = name ? `, ${name}` : "";
  if (h < 5) return `Still up${who}?`;
  if (h < 12) return `Good morning${who}`;
  if (h < 17) return `Good afternoon${who}`;
  if (h < 22) return `Good evening${who}`;
  return `Quiet night${who}`;
}

const PROMPTS = [
  "What's on your mind?",
  "What made you smile today?",
  "What's one thing you want to remember about today?",
  "What are you grateful for right now?",
  "What's been taking up space in your head?",
  "What did you learn today?",
  "How are you really feeling?",
  "What would make tomorrow a good day?",
];

export function dailyPrompt() {
  const day = Math.floor(Date.now() / 86400000);
  return PROMPTS[day % PROMPTS.length];
}
