"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { CalendarDays, Clapperboard, LoaderCircle, Search, Upload, X } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { getApiUrl, platformRequest } from "@/lib/platform-api";
import ChannelDialog from "@/components/ui/ChannelDialog";

type ChannelVideo = {
  id: string;
  title: string;
  description: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
};

type ChannelDetails = {
  channel: {
    id: string;
    name: string;
    description: string;
    image: string;
    createdAt: string;
  };
  videos: ChannelVideo[];
};

type ChannelTab = "Home" | "Videos" | "About";
type VideoSort = "newest" | "oldest";

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function UploadDialog({
  channelId,
  onClose,
  onUploaded,
}: {
  channelId: string;
  onClose: () => void;
  onUploaded: (video: ChannelVideo) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError("Choose a video to upload.");
      return;
    }

    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("description", description.trim());
    formData.append("video", file);

    setUploading(true);
    setError("");
    try {
      const result = await platformRequest<{ video: ChannelVideo }>(
        `/channels/${encodeURIComponent(channelId)}/videos`,
        { method: "POST", body: formData },
      );
      onUploaded(result.video);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The video could not be uploaded.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !uploading) onClose();
      }}
    >
      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl sm:p-7"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Creator studio</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">Upload a video</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            aria-label="Close upload dialog"
            className="grid size-9 place-items-center rounded-full text-slate-500 hover:bg-slate-100"
          >
            <X className="size-4" />
          </button>
        </div>

        <label className="block text-sm font-medium text-slate-700" htmlFor="channel-video-file">
          Video file
        </label>
        <input
          id="channel-video-file"
          type="file"
          accept="video/mp4,video/x-m4v,video/quicktime,video/ogg,video/webm,.mp4,.m4v,.mov,.ogv,.webm"
          required
          disabled={uploading}
          onChange={(event) => {
            const selected = event.target.files?.[0] ?? null;
            setFile(selected);
            if (selected && !title.trim()) {
              setTitle(selected.name.replace(/\.[^.]+$/, ""));
            }
          }}
          className="mt-2 block w-full rounded-xl border border-slate-300 p-3 text-sm text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-indigo-700"
        />
        <p className="mt-1.5 text-xs text-slate-500">
          MP4, M4V, MOV, OGV, or WebM · up to 500 MiB
        </p>

        <label htmlFor="channel-video-title" className="mb-1.5 mt-5 block text-sm font-medium text-slate-700">
          Title
        </label>
        <input
          id="channel-video-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          maxLength={150}
          disabled={uploading}
          className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />

        <label htmlFor="channel-video-description" className="mb-1.5 mt-4 block text-sm font-medium text-slate-700">
          Description
        </label>
        <textarea
          id="channel-video-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={5000}
          disabled={uploading}
          rows={3}
          className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />

        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={uploading || !file || !title.trim()}
            className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? <LoaderCircle className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {uploading ? "Uploading…" : "Upload"}
          </button>
        </div>
      </form>
    </div>
  );
}

function VideoCard({ video }: { video: ChannelVideo }) {
  return (
    <article className="group min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <video
        controls
        preload="metadata"
        playsInline
        src={`${getApiUrl()}${video.filePath}`}
        aria-label={video.title}
        className="aspect-video w-full bg-black object-contain"
      />
      <div className="p-3.5">
        <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-slate-900">
          {video.title}
        </h3>
        {video.description && (
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">
            {video.description}
          </p>
        )}
        <p className="mt-2 text-xs text-slate-500">
          {new Date(video.createdAt).toLocaleDateString()} · {formatFileSize(video.fileSize)}
        </p>
      </div>
    </article>
  );
}

