"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ExternalLink, Play, Search, X } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

const channel = {
  name: "Subhajit Beshra",
  handle: "@subhajitbeshra",
  avatar: "/LUFFY.jpg",
  subscribers: "128K subscribers",
  videoCount: "42 videos",
  description:
    "Building products, learning through shipping, and sharing practical design and development workflows.",
  aboutUrl: "https://www.youtube.com/@subhajitbeshra",
};

const videos = [
  {
    id: "1",
    title: "Teacher's Day Celebration",
    views: "125K views",
    uploaded: "1 day ago",
    viewCount: 125_000,
    age: 1,
    duration: "12:45",
    file: "/Video/Video.mp4",
  },
  {
    id: "2",
    title: "Creating an AI-Powered Healthcare App",
    views: "4.6M views",
    uploaded: "2 days ago",
    viewCount: 4_600_000,
    age: 2,
    duration: "18:22",
    file: "/Video/VitaCare.mp4",
  },
  {
    id: "3",
    title: "Modern UI Design Tips for Product Teams",
    views: "98K views",
    uploaded: "3 days ago",
    viewCount: 98_000,
    age: 3,
    duration: "09:10",
    file: "/Video/Video.mp4",
  },
  {
    id: "4",
    title: "Building a Startup Dashboard in a Weekend",
    views: "230K views",
    uploaded: "4 days ago",
    viewCount: 230_000,
    age: 4,
    duration: "21:08",
    file: "/Video/VitaCare.mp4",
  },
];

type ChannelTab = "Home" | "Videos" | "About";
type VideoSort = "recent" | "popular" | "oldest";

function VideoTile({ video }: { video: (typeof videos)[number] }) {
  return (
    <article className="group min-w-0">
      <Link
        href={`/watch/${video.id}`}
        aria-label={`Watch ${video.title}`}
        className="relative block aspect-video overflow-hidden rounded-xl bg-slate-200"
      >
        <video
          src={video.file}
          className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          muted
          preload="metadata"
          playsInline
        />
        <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white">
          {video.duration}
        </span>
        <span className="absolute inset-0 grid place-items-center bg-black/0 transition group-hover:bg-black/15">
          <span className="grid size-11 scale-90 place-items-center rounded-full bg-black/70 text-white opacity-0 transition group-hover:scale-100 group-hover:opacity-100">
            <Play className="ml-0.5 size-5 fill-current" />
          </span>
        </span>
      </Link>
      <Link href={`/watch/${video.id}`} className="mt-3 block">
        <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-slate-900 group-hover:text-indigo-700">
          {video.title}
        </h3>
        <p className="mt-1 text-xs text-slate-600">
          {video.views} <span aria-hidden="true">·</span> {video.uploaded}
        </p>
      </Link>
    </article>
  );
}

export default function ChannelContent({ channelId }: { channelId: string }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ChannelTab>("Home");
  const [sort, setSort] = useState<VideoSort>("recent");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const profile = user?.id === channelId
    ? {
        ...channel,
        name: user.channelname || user.name || channel.name,
        description: user.description || channel.description,
        avatar: user.image || channel.avatar,
      }
    : channel;
  const sortedVideos = [...videos].sort((a, b) => {
    if (sort === "popular") return b.viewCount - a.viewCount;
    return sort === "oldest" ? b.age - a.age : a.age - b.age;
  });
  const filteredVideos = sortedVideos.filter((video) =>
    video.title.toLowerCase().includes(query.trim().toLowerCase()),
  );

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
            src={profile.avatar}
            alt={`${profile.name} channel`}
            width={160}
            height={160}
            priority
            className="size-24 shrink-0 rounded-full object-cover sm:size-32"
          />

          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {profile.name}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              <span className="font-medium text-slate-900">{profile.handle}</span>
              <span className="px-1.5">·</span>
              {profile.subscribers}
              <span className="px-1.5">·</span>
              {profile.videoCount}
            </p>
            <p className="mt-2 line-clamp-2 max-w-2xl text-sm text-slate-600">
              {profile.description}
            </p>
          </div>

          <a
            href={profile.aboutUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 self-start rounded-full bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 sm:self-center"
          >
            Subscribe
            <ExternalLink className="size-3.5" />
          </a>
        </div>
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
        {searchOpen && (
          <input
            autoFocus
            aria-label="Search channel videos"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search videos"
            className="my-2 ml-auto w-40 rounded-full border border-slate-300 bg-transparent px-3 py-2 text-sm text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          />
        )}
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
      </nav>

      <div className="pt-6">
        {activeTab === "About" ? (
          <section className="max-w-3xl py-2">
            <h2 className="text-lg font-semibold text-slate-900">Description</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">
              {profile.description}
            </p>
            <a
              href={profile.aboutUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-indigo-700 hover:underline"
            >
              Visit YouTube channel <ExternalLink className="size-3.5" />
            </a>
          </section>
        ) : (
          <section aria-label={activeTab === "Home" ? "Recent uploads" : "Channel videos"}>
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">
                {activeTab === "Home" ? "Videos" : "Latest"}
              </h2>
              <label className="sr-only" htmlFor="channel-sort">Sort videos</label>
              <select
                id="channel-sort"
                value={sort}
                onChange={(event) => setSort(event.target.value as VideoSort)}
                className="rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <option value="recent">Recently uploaded</option>
                <option value="popular">Popular</option>
                <option value="oldest">Oldest</option>
              </select>
            </div>
            <div className="grid grid-cols-1 gap-x-4 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredVideos.map((video) => <VideoTile key={video.id} video={video} />)}
            </div>
            {filteredVideos.length === 0 && (
              <p role="status" className="py-12 text-center text-sm text-slate-600">
                No videos match “{query}”.
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
