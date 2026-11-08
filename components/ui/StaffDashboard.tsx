"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { platformRequest } from "@/lib/platform-api";

type Person = {
  _id: string;
  name?: string;
  email?: string;
  role?: "user" | "staff";
  accountStatus?: "active" | "suspended";
};

type ReportBase = {
  _id: string;
  reason: string;
  status: "open" | "reviewed" | "dismissed";
  createdAt: string;
  reporter: Person | null;
};

type CommentReport = ReportBase & {
  comment: { _id: string; content: string; videoId: string; author: Person | null } | null;
};

type VideoReport = ReportBase & {
  videoId: string;
  provider: "platform" | "youtube";
  title: string;
};

type AccountReport = ReportBase & {
  reportedUser: Person | null;
};

type ReportsResponse = {
  commentReports: CommentReport[];
  videoReports: VideoReport[];
  accountReports: AccountReport[];
};

const emptyReports: ReportsResponse = {
  commentReports: [],
  videoReports: [],
  accountReports: [],
};

export default function StaffDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [reports, setReports] = useState<ReportsResponse>(emptyReports);
  const [suspendedUsers, setSuspendedUsers] = useState<Person[]>([]);
  const [reportStatus, setReportStatus] = useState("open");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const fetchData = useCallback(async () => {
    const [reportData, userData] = await Promise.all([
      platformRequest<ReportsResponse>(`/moderation/reports?status=${reportStatus}`),
      platformRequest<{ users: Person[] }>("/moderation/users?status=suspended"),
    ]);
    return { reportData, userData };
  }, [reportStatus]);

  const loadData = useCallback(async () => {
    const { reportData, userData } = await fetchData();
    setReports(reportData);
    setSuspendedUsers(userData.users);
  }, [fetchData]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== "staff") return;

    let active = true;
    fetchData()
      .then(({ reportData, userData }) => {
        if (active) {
          setReports(reportData);
          setSuspendedUsers(userData.users);
        }
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load moderation data.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [authLoading, fetchData, user]);

  async function updateReport(
    type: "comments" | "videos" | "accounts",
    reportId: string,
    status: "reviewed" | "dismissed",
    hideContent?: boolean,
  ) {
    setBusyId(reportId);
    setError("");
    setNotice("");
    try {
      const result = await platformRequest<{ message: string }>(
        `/moderation/reports/${type}/${reportId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status, ...(hideContent === undefined ? {} : { hideContent }) }),
        },
      );
      setNotice(result.message);
      await loadData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update the report.");
    } finally {
      setBusyId("");
    }
  }

  async function suspendAccount(report: AccountReport) {
    const account = report.reportedUser;
    if (!account) return;
    setBusyId(account._id);
    setError("");
    setNotice("");
    try {
      const result = await platformRequest<{ message: string }>(
        `/moderation/users/${account._id}/suspend`,
        {
          method: "POST",
          body: JSON.stringify({ reason: `Staff review: ${report.reason}`.slice(0, 500) }),
        },
      );
      setNotice(result.message);
      await loadData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not suspend this account.");
    } finally {
      setBusyId("");
    }
  }

  async function restoreAccount(accountId: string) {
    setBusyId(accountId);
    setError("");
    setNotice("");
    try {
      const result = await platformRequest<{ message: string }>(
        `/moderation/users/${accountId}/restore`,
        { method: "POST" },
      );
      setNotice(result.message);
      await loadData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not restore this account.");
    } finally {
      setBusyId("");
    }
  }

  if (authLoading || (user?.role === "staff" && loading)) {
    return <p role="status" className="rounded-xl bg-white p-5 text-sm text-slate-500">Loading staff dashboard…</p>;
  }
  if (!user || user.role !== "staff") {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
        <h2 className="font-semibold text-slate-800">Staff access required</h2>
        <p className="mt-2 text-sm text-slate-500">This area is restricted to authorized MyTube staff.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">Review content and account reports. Removing a YouTube video hides it on MyTube; it does not remove it from YouTube.</p>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          Reports
          <select
            value={reportStatus}
            onChange={(event) => {
              setLoading(true);
              setReportStatus(event.target.value);
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2"
          >
            <option value="open">Open</option>
            <option value="reviewed">Reviewed</option>
            <option value="dismissed">Dismissed</option>
            <option value="all">All</option>
          </select>
        </label>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900">Reported videos</h2>
        {reports.videoReports.length === 0 ? <p className="text-sm text-slate-500">No matching video reports.</p> : reports.videoReports.map((report) => (
          <article key={report._id} className="space-y-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-slate-900">{report.title || report.videoId}</h3>
                <p className="text-xs text-slate-500">{report.provider} · {report.videoId} · {report.status}</p>
                <p className="mt-2 text-sm text-slate-700">{report.reason}</p>
                <p className="mt-1 text-xs text-slate-500">Reported by {report.reporter?.name || report.reporter?.email || "Unknown"} · {new Date(report.createdAt).toLocaleString()}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {report.status === "reviewed" && <button type="button" disabled={busyId === report._id} onClick={() => void updateReport("videos", report._id, "reviewed", false)} className="rounded-full border px-3 py-1.5 text-sm">Restore video</button>}
                <button type="button" disabled={busyId === report._id} onClick={() => void updateReport("videos", report._id, "reviewed", true)} className="rounded-full bg-red-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50">Hide video</button>
                <button type="button" disabled={busyId === report._id} onClick={() => void updateReport("videos", report._id, "dismissed")} className="rounded-full border px-3 py-1.5 text-sm">Dismiss</button>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900">Reported comments</h2>
        {reports.commentReports.length === 0 ? <p className="text-sm text-slate-500">No matching comment reports.</p> : reports.commentReports.map((report) => (
          <article key={report._id} className="space-y-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5">
            <p className="whitespace-pre-wrap break-words text-sm text-slate-800">{report.comment?.content || "[Comment was deleted]"}</p>
            <p className="text-xs text-slate-500">Status: {report.status} · Video: {report.comment?.videoId || "Unavailable"} · Reported by {report.reporter?.name || report.reporter?.email || "Unknown"}</p>
            <p className="text-sm text-slate-700">Reason: {report.reason}</p>
            <div className="flex flex-wrap gap-2">
              {report.status === "reviewed" && <button type="button" disabled={busyId === report._id} onClick={() => void updateReport("comments", report._id, "reviewed", false)} className="rounded-full border px-3 py-1.5 text-sm">Restore comment</button>}
              <button type="button" disabled={busyId === report._id} onClick={() => void updateReport("comments", report._id, "reviewed", true)} className="rounded-full bg-red-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50">Hide comment</button>
              <button type="button" disabled={busyId === report._id} onClick={() => void updateReport("comments", report._id, "dismissed")} className="rounded-full border px-3 py-1.5 text-sm">Dismiss</button>
            </div>
          </article>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900">Reported accounts</h2>
        {reports.accountReports.length === 0 ? <p className="text-sm text-slate-500">No matching account reports.</p> : reports.accountReports.map((report) => (
          <article key={report._id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5">
            <div>
              <h3 className="font-semibold text-slate-900">{report.reportedUser?.name || "Unknown user"}</h3>
              <p className="text-xs text-slate-500">{report.reportedUser?.email || report.reportedUser?._id || "Account unavailable"} · {report.status}</p>
              <p className="mt-2 text-sm text-slate-700">Reason: {report.reason}</p>
              <p className="mt-1 text-xs text-slate-500">Reported by {report.reporter?.name || report.reporter?.email || "Unknown"}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {report.reportedUser?.accountStatus !== "suspended" && report.reportedUser && <button type="button" disabled={busyId === report.reportedUser._id} onClick={() => void suspendAccount(report)} className="rounded-full bg-red-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50">Suspend account</button>}
              <button type="button" disabled={busyId === report._id} onClick={() => void updateReport("accounts", report._id, "reviewed")} className="rounded-full border px-3 py-1.5 text-sm">Mark reviewed</button>
              <button type="button" disabled={busyId === report._id} onClick={() => void updateReport("accounts", report._id, "dismissed")} className="rounded-full border px-3 py-1.5 text-sm">Dismiss</button>
            </div>
          </article>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900">Suspended accounts</h2>
        {suspendedUsers.length === 0 ? <p className="text-sm text-slate-500">No suspended accounts.</p> : suspendedUsers.map((account) => (
          <article key={account._id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5">
            <div>
              <h3 className="font-semibold text-slate-900">{account.name || "MyTube user"}</h3>
              <p className="text-sm text-slate-600">{account.email}</p>
            </div>
            <button type="button" disabled={busyId === account._id} onClick={() => void restoreAccount(account._id)} className="rounded-full bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50">Restore account</button>
          </article>
        ))}
      </section>
    </div>
  );
}
