"use client";

import { useEffect } from "react";

/** Registers the offline/installable service worker in production builds. */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const register = () => navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);
  return null;
}

/** Removes cached journal data from this device (called on sign-out). */
export function clearOfflineData() {
  try {
    navigator.serviceWorker?.controller?.postMessage("clear-data");
    caches?.delete("visper-data");
    localStorage.removeItem("visper:draft");
  } catch {
    // Ignore: nothing cached
  }
}
