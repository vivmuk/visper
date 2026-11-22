// Offline outbox: text entries written without a connection are kept on the
// device and sent automatically when the connection comes back.
import type { User } from "firebase/auth";
import { apiFetch, ApiError } from "./api";

const KEY = "visper:outbox";
export const OUTBOX_EVENT = "visper:outbox-changed";

export interface QueuedEntry {
  id: string;
  uid: string; // Only ever synced to the account that wrote it
  createdAt: string;
  payload: Record<string, any>;
}

function read(): QueuedEntry[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function write(items: QueuedEntry[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // Storage full or blocked; nothing else we can do.
  }
  window.dispatchEvent(new Event(OUTBOX_EVENT));
}

export function outboxCount(uid?: string) {
  return read().filter((i) => !uid || i.uid === uid).length;
}

export function queueEntry(uid: string, payload: Record<string, any>) {
  const items = read();
  items.push({
    id: Math.random().toString(36).slice(2),
    uid,
    createdAt: new Date().toISOString(),
    payload: { ...payload, writtenAt: new Date().toISOString() },
  });
  write(items);
}

let flushing = false;

/** Sends queued entries. Returns how many were delivered. */
export async function flushOutbox(user: User | null): Promise<number> {
  if (flushing || !user || !navigator.onLine) return 0;
  flushing = true;
  let sent = 0;
  try {
    for (const item of read().filter((i) => i.uid === user.uid)) {
      try {
        await apiFetch(user, "/api/entries", {
          method: "POST",
          body: JSON.stringify(item.payload),
        });
        write(read().filter((i) => i.id !== item.id));
        sent++;
      } catch (error) {
        // A 4xx means the entry itself is invalid: drop it rather than retry
        // forever. Network/server errors: stop and try again later.
        if (error instanceof ApiError && error.status >= 400 && error.status < 500 && error.status !== 401) {
          write(read().filter((i) => i.id !== item.id));
          continue;
        }
        break;
      }
    }
  } finally {
    flushing = false;
  }
  return sent;
}
