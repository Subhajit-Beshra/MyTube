"use client";

import { Clock, Compass, Download, History, Home, PlaySquare, Shield, ThumbsUp, User, Video } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";

const Sidebar = () => {
  const { user } = useAuth();
  const pathname = usePathname();
  const linkClass = (href: string) => {
    const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
    return `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
      active
        ? "bg-indigo-100 font-semibold text-indigo-800"
        : "font-medium text-slate-600 hover:bg-white hover:text-slate-900"
    }`;
  };

  return (
    <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-56 shrink-0 overflow-y-auto border-r border-slate-200/80 bg-[#f8f9fc] px-3 py-5 lg:block">
      <nav className="space-y-1">
        <Link href="/" aria-current={pathname === "/" ? "page" : undefined} className={linkClass("/")}>
          <Home className="size-[18px]" /> Home
        </Link>
        <Link href="/explore" aria-current={pathname.startsWith("/explore") ? "page" : undefined} className={linkClass("/explore")}>
          <Compass className="size-[18px]" /> Explore
        </Link>
        <Link href="/subscriptions" aria-current={pathname.startsWith("/subscriptions") ? "page" : undefined} className={linkClass("/subscriptions")}>
          <PlaySquare className="size-[18px]" /> Subscriptions
        </Link>
        <Link href="/plans" aria-current={pathname.startsWith("/plans") ? "page" : undefined} className={linkClass("/plans")}>
          <PlaySquare className="size-[18px]" /> Membership plans
        </Link>
        <Link href="/downloads" aria-current={pathname.startsWith("/downloads") ? "page" : undefined} className={linkClass("/downloads")}>
          <Download className="size-[18px]" /> Downloads
        </Link>
        <Link href="/security" aria-current={pathname.startsWith("/security") ? "page" : undefined} className={linkClass("/security")}>
          <Shield className="size-[18px]" /> Security
        </Link>
        <Link href="/meetings" aria-current={pathname.startsWith("/meetings") ? "page" : undefined} className={linkClass("/meetings")}>
          <Video className="size-[18px]" /> Meetings
        </Link>
        <div className="my-4 border-t border-slate-200" />
        <p className="px-3 pb-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Your library</p>
        <Link href="/history" aria-current={pathname.startsWith("/history") ? "page" : undefined} className={linkClass("/history")}>
          <History className="size-[18px]" /> History
        </Link>
        <Link href="/liked" aria-current={pathname.startsWith("/liked") ? "page" : undefined} className={linkClass("/liked")}>
          <ThumbsUp className="size-[18px]" /> Liked videos
        </Link>
        <Link href="/watch-later" aria-current={pathname.startsWith("/watch-later") ? "page" : undefined} className={linkClass("/watch-later")}>
          <Clock className="size-[18px]" /> Watch later
        </Link>
        <Link
          href={user ? `/channel/${encodeURIComponent(user.id)}` : "/login"}
          aria-current={pathname.startsWith("/channel/") ? "page" : undefined}
          className={linkClass("/channel")}
        >
          <User className="size-[18px]" /> My channel
        </Link>
      </nav>
    </aside>
  );
};

export default Sidebar;