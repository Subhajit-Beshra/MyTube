"use client";

import { useEffect } from "react";
import type { Video } from "@/lib/videos";
import { readLibrary, writeLibrary } from "@/lib/local-library";

export default function WatchTracker({ video }: { video: Video }) {
  useEffect(() => {
    const history = readLibrary("history").filter((item) => item._id !== video._id);
    writeLibrary("history", [{ ...video, watchedAt: new Date().toISOString() }, ...history].slice(0, 100));
  }, [video]);

  return null;
}
