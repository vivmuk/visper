"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { useToast } from "@/lib/toast/ToastContext";
import { apiFetch, errorMessage } from "@/lib/client/api";
import { clearOfflineData } from "./ServiceWorkerRegister";
import BottomSheet from "./ui/BottomSheet";
import { LogOutIcon, PlusIcon, RefreshIcon, ShieldIcon } from "./ui/Icons";
import type { HealthResponse } from "@/types";

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export default function UserMenu() {
  const { user, loading, logout } = useAuth();
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [checking, setChecking] = useState(false);
  const [legacy, setLegacy] = useState<{ images: number } | null>(null);
  const [securing, setSecuring] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as InstallPrompt);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const checkHealth = async () => {
    setChecking(true);
    try {
      setHealth(await apiFetch<HealthResponse>(user, "/api/health"));
    } catch (error) {
      setHealth({
        ok: false,
        checks: {
          firestore: { ok: false, message: errorMessage(error) },
          storage: { ok: false, message: "Not checked" },
          venice: { ok: false, message: "Not checked" },
        },
      });
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !user) return;
    checkHealth();
    apiFetch<{ images: number }>(user, "/api/images/secure")
      .then(setLegacy)
      .catch(() => setLegacy(null));
  }, [isOpen, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const secureImages = async () => {
    setSecuring(true);
    try {
      const r = await apiFetch<{ secured: number; failed: number; remainingEntries: number }>(user, "/api/images/secure", {
        method: "POST",
      });
      showToast(
        r.failed ? `Secured ${r.secured} photos; ${r.failed} entries couldn't be updated` : `Secured ${r.secured} photos`,
        r.failed ? "error" : "success"
      );
      setLegacy(r.remainingEntries ? { images: r.remainingEntries } : { images: 0 });
    } catch (error) {
      showToast(errorMessage(error, "Couldn't secure photos"), "error");
    } finally {
      setSecuring(false);
    }
  };

  if (loading) return <div className="w-10 h-10 rounded-full bg-white/60 animate-pulse" />;
  if (!user) return null;

  const initial = user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U";

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm ring-1 ring-teal-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
        aria-label="Account and settings"
      >
        {user.photoURL ? (
          <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
        ) : (
          <span className="w-full h-full bg-gradient-to-br from-teal-300 to-purple-300 grid place-items-center text-white font-semibold">
            {initial}
          </span>
        )}
      </button>

      <BottomSheet open={isOpen} onClose={() => setIsOpen(false)} title="Account">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-teal-300 to-purple-300 grid place-items-center text-white font-semibold">
            {user.photoURL ? (
              <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            ) : (
              initial
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-800 truncate">{user.displayName || "You"}</p>
            <p className="text-sm text-slate-500 truncate">{user.email}</p>
          </div>
        </div>

        <div className="py-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-700">System status</h3>
            <button onClick={checkHealth} disabled={checking} className="h-8 w-8 grid place-items-center rounded-full text-slate-500 hover:bg-slate-100" aria-label="Re-check">
              <RefreshIcon size={16} className={checking ? "animate-spin" : ""} />
            </button>
          </div>
          {health ? (
            <ul className="space-y-2 text-sm">
              <StatusRow label="Journal database" check={health.checks.firestore} />
              <StatusRow label="Photo storage" check={health.checks.storage} />
              <StatusRow
                label="Venice AI"
                check={health.checks.venice}
                extra={
                  health.checks.venice.balanceUsd !== undefined
                    ? `$${health.checks.venice.balanceUsd.toFixed(2)} · ${health.checks.venice.balanceDiem?.toFixed(2)} DIEM`
                    : undefined
                }
              />
            </ul>
          ) : (
            <div className="space-y-2">
              <div className="skeleton h-5 w-full" />
              <div className="skeleton h-5 w-full" />
              <div className="skeleton h-5 w-full" />
            </div>
          )}
        </div>

        {legacy && legacy.images > 0 && (
          <div className="py-4 border-b border-slate-100">
            <div className="flex gap-3">
              <ShieldIcon size={22} className="text-purple-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-slate-800">Make older photos private</p>
                <p className="text-sm text-slate-500">
                  {legacy.images} older photo{legacy.images === 1 ? " is" : "s are"} still viewable by anyone with the link.
                </p>
                <button
                  onClick={secureImages}
                  disabled={securing}
                  className="mt-3 h-10 px-4 rounded-xl btn-gradient text-sm font-semibold shadow disabled:opacity-60"
                >
                  {securing ? "Securing…" : "Secure them now"}
                </button>
              </div>
            </div>
          </div>
        )}

        {installPrompt && (
          <button
            onClick={async () => {
              await installPrompt.prompt();
              setInstallPrompt(null);
            }}
            className="w-full h-12 mt-3 flex items-center gap-3 px-3 rounded-xl text-slate-700 hover:bg-slate-50"
          >
            <PlusIcon size={20} /> Install Visper on this device
          </button>
        )}

        <button
          onClick={async () => {
            clearOfflineData();
            await logout();
            setIsOpen(false);
          }}
          className="w-full h-12 mt-1 mb-2 flex items-center gap-3 px-3 rounded-xl text-slate-700 hover:bg-slate-50"
        >
          <LogOutIcon size={20} /> Sign out
        </button>
      </BottomSheet>
    </>
  );
}

function StatusRow({
  label,
  check,
  extra,
}: {
  label: string;
  check: { ok: boolean; message?: string };
  extra?: string;
}) {
  return (
    <li className="flex items-start gap-2.5">
      <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${check.ok ? "bg-emerald-400" : "bg-rose-500"}`} />
      <span className="flex-1">
        <span className="text-slate-700">{label}</span>
        {extra && <span className="text-slate-400"> · {extra}</span>}
        {!check.ok && check.message && <span className="block text-xs text-rose-600">{check.message}</span>}
      </span>
    </li>
  );
}
