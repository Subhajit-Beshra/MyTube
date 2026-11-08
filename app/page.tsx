// import Image from "next/image";

import Header from "@/components/ui/Header";
import Sidebar from "@/components/ui/Sidebar";
import Videogrid from "@/components/ui/Videogrid";
import type { Video } from "@/lib/videos";
import { getPopularYouTubeVideos, isYouTubeConfigured } from "@/lib/youtube";
import { filterAvailableVideos } from "@/lib/video-moderation";

export default async function Home() {
  let videos: Video[] = [];
  let error: string | undefined;

  if (!isYouTubeConfigured()) {
    error = "YouTube is not configured yet. Add YOUTUBE_API_KEY to .env.local to load popular videos.";
  } else {
    try {
      const available = await filterAvailableVideos(await getPopularYouTubeVideos());
      videos = available.videos;
      error = available.warning;
    } catch (cause) {
      error = cause instanceof Error ? cause.message : "Could not load popular YouTube videos.";
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f6fa] text-slate-900">
      <Header />
      <div className="mx-auto flex max-w-[1800px]">
        <Sidebar />
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Videogrid videos={videos} error={error} />
        </main>
      </div>
    </div>
  );
}
