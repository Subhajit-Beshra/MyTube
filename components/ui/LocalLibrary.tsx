"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";
import Link from "next/link";
import { Clock, ThumbsUp, Trash2 } from "lucide-react";
import type { Video } from "@/lib/videos";
import { changeEvent, readLibrary, writeLibrary, type LibraryKey } from "@/lib/local-library";

const labels: Record<LibraryKey, { empty: string; icon: typeof Clock }> = {
  history: { empty: "Videos you watch will appear here.", icon: Clock },
  liked: { empty: "Videos you like will appear here.", icon: ThumbsUp },
  "watch-later": { empty: "Videos you save will appear here.", icon: Clock },
};

export default function LocalLibrary({ kind }: { kind: LibraryKey }) {
  const [videos, setVideos] = useState<Video[]>([]);
  const Icon = labels[kind].icon;

  useEffect(() => {
    const update = () => setVideos(readLibrary(kind));
    update();
    window.addEventListener(changeEvent, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(changeEvent, update);
      window.removeEventListener("storage", update);
    };
  }, [kind]);

  const remove = (id: string) => {
    const updated = videos.filter((video) => video._id !== id);
    writeLibrary(kind, updated);
    setVideos(updated);
  };

  if (!videos.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
        <Icon className="mx-auto mb-4 size-10 text-slate-400" />
        <h2 className="font-semibold text-slate-800">Nothing here yet</h2>
        <p className="mt-2 text-sm text-slate-500">{labels[kind].empty}</p>
        <Link href="/explore" className="mt-5 inline-flex rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Explore videos</Link>
      </div>
    );
  }

  return (
    <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {videos.map((video) => (
        <article key={video._id} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-900/5">
          <Link href={`/watch/${video._id}`} className="relative block aspect-video bg-slate-200">
            {video.thumbnailUrl ? (
              <Image src={video.thumbnailUrl} alt="" fill unoptimized sizes="(max-width: 640px) 100vw, 33vw" className="object-cover" />
            ) : (
              <video src={video.filepath} muted preload="metadata" className="size-full object-cover" />
            )}
          </Link>
          <div className="flex items-start gap-3 p-4">
            <Link href={`/watch/${video._id}`} className="min-w-0 flex-1">
              <h2 className="line-clamp-2 font-semibold text-slate-900 hover:text-indigo-700">{video.videotitle}</h2>
              <p className="mt-1 truncate text-sm text-slate-500">{video.videochannel}</p>
              <p className="mt-1 text-xs text-slate-500">
                {kind === "history"
                  ? `Watched ${formatDistanceToNow(new Date(video.watchedAt ?? video.createdAt), { addSuffix: true })}`
                  : `${video.views} views`}
              </p>
            </Link>
            <button
              type="button"
              aria-label={`Remove ${video.videotitle}`}
              onClick={() => remove(video._id)}
              className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}
