import { Clock, Compass, Download, History, Home, PlaySquare, Shield, ThumbsUp, User, Video } from "lucide-react";
import Link from "next/link";

const Sidebar = () => {
  return (
    <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-56 shrink-0 overflow-y-auto border-r border-slate-200/80 bg-[#f8f9fc] px-3 py-5 lg:block">
      <nav className="space-y-1">
        <Link href="/" className="flex items-center gap-3 rounded-xl bg-indigo-100 px-3 py-2.5 text-sm font-semibold text-indigo-800">
          <Home className="size-[18px]" /> Home
        </Link>
        <Link href="/explore" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-slate-900">
          <Compass className="size-[18px]" /> Explore
        </Link>
        <Link href="/subscriptions" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-slate-900">
          <PlaySquare className="size-[18px]" /> Subscriptions
        </Link>
        <Link href="/plans" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-slate-900">
          <PlaySquare className="size-[18px]" /> Membership plans
        </Link>
        <Link href="/downloads" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-slate-900">
          <Download className="size-[18px]" /> Downloads
        </Link>
        <Link href="/security" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-slate-900">
          <Shield className="size-[18px]" /> Security
        </Link>
        <Link href="/meetings" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-slate-900">
          <Video className="size-[18px]" /> Meetings
        </Link>
        <div className="my-4 border-t border-slate-200" />
        <p className="px-3 pb-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Your library</p>
        <Link href="/history" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-slate-900">
          <History className="size-[18px]" /> History
        </Link>
        <Link href="/liked" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-slate-900">
          <ThumbsUp className="size-[18px]" /> Liked videos
        </Link>
        <Link href="/watch-later" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-slate-900">
          <Clock className="size-[18px]" /> Watch later
        </Link>
        <Link href="/channel/1" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-slate-900">
          <User className="size-[18px]" /> Your channel
        </Link>
      </nav>
    </aside>
  );
};

export default Sidebar;