"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoaderCircle, Plus, X } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { platformRequest } from "@/lib/platform-api";

type ChannelDialogProps = {
  trigger?: ReactNode;
};

export default function ChannelDialog({ trigger }: ChannelDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [channelname, setChannelname] = useState("");
  const { user, refreshUser } = useAuth();
  const router = useRouter();

  function openDialog() {
    setChannelname(user?.name?.trim() || user?.email.split("@")[0] || "");
    setError("");
    setOpen(true);
  }

  function closeDialog() {
    if (!saving) setOpen(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) {
      router.push("/login");
      return;
    }

    const name = channelname.trim();
    if (!name) {
      setError("Enter a channel name.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await platformRequest("/channels", {
        method: "POST",
        body: JSON.stringify({ channelname: name, description: "" }),
      });
      await refreshUser();
      setOpen(false);
      router.push(`/channel/${encodeURIComponent(user.id)}`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create your channel.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {trigger ? (
        <div onClick={openDialog}>{trigger}</div>
      ) : (
        <Button
          type="button"
          size="sm"
          className="gap-1.5 rounded-full bg-indigo-600 text-white hover:bg-indigo-700"
          onClick={openDialog}
        >
          <Plus className="size-4" />
          Create
        </Button>
      )}

      {open && createPortal(
        <div
          className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/45 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDialog();
          }}
        >
          <form
            onSubmit={(event) => void handleSubmit(event)}
            className="my-auto w-full max-w-lg rounded-2xl border bg-white p-5 shadow-2xl sm:p-6"
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
                  Creator
                </p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                  Create your channel
                </h2>
              </div>
              <button
                type="button"
                onClick={closeDialog}
                disabled={saving}
                aria-label="Close dialog"
                className="grid size-9 place-items-center rounded-full hover:bg-slate-100"
              >
                <X className="size-4" />
              </button>
            </div>

            <label htmlFor="channel-name" className="mb-1.5 block text-sm font-medium text-slate-700">
              Channel name
            </label>
            <Input
              id="channel-name"
              value={channelname}
              onChange={(event) => setChannelname(event.target.value)}
              placeholder="Your username"
              maxLength={100}
              required
              disabled={!user || saving}
              className="h-11"
            />
            <p className="mt-2 text-sm text-slate-500">
              We filled this with your username. You can change it before confirming.
            </p>

            {error && (
              <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeDialog} disabled={saving}>
                Cancel
              </Button>
              {!user ? (
                <Button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  Sign in to create
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={saving || !channelname.trim()}
                  className="bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  {saving && <LoaderCircle className="mr-2 size-4 animate-spin" />}
                  {saving ? "Creating…" : "Confirm"}
                </Button>
              )}
            </div>
          </form>
        </div>,
        document.body,
      )}
    </>
  );
}
