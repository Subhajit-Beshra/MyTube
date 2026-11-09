"use client";

import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useParticipants,
  VideoConference,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { platformRequest } from "@/lib/platform-api";
import { useAuth } from "@/lib/AuthContext";

type MeetingInfo = {
  roomId: string;
  title: string;
  mode: "one-to-one" | "group";
  locked: boolean;
  startedAt: string;
  isHost: boolean;
};

type JoinResponse = {
  token: string;
  serverUrl: string;
  meeting: MeetingInfo;
};

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
}

function LiveMeetingControls({
  meeting,
  onLockChange,
  onEnd,
}: {
  meeting: MeetingInfo;
  onLockChange: (locked: boolean) => Promise<void>;
  onEnd: () => Promise<void>;
}) {
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();

  const [raisedHand, setRaisedHand] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  async function setHandRaised() {
    const next = !raisedHand;

    try {
      await localParticipant.setAttributes({
        raisedHand: next ? "true" : "",
      });

      setRaisedHand(next);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not update raised hand."
      );
    }
  }

  async function removeParticipant(identity: string) {
    setBusy(identity);
    setError("");

    try {
      await platformRequest(
        `/meetings/${meeting.roomId}/remove`,
        {
          method: "POST",
          body: JSON.stringify({ identity }),
        }
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not remove participant."
      );
    } finally {
      setBusy("");
    }
  }

  async function toggleParticipantMute(
    identity: string,
    trackSid: string,
    muted: boolean
  ) {
    setBusy(identity);
    setError("");

    try {
      await platformRequest(
        `/meetings/${meeting.roomId}/mute`,
        {
          method: "POST",
          body: JSON.stringify({
            identity,
            trackSid,
            muted,
          }),
        }
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not update participant audio."
      );
    } finally {
      setBusy("");
    }
  }

  async function changeLock(locked: boolean) {
    setError("");

    try {
      await onLockChange(locked);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not update meeting lock."
      );
    }
  }

  return (
    <div className="space-y-3 rounded-xl bg-slate-900 p-3 text-white">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void setHandRaised()}
          className="rounded-lg bg-slate-700 px-3 py-2 text-sm hover:bg-slate-600"
        >
          {raisedHand ? "Lower hand" : "Raise hand"}
        </button>

        {meeting.isHost && (
          <>
            <button
              type="button"
              disabled={busy !== ""}
              onClick={() => void changeLock(!meeting.locked)}
              className="rounded-lg bg-slate-700 px-3 py-2 text-sm hover:bg-slate-600 disabled:opacity-50"
            >
              {meeting.locked ? "Unlock meeting" : "Lock meeting"}
            </button>

            <button
              type="button"
              disabled={busy !== ""}
              onClick={() => void onEnd()}
              className="rounded-lg bg-red-700 px-3 py-2 text-sm hover:bg-red-600 disabled:opacity-50"
            >
              End meeting
            </button>
          </>
        )}
      </div>

      <ul className="flex flex-wrap gap-2 text-xs">
        {participants.map((participant) => (
          <li
            key={participant.identity}
            className="rounded-full bg-slate-800 px-3 py-1.5"
          >
            <span
              aria-label={
                participant.isSpeaking ? "Speaking" : "Not speaking"
              }
              className={`mr-2 inline-block size-2 rounded-full ${
                participant.isSpeaking
                  ? "bg-emerald-400"
                  : "bg-slate-500"
              }`}
            />

            {participant.name || participant.identity}

            {participant.attributes?.raisedHand === "true" && (
              <span className="ml-1" title="Raised hand">
                ✋
              </span>
            )}

            {meeting.isHost &&
              participant.identity !== localParticipant.identity &&
              (() => {
                const audio = participant
                  .getTrackPublications()
                  .find(
                    (publication) =>
                      publication.kind === Track.Kind.Audio
                  );

                const trackSid = audio?.trackSid;

                return (
                  <span className="ml-2 inline-flex gap-2">
                    {trackSid && (
                      <button
                        type="button"
                        disabled={busy !== ""}
                        onClick={() =>
                          void toggleParticipantMute(
                            participant.identity,
                            trackSid,
                            !audio.isMuted
                          )
                        }
                        className="underline disabled:opacity-50"
                      >
                        {audio.isMuted ? "Unmute" : "Mute"}
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={busy !== ""}
                      onClick={() =>
                        void removeParticipant(participant.identity)
                      }
                      className="text-red-300 underline disabled:opacity-50"
                    >
                      {busy === participant.identity
                        ? "Working…"
                        : "Remove"}
                    </button>
                  </span>
                );
              })()}
          </li>
        ))}
      </ul>

      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}

export default function MeetingRoom() {
  const params = useParams<{ roomId: string }>();
  const roomId = params.roomId;
  const router = useRouter();

  const { user, loading: authLoading } = useAuth();

  const [joinData, setJoinData] = useState<JoinResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connectedAt, setConnectedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [meeting, setMeeting] = useState<MeetingInfo | null>(null);
  const [copied, setCopied] = useState(false);

  const connectionEstablished = useRef(false);
  const leaving = useRef(false);

  // Get the meeting token after authentication.
  useEffect(() => {
    if (authLoading) return;

    // Do not leave the loading screen running if the user is not logged in.
    if (!user) {
      setLoading(false);
      return;
    }

    let active = true;

    setLoading(true);
    setError("");
    setJoinData(null);
    setMeeting(null);

    platformRequest<JoinResponse>(
      `/meetings/${encodeURIComponent(roomId)}/token`,
      {
        method: "POST",
      }
    )
      .then((result) => {
        if (!active) return;

        setJoinData(result);
        setMeeting(result.meeting);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not join meeting."
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [authLoading, roomId, user]);

  // Meeting duration.
  useEffect(() => {
    if (connectedAt === null) return;

    const updateDuration = () => {
      setElapsedSeconds(
        Math.floor((Date.now() - connectedAt) / 1000)
      );
    };

    updateDuration();

    const intervalId = window.setInterval(
      updateDuration,
      1000
    );

    return () => window.clearInterval(intervalId);
  }, [connectedAt]);

  // Lock or unlock the meeting.
  const updateLock = useCallback(
    async (locked: boolean) => {
      const result = await platformRequest<{ locked: boolean }>(
        `/meetings/${roomId}/lock`,
        {
          method: "PATCH",
          body: JSON.stringify({ locked }),
        }
      );

      setMeeting((current) =>
        current
          ? { ...current, locked: result.locked }
          : current
      );
    },
    [roomId]
  );

  // End meeting.
  async function endMeeting() {
    try {
      await platformRequest(
        `/meetings/${roomId}/end`,
        {
          method: "POST",
        }
      );

      leaving.current = true;
      router.push("/meetings");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not end meeting."
      );
    }
  }

  // Leave meeting.
  function leaveMeeting() {
    leaving.current = true;
    router.push("/meetings");
  }

  // Copy meeting invitation link.
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(
        window.location.href
      );

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not copy the meeting link."
      );
    }
  }

  // Authentication or meeting loading.
  if (authLoading || loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 text-white">
        <p role="status">Joining meeting…</p>
      </main>
    );
  }

  // User must sign in before joining.
  if (!user) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 p-6 text-white">
        <div>
          <p>Sign in to join this meeting.</p>

          <Link
            href="/login"
            className="mt-3 inline-block underline"
          >
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  // Meeting error.
  if (error || !joinData || !meeting) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 p-6 text-white">
        <div className="max-w-lg rounded-2xl bg-slate-900 p-6">
          <h1 className="text-xl font-bold">
            Unable to join meeting
          </h1>

          <p
            role="alert"
            className="mt-2 text-sm text-slate-300"
          >
            {error || "Meeting data is unavailable."}
          </p>

          <Link
            href="/meetings"
            className="mt-4 inline-block text-sm font-semibold text-indigo-300 underline"
          >
            Back to meetings
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-3 text-white sm:p-5">
      <div className="mx-auto max-w-[1800px] space-y-3">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-bold">
              {meeting.title}
            </h1>

            <p className="text-xs text-slate-400">
              {meeting.mode === "one-to-one"
                ? "One-to-one"
                : "Group"}{" "}
              · {formatDuration(elapsedSeconds)} ·{" "}
              {connectedAt === null
                ? "Connecting…"
                : "Connected"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void copyLink()}
              className="rounded-lg bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700"
            >
              {copied ? "Copied" : "Copy invite link"}
            </button>

            <button
              type="button"
              onClick={leaveMeeting}
              className="rounded-lg bg-red-700 px-3 py-2 text-sm hover:bg-red-600"
            >
              Leave
            </button>
          </div>
        </header>

        <LiveKitRoom
          token={joinData.token}
          serverUrl={joinData.serverUrl}
          connect
          audio
          video
          onConnected={() => {
            connectionEstablished.current = true;
            setConnectedAt(Date.now());
            setError("");
          }}
          onError={(cause) => {
            setError(cause.message);
          }}
          onDisconnected={() => {
            setConnectedAt(null);

            if (
              connectionEstablished.current &&
              !leaving.current
            ) {
              setError(
                "The LiveKit connection ended unexpectedly. Return to meetings and try joining again."
              );
            }
          }}
          data-lk-theme="default"
          className="overflow-hidden rounded-xl"
        >
          <div className="min-h-[65vh]">
            <VideoConference />
          </div>

          <RoomAudioRenderer />

          <LiveMeetingControls
            meeting={meeting}
            onLockChange={updateLock}
            onEnd={endMeeting}
          />
        </LiveKitRoom>
      </div>
    </main>
  );
}
