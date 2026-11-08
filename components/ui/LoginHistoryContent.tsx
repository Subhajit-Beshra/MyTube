"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { platformRequest } from "@/lib/platform-api";
import { requestLocationPermission } from "@/lib/location.js";

type LoginEvent = {
  _id: string;
  succeeded: boolean;
  timestamp: string;
  ipAddress: string;
  browser: string;
  operatingSystem: string;
  deviceType: string;
  isNewDevice: boolean;
};

export default function LoginHistoryContent() {
  const { user, loading: authLoading } = useAuth();
  const [history, setHistory] = useState<LoginEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [locationStatus, setLocationStatus] = useState("");
  const [locationBusy, setLocationBusy] = useState(false);

  async function checkLocationPermission() {
    setLocationBusy(true);
    setLocationStatus("");
    try {
      await requestLocationPermission(
        typeof navigator !== "undefined" ? navigator.geolocation : undefined,
      );
      setLocationStatus("Permission granted. Your coordinates were discarded and were not sent to MyTube.");
    } catch (cause) {
      setLocationStatus(cause instanceof Error ? cause.message : "Could not check location permission.");
    } finally {
      setLocationBusy(false);
    }
  }

  useEffect(() => {
    if (!user || authLoading) return;
    let active = true;
    platformRequest<{ history: LoginEvent[] }>("/auth/login-history")
      .then(({ history: events }) => {
        if (active) setHistory(events);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load login history.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user, authLoading]);

  if (authLoading) return <p role="status" className="rounded-xl bg-white p-5 text-sm text-slate-500">Checking your account…</p>;
  if (!user) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
        <h2 className="font-semibold">Sign in to view account activity</h2>
        <Link href="/login" className="mt-4 inline-flex rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Sign in</Link>
      </div>
    );
  }
  if (loading) return <p role="status" className="rounded-xl bg-white p-5 text-sm text-slate-500">Loading login history…</p>;

  return (
    <div className="space-y-5">
      {error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
        New browser/device sign-ins require email verification unless the device is trusted. IP addresses are server-observed; exact location is not collected.
      </p>
      <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5">
        <h2 className="font-semibold text-slate-900">Location permission</h2>
        <p className="mt-1 text-sm text-slate-600">
          Check whether your browser can provide a current location. MyTube does not save or transmit the coordinates.
        </p>
        <button
          type="button"
          disabled={locationBusy}
          onClick={() => void checkLocationPermission()}
          className="mt-3 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {locationBusy ? "Checking permission…" : "Check location permission"}
        </button>
        {locationStatus && <p role="status" className="mt-3 text-sm text-slate-700">{locationStatus}</p>}
      </section>
      {history.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">No sign-in events recorded.</p>
      ) : (
        <div className="space-y-3">
          {history.map((event) => (
            <article key={event._id} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold text-slate-900">{event.browser} · {event.operatingSystem} · {event.deviceType}</h2>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${event.succeeded ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                  {event.succeeded ? "Successful" : "Failed"}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">{event.ipAddress || "IP unavailable"} · {new Date(event.timestamp).toLocaleString("en-IN")}</p>
              {event.isNewDevice && <p className="mt-2 text-xs font-semibold text-amber-700">New browser or device pattern</p>}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
