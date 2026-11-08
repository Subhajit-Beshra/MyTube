"use client";

import { useEffect, useState } from "react";
import { ExternalLink, PlaySquare, UserRoundMinus } from "lucide-react";
import { changeEvent, readSubscriptions, writeSubscriptions, type Subscription } from "@/lib/local-library";

export default function SubscriptionsContent() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  useEffect(() => {
    const update = () => setSubscriptions(readSubscriptions());
    update();
    window.addEventListener(changeEvent, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(changeEvent, update);
      window.removeEventListener("storage", update);
    };
  }, []);

  const unsubscribe = (id: string) => {
    const updated = subscriptions.filter((channel) => channel.id !== id);
    writeSubscriptions(updated);
    setSubscriptions(updated);
  };

  if (!subscriptions.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
        <PlaySquare className="mx-auto mb-4 size-10 text-slate-400" />
        <h2 className="font-semibold text-slate-800">No subscriptions yet</h2>
        <p className="mt-2 text-sm text-slate-500">Subscribe to a channel from a video to save it here on this device.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">Saved in this browser. Sign-in with YouTube is not connected.</p>
      {subscriptions.map((channel) => (
        <div key={channel.id} className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700">
            {channel.name.slice(0, 1).toUpperCase()}
          </div>
          <p className="min-w-0 flex-1 truncate font-semibold text-slate-800">{channel.name}</p>
          {channel.id.length === 24 && (
            <a href={`https://www.youtube.com/channel/${channel.id}`} target="_blank" rel="noreferrer" aria-label={`Open ${channel.name} on YouTube`} className="rounded-full p-2 text-slate-500 hover:bg-slate-100">
              <ExternalLink className="size-4" />
            </a>
          )}
          <button type="button" onClick={() => unsubscribe(channel.id)} className="flex items-center gap-2 rounded-full px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">
            <UserRoundMinus className="size-4" /> Unsubscribe
          </button>
        </div>
      ))}
    </div>
  );
}
