"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { platformRequest } from "@/lib/platform-api";

type CreatedMeeting = {
  meeting: {
    roomId: string;
    title: string;
    mode: "one-to-one" | "group";
    url: string;
  };
};

export default function MeetingsContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<"one-to-one" | "group">("group");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function createMeeting(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    setError("");
    setBusy(true);
    try {
      const { meeting } = await platformRequest<CreatedMeeting>("/meetings", {
        method: "POST",
        body: JSON.stringify({ title, mode }),
      });
      router.push(meeting.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create meeting.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p role="status" className="rounded-xl bg-white p-5 text-sm text-slate-500">Checking your account…</p>;
  if (!user) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
        <h2 className="font-semibold">Sign in to create or join a meeting</h2>
        <p className="mt-2 text-sm text-slate-500">Each participant needs an account.</p>
        <Link href="/login" className="mt-4 inline-flex rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Sign in</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-5">
      {error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <form onSubmit={(event) => void createMeeting(event)} className="space-y-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-900/5">
        <label className="block space-y-2 text-sm font-semibold text-slate-800">
          Meeting name
          <input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={120} className="h-11 w-full rounded-lg border border-slate-300 px-3 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="Team catch-up" />
        </label>
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold text-slate-800">Call type</legend>
          <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 text-sm">
            <input type="radio" name="mode" value="one-to-one" checked={mode === "one-to-one"} onChange={() => setMode("one-to-one")} className="mt-1 accent-indigo-600" />
            <span><strong>One-to-one</strong><span className="block text-slate-500">Private room limited to two participants.</span></span>
          </label>
          <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 text-sm">
            <input type="radio" name="mode" value="group" checked={mode === "group"} onChange={() => setMode("group")} className="mt-1 accent-indigo-600" />
            <span><strong>Group meeting</strong><span className="block text-slate-500">Invite people with a unique link (up to 100 participants).</span></span>
          </label>
        </fieldset>
        <button type="submit" disabled={busy || !title.trim()} className="rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
          {busy ? "Creating…" : "Create meeting"}
        </button>
      </form>
      <p className="text-sm text-slate-500">Video calls require server-side LiveKit API credentials. Microphone and camera access will be requested by your browser when you join.</p>
    </div>
  );
}
