import type { Video } from "@/lib/videos";

export type LibraryKey = "history" | "liked" | "watch-later";
export type Subscription = { id: string; name: string };

const changeEvent = "mytube-library-change";
const subscriptionKey = "mytube-subscriptions";

export function readLibrary(key: LibraryKey): Video[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(`mytube-${key}`) ?? "[]");
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is Video => Boolean(item && typeof item._id === "string"));
  } catch {
    return [];
  }
}

export function writeLibrary(key: LibraryKey, videos: Video[]) {
  localStorage.setItem(`mytube-${key}`, JSON.stringify(videos));
  window.dispatchEvent(new Event(changeEvent));
}

export function readSubscriptions(): Subscription[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(subscriptionKey) ?? "[]");
    if (!Array.isArray(value)) return [];
    return value.filter(
      (item): item is Subscription =>
        Boolean(item && typeof item.id === "string" && typeof item.name === "string"),
    );
  } catch {
    return [];
  }
}

export function writeSubscriptions(subscriptions: Subscription[]) {
  localStorage.setItem(subscriptionKey, JSON.stringify(subscriptions));
  window.dispatchEvent(new Event(changeEvent));
}

export { changeEvent, subscriptionKey };
