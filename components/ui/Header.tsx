
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ChannelDialog from "@/components/ui/ChannelDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/AuthContext";
import { Compass, Menu, PlaySquare, Search, Video } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ThemeSwitcher from "@/components/ui/ThemeSwitcher";
import NotificationsBell from "@/components/ui/NotificationsBell";

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    try {
      await logout();
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }

  const displayName = user?.name || user?.channelname || "MyTube User";
  const avatarFallback = displayName.charAt(0).toUpperCase();
  const hasChannel = Boolean(user?.hasChannel || user?.channelname);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-[1800px] flex-wrap items-center justify-between gap-x-5 gap-y-2 px-3 py-2 sm:px-5 lg:px-7">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Open navigation menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex size-10 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 lg:hidden"
          >
            <Menu className="size-5" />
          </button>

          <Link href="/" aria-label="MyTube home" className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded bg-indigo-600 text-white shadow-sm shadow-indigo-200">
              <Video className="size-5" strokeWidth={2.5} />
            </span>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              My<span className="text-red-500">Tube</span>
            </span>
          </Link>
        </div>

        <form
          action="/search"
          className="order-3 flex w-full items-center sm:order-none sm:mx-auto sm:max-w-xl sm:flex-1"
        >
          <label htmlFor="site-search" className="sr-only">
            Search videos
          </label>
          <input
            id="site-search"
            type="search"
            name="q"
            placeholder="Search videos, channels, and more"
            className="h-10 min-w-0 flex-1 rounded-l-full border border-slate-300 bg-slate-50 px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
          />
          <button
            type="submit"
            aria-label="Search"
            className="flex h-10 w-12 items-center justify-center rounded-r-full border border-l-0 border-slate-300 bg-slate-100 text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-700"
          >
            <Search className="size-4" />
          </button>
        </form>

        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeSwitcher />
          {hasChannel && user ? (
            <Link
              href={`/channel/${encodeURIComponent(user.id)}`}
              className="rounded-full bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
            >
              My channel
            </Link>
          ) : (
            <ChannelDialog
              trigger={
                <button
                  type="button"
                  aria-label="Create a channel"
                  className="flex h-9 items-center gap-2 rounded-full bg-indigo-50 px-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
                >
                  <Video className="size-4" />
                  <span className="hidden sm:inline">Create</span>
                </button>
              }
            />
          )}

          <NotificationsBell />

          {loading ? (
            <div className="size-9 animate-pulse rounded-full bg-slate-200" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Open account menu"
                className="rounded-full outline-none ring-indigo-300 focus-visible:ring-2"
              >
                <Avatar className="size-9">
                  <AvatarImage src={user.image || ""} alt={displayName} />
                  <AvatarFallback className="bg-indigo-100 font-semibold text-indigo-700">
                    {avatarFallback}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-52">
                <div className="px-3 py-2">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {displayName}
                  </p>
                  <p className="truncate text-xs text-slate-500">{user.email}</p>
                </div>

                <DropdownMenuSeparator />

                {hasChannel && (
                  <DropdownMenuItem onClick={() => router.push(`/channel/${user.id}`)}>
                    My channel
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => router.push("/history")}>
                  History
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/liked")}>
                  Liked videos
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/watch-later")}>
                  Watch later
                </DropdownMenuItem>
                {user.role === "staff" && (
                  <DropdownMenuItem onClick={() => router.push("/staff")}>
                    Moderation dashboard
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={() => void handleLogout()}
                  className="cursor-pointer text-red-600 focus:text-red-600"
                >
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>

      {menuOpen && (
        <nav className="border-t border-slate-100 bg-white px-4 py-3 lg:hidden">
          <div className="flex flex-wrap gap-2">
            <Link onClick={() => setMenuOpen(false)} href="/" className="rounded-full bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700">
              Home
            </Link>
            <Link onClick={() => setMenuOpen(false)} href="/explore" className="rounded-full px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">
              <Compass className="mr-1 inline size-4" />Explore
            </Link>
            <Link onClick={() => setMenuOpen(false)} href="/subscriptions" className="rounded-full px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">
              <PlaySquare className="mr-1 inline size-4" />Subscriptions
            </Link>
            <Link onClick={() => setMenuOpen(false)} href="/history" className="rounded-full px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">
              History
            </Link>
            <Link onClick={() => setMenuOpen(false)} href="/liked" className="rounded-full px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">
              Liked videos
            </Link>
            <Link onClick={() => setMenuOpen(false)} href="/watch-later" className="rounded-full px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">
              Watch later
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
};

export default Header;