export default function ChannelContent({ channelId }: { channelId: string }) {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<ChannelTab>("Home");
  const [sort, setSort] = useState<VideoSort>("newest");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [details, setDetails] = useState<ChannelDetails | null>(null);
  const [loadedChannelId, setLoadedChannelId] = useState("");
  const [loadError, setLoadError] = useState("");
  const [errorChannelId, setErrorChannelId] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [subscriptionState, setSubscriptionState] = useState<{
    key: string;
    subscribed: boolean;
  } | null>(null);
  const [subscriptionSaving, setSubscriptionSaving] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState("");
  const isOwner = user?.id === channelId;
  const hasChannel = Boolean(user?.hasChannel || user?.channelname);
  const subscriptionKey = `${user?.id ?? ""}:${channelId}`;
  const isSubscribed =
    subscriptionState?.key === subscriptionKey && subscriptionState.subscribed;
  const loading = loadedChannelId !== channelId;
  const error = errorChannelId === channelId ? loadError : "";

  const fetchChannel = useCallback(
    () => platformRequest<ChannelDetails>(`/channels/${encodeURIComponent(channelId)}`),
    [channelId],
  );

  useEffect(() => {
    if (authLoading || (isOwner && !hasChannel)) return;
    let active = true;
    fetchChannel()
      .then((result) => {
        if (active) {
          setDetails(result);
          setLoadError("");
          setErrorChannelId("");
        }
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setLoadError(cause instanceof Error ? cause.message : "Could not load this channel.");
        setErrorChannelId(channelId);
      })
      .finally(() => {
        if (active) setLoadedChannelId(channelId);
      });
    return () => {
      active = false;
    };
  }, [authLoading, channelId, fetchChannel, hasChannel, isOwner]);

  useEffect(() => {
    if (authLoading || !user || isOwner || (isOwner && !hasChannel)) return;
    let active = true;
    platformRequest<{ subscribed: boolean }>(
      `/channels/${encodeURIComponent(channelId)}/subscription`,
    )
      .then((result) => {
        if (active) {
          setSubscriptionState({ key: `${user.id}:${channelId}`, subscribed: result.subscribed });
          setSubscriptionError("");
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setSubscriptionError(
            cause instanceof Error ? cause.message : "Could not load subscription status.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [authLoading, channelId, hasChannel, isOwner, user]);

  async function toggleSubscription() {
    if (!user || isOwner) return;
    setSubscriptionSaving(true);
    setSubscriptionError("");
    try {
      const result = await platformRequest<{ subscribed: boolean }>(
        `/channels/${encodeURIComponent(channelId)}/subscribe`,
        { method: isSubscribed ? "DELETE" : "POST" },
      );
      setSubscriptionState({ key: subscriptionKey, subscribed: result.subscribed });
    } catch (cause) {
      setSubscriptionError(
        cause instanceof Error ? cause.message : "Could not update your subscription.",
      );
    } finally {
      setSubscriptionSaving(false);
    }
  }

  const filteredVideos = useMemo(() => {
    const matching = (details?.videos ?? []).filter((video) =>
      video.title.toLowerCase().includes(query.trim().toLowerCase()),
    );
    return matching.sort((a, b) => {
      const dateOrder = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sort === "newest" ? -dateOrder : dateOrder;
    });
  }, [details?.videos, query, sort]);

  if (authLoading) {
    return <p role="status" className="py-24 text-center text-sm text-slate-500">Loading channel…</p>;
  }

  if (isOwner && !hasChannel) {
    return (
      <section className="mx-auto mt-12 max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
          <Clapperboard className="size-7" />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-slate-900">Create your channel first</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Your channel page will be available after you create and confirm your channel name.
        </p>
        <div className="mt-6">
          <ChannelDialog />
        </div>
      </section>
    );
  }

  if (loading) {
    return <p role="status" className="py-24 text-center text-sm text-slate-500">Loading channel…</p>;
  }

  if (error || !details) {
    async function retryChannel() {
      setLoadedChannelId("");
      setLoadError("");
      setErrorChannelId("");
      try {
        setDetails(await fetchChannel());
      } catch (cause) {
        setLoadError(cause instanceof Error ? cause.message : "Could not load this channel.");
        setErrorChannelId(channelId);
      } finally {
        setLoadedChannelId(channelId);
      }
    }

    return (
      <div role="alert" className="mx-auto mt-12 max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <h1 className="text-xl font-bold text-slate-900">Channel unavailable</h1>
        <p className="mt-2 text-sm text-slate-600">{error || "This channel does not exist."}</p>
        <button
          type="button"
          onClick={() => void retryChannel()}
          className="mt-5 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Try again
        </button>
      </div>
    );
  }

  const { channel, videos } = details;
  const handle = `@${channel.name.toLowerCase().replace(/[^a-z0-9]+/g, "")}`;

  return (
    <div className="mx-auto w-full max-w-[1280px] pb-12" data-channel-id={channelId}>
      <header>
        <div className="relative h-28 overflow-hidden rounded-xl bg-gradient-to-r from-[#182044] via-[#5141a5] to-[#ba6b92] sm:h-40 md:h-48">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_78%_10%,rgba(255,255,255,0.3),transparent_35%)]" />
          <div className="absolute -right-10 -top-32 size-72 rounded-full border border-white/15 sm:size-96" />
          <div className="absolute -right-2 -top-24 size-56 rounded-full border border-white/10 sm:size-72" />
        </div>

        <div className="flex flex-col gap-5 px-1 pb-5 pt-4 sm:flex-row sm:items-center sm:gap-6 sm:px-5 sm:pb-6 sm:pt-6">
          <Image
            src={channel.image || "/LUFFY.jpg"}
            alt={`${channel.name} channel`}
            width={160}
            height={160}
            priority
            className="size-24 shrink-0 rounded-full object-cover sm:size-32"
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{channel.name}</h1>
            <p className="mt-1 text-sm text-slate-600">
              <span className="font-medium text-slate-900">{handle}</span>
              <span className="px-1.5" aria-hidden="true">·</span>
              {videos.length} {videos.length === 1 ? "video" : "videos"}
              {channel.createdAt && (
                <>
                  <span className="px-1.5" aria-hidden="true">·</span>
                  Joined {new Date(channel.createdAt).toLocaleDateString()}
                </>
              )}
            </p>
            {channel.description && (
              <p className="mt-2 line-clamp-2 max-w-2xl text-sm text-slate-600">
                {channel.description}
              </p>
            )}
          </div>
          {isOwner && (
            <button
              type="button"
              onClick={() => setUploadOpen(true)}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 self-start rounded-full bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 sm:self-center"
            >
              <Upload className="size-4" />
              Upload video
            </button>
          )}
          {!isOwner && user && (
            <button
              type="button"
              onClick={() => void toggleSubscription()}
              disabled={subscriptionSaving || subscriptionState?.key !== subscriptionKey}
              className={`inline-flex h-10 shrink-0 items-center justify-center self-start rounded-full px-5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:self-center ${
                isSubscribed
                  ? "bg-slate-200 text-slate-800 hover:bg-slate-300"
                  : "bg-slate-900 text-white hover:bg-slate-700"
              }`}
            >
              {subscriptionSaving
                ? "Saving…"
                : isSubscribed
                  ? "Subscribed"
                  : "Subscribe"}
            </button>
          )}
          {!isOwner && !user && (
            <Link
              href="/login"
              className="inline-flex h-10 shrink-0 items-center justify-center self-start rounded-full bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-700 sm:self-center"
            >
              Sign in to subscribe
            </Link>
          )}
        </div>
        {subscriptionError && (
          <p role="alert" className="px-1 pb-4 text-sm text-red-700 sm:px-5">
            {subscriptionError}
          </p>
        )}
      </header>

      <nav
        aria-label="Channel sections"
        role="tablist"
        className="sticky top-16 z-20 -mx-4 flex border-b border-slate-200 bg-[#f8f9fc]/95 px-4 backdrop-blur sm:mx-0 sm:px-5 dark:bg-slate-950/95"
      >
        {(["Home", "Videos", "About"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className={`relative min-w-20 px-4 py-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 ${
              activeTab === tab
                ? "text-slate-900 after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-slate-900 dark:after:bg-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {tab}
          </button>
        ))}
        {activeTab !== "About" && searchOpen && (
          <input
            autoFocus
            aria-label="Search channel videos"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search videos"
            className="my-2 ml-auto w-40 rounded-full border border-slate-300 bg-transparent px-3 py-2 text-sm text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          />
        )}
        {activeTab !== "About" && (
          <button
            type="button"
            aria-label={searchOpen ? "Close channel search" : "Search channel videos"}
            aria-expanded={searchOpen}
            onClick={() => {
              setSearchOpen((open) => !open);
              setQuery("");
            }}
            className={`${searchOpen ? "" : "ml-auto"} grid size-10 shrink-0 place-items-center rounded-full text-slate-600 transition hover:bg-slate-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500`}
          >
            {searchOpen ? <X className="size-4" /> : <Search className="size-4" />}
          </button>
        )}
      </nav>

      <div className="pt-6">
        {activeTab === "About" ? (
          <section aria-label="About this channel" className="max-w-3xl rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900">About</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
              {channel.description || "This channel has not added a description yet."}
            </p>
            {channel.createdAt && (
              <p className="mt-5 flex items-center gap-2 text-sm text-slate-500">
                <CalendarDays className="size-4" />
                Joined {new Date(channel.createdAt).toLocaleDateString()}
              </p>
            )}
          </section>
        ) : (
          <section aria-label={activeTab === "Home" ? "Recent uploads" : "Channel videos"}>
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">
                {activeTab === "Home" ? "Videos" : "Uploads"}
              </h2>
              <label className="sr-only" htmlFor="channel-sort">Sort videos</label>
              <select
                id="channel-sort"
                value={sort}
                onChange={(event) => setSort(event.target.value as VideoSort)}
                className="rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <option value="newest">Recently uploaded</option>
                <option value="oldest">Oldest</option>
              </select>
            </div>
            {filteredVideos.length ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredVideos.map((video) => <VideoCard key={video.id} video={video} />)}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center">
                <Clapperboard className="mx-auto size-9 text-slate-400" />
                <p className="mt-3 text-sm font-semibold text-slate-800">
                  {query ? `No videos match “${query}”.` : "No videos uploaded yet."}
                </p>
                {isOwner && !query && (
                  <p className="mt-1 text-sm text-slate-500">
                    Upload your first video to share it on your channel.
                  </p>
                )}
              </div>
            )}
          </section>
        )}
      </div>

      {uploadOpen && (
        <UploadDialog
          channelId={channelId}
          onClose={() => setUploadOpen(false)}
          onUploaded={(video) => {
            setDetails((current) =>
              current ? { ...current, videos: [video, ...current.videos] } : current,
            );
            setActiveTab("Videos");
          }}
        />
      )}
    </div>
  );
}
