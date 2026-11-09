"use client";

import Link from "next/link";
import { Bell, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { platformRequest } from "@/lib/platform-api";

type ChannelNotification = {
  id: string;
  channelId: string;
  channelName: string;
  videoTitle: string;
  createdAt: string;
  read: boolean;
};

type NotificationsResponse = {
  unreadCount: number;
  notifications: ChannelNotification[];
};

export default function NotificationsBell() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<{
    userId: string;
    unreadCount: number;
    notifications: ChannelNotification[];
  } | null>(null);
  const [loadError, setLoadError] = useState<{ userId: string; message: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const unreadCount = data && user && data.userId === user.id ? data.unreadCount : 0;
  const notifications = data && user && data.userId === user.id ? data.notifications : [];
  const error =
    loadError && user && loadError.userId === user.id ? loadError.message : "";

  useEffect(() => {
    if (authLoading || !user) return;

    let active = true;
    const refresh = async () => {
      try {
        const result = await platformRequest<NotificationsResponse>("/notifications");
        if (active) {
          setData({ userId: user.id, ...result });
          setLoadError(null);
        }
      } catch (cause) {
        if (active) {
          setLoadError({
            userId: user.id,
            message: cause instanceof Error ? cause.message : "Could not load notifications.",
          });
        }
      }
    };
    void refresh();
    const intervalId = window.setInterval(() => void refresh(), 30_000);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      active = false;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [authLoading, user]);

  async function loadAndReadNotifications() {
    if (!user) return;
    setLoadingList(true);
    try {
      const result = await platformRequest<NotificationsResponse>("/notifications");
      setData({ userId: user.id, ...result });
      await platformRequest<{ markedRead: number }>("/notifications/read", {
        method: "POST",
      });
      setData({
        userId: user.id,
        unreadCount: 0,
        notifications: result.notifications.map((notification) => ({
          ...notification,
          read: true,
        })),
      });
      setLoadError(null);
    } catch (cause) {
      setLoadError({
        userId: user.id,
        message: cause instanceof Error ? cause.message : "Could not load notifications.",
      });
    } finally {
      setLoadingList(false);
    }
  }

  async function toggleNotifications() {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen && user) await loadAndReadNotifications();
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={
          unreadCount
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        aria-expanded={open}
        onClick={() => void toggleNotifications()}
        className="relative flex size-10 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100"
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-red-600 px-1 text-[10px] font-bold leading-none text-white"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <section
          aria-label="Notifications"
          className="absolute right-0 top-12 z-[60] w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="font-semibold text-slate-900">Notifications</h2>
            {unreadCount > 0 && (
              <span className="text-xs font-medium text-slate-500">
                {unreadCount} new
              </span>
            )}
          </div>
          {loadingList ? (
            <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-slate-500">
              <LoaderCircle className="size-4 animate-spin" />
              Loading notifications…
            </div>
          ) : !user ? (
            <p className="px-4 py-8 text-center text-sm text-slate-600">
              <Link href="/login" onClick={() => setOpen(false)} className="font-semibold text-indigo-700 hover:underline">
                Sign in
              </Link>{" "}
              to see channel upload notifications.
            </p>
          ) : error ? (
            <div className="px-4 py-8 text-center">
              <p role="alert" className="text-sm text-red-700">{error}</p>
              <button
                type="button"
                onClick={() => void loadAndReadNotifications()}
                className="mt-3 text-sm font-semibold text-indigo-700 hover:underline"
              >
                Try again
              </button>
            </div>
          ) : notifications.length ? (
            <ul className="max-h-[min(65vh,28rem)] overflow-y-auto">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <Link
                    href={`/channel/${encodeURIComponent(notification.channelId)}`}
                    onClick={() => setOpen(false)}
                    className={`block border-b border-slate-100 px-4 py-3 transition hover:bg-slate-50 ${
                      notification.read ? "" : "bg-indigo-50/60"
                    }`}
                  >
                    <p className="text-sm leading-5 text-slate-800">
                      <span className="font-semibold">{notification.channelName}</span>
                      {" uploaded "}
                      <span className="font-semibold">{notification.videoTitle}</span>
                    </p>
                    <time
                      dateTime={notification.createdAt}
                      className="mt-1 block text-xs text-slate-500"
                    >
                      {new Date(notification.createdAt).toLocaleString()}
                    </time>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-10 text-center text-sm text-slate-500">
              No channel upload notifications yet.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
