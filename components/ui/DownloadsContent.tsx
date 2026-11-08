"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { platformRequest } from "@/lib/platform-api";
import DownloadAction from "@/components/ui/DownloadAction";

type Quota = {
  plan: string;
  limit: number;
  used: number;
  remaining: number;
  resetsAt: string;
};

type DownloadRecord = {
  id: string;
  videoId: string;
  title: string;
  filepath: string;
  filesize: number;
  status: "pending" | "success" | "failed";
  createdAt: string;
  completedAt: string | null;
  attempt: number;
};

type DownloadsResponse = { downloads: DownloadRecord[] };
type QuotaResponse = { quota: Quota };

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes < 0) return "Unknown size";
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DownloadsContent() {
  const { user, loading: authLoading } = useAuth();
  const [quota, setQuota] = useState<Quota | null>(null);
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    const [quotaData, downloadData] = await Promise.all([
      platformRequest<QuotaResponse>("/downloads/quota"),
      platformRequest<DownloadsResponse>("/downloads"),
    ]);
    setQuota(quotaData.quota);
    setDownloads(downloadData.downloads);
  }, []);

  useEffect(() => {
    if (!user || authLoading) return;
    let active = true;

    Promise.all([
      platformRequest<QuotaResponse>("/downloads/quota"),
      platformRequest<DownloadsResponse>("/downloads"),
    ])
      .then(([quotaData, downloadData]) => {
        if (!active) return;
        setQuota(quotaData.quota);
        setDownloads(downloadData.downloads);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load downloads.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user, authLoading]);

  const refresh = useCallback(async () => {
    try {
      await loadData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not refresh downloads.");
    }
  }, [loadData]);

  if (authLoading) {
    return <p role="status" className="rounded-xl bg-white p-5 text-sm text-slate-500">Checking your account…</p>;
  }
  if (!user) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
        <h2 className="font-semibold text-slate-800">Sign in to manage downloads</h2>
        <p className="mt-2 text-sm text-slate-500">Your history and daily quota are saved to your account.</p>
        <Link href="/login" className="mt-4 inline-flex rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Sign in</Link>
      </div>
    );
  }
  if (loading) {
    return <p role="status" className="rounded-xl bg-white p-5 text-sm text-slate-500">Loading download history…</p>;
  }

  return (
    <div className="space-y-6">
      {error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {quota && (
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500">Today&apos;s downloads · {quota.plan}</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{quota.used} of {quota.limit} used</p>
            </div>
            <Link href="/plans" className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Upgrade plan</Link>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-indigo-600" style={{ width: `${quota.limit ? (quota.used / quota.limit) * 100 : 100}%` }} />
          </div>
          <p className="mt-2 text-xs text-slate-500">Quota resets {new Date(quota.resetsAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST.</p>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-bold text-slate-900">Download history</h2>
        {downloads.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center text-sm text-slate-500">
            No download history yet. Start from a platform-hosted video&apos;s Download button.
          </div>
        ) : (
          <div className="space-y-3">
            {downloads.map((download) => (
              <article key={download.id} className="flex items-center gap-4 rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-900/5">
                <video src={download.filepath} preload="metadata" muted className="aspect-video w-32 shrink-0 rounded-lg bg-slate-100 object-cover" aria-label={`${download.title} thumbnail`} />
                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-2 text-sm font-semibold text-slate-900">{download.title}</h3>
                  <p className="mt-1 text-xs text-slate-500">{formatBytes(download.filesize)} · {new Date(download.createdAt).toLocaleString()}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${download.status === "success" ? "bg-emerald-50 text-emerald-700" : download.status === "failed" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                  {download.status}
                </span>
                {download.status === "success" && (
                  <DownloadAction video={{ _id: download.videoId }} />
                )}
              </article>
            ))}
          </div>
        )}
      </section>
      <button type="button" onClick={() => void refresh()} className="text-sm font-medium text-indigo-700 hover:underline">Refresh history</button>
    </div>
  );
}
