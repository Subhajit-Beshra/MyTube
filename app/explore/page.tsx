import Header from "@/components/ui/Header";
import Sidebar from "@/components/ui/Sidebar";
import Videogrid from "@/components/ui/Videogrid";
import type { Video } from "@/lib/videos";
import { getPopularYouTubeVideos, isYouTubeConfigured } from "@/lib/youtube";
import { filterAvailableVideos } from "@/lib/video-moderation";

export default async function ExplorePage() {
  let videos: Video[] = [];
  let error: string | undefined;

  if (!isYouTubeConfigured()) {
    error = "YouTube is not configured. Add YOUTUBE_API_KEY to .env.local to explore videos.";
  } else {
    try {
      const available = await filterAvailableVideos(await getPopularYouTubeVideos());
      videos = available.videos;
      error = available.warning;
    } catch (cause) {
      error = cause instanceof Error ? cause.message : "Could not load YouTube videos.";
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f6fa] text-slate-900">
      <Header />
      <div className="mx-auto flex max-w-[1800px]">
        <Sidebar />
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Find your next favorite</p>
          <h1 className="mb-6 mt-1 text-2xl font-extrabold sm:text-3xl">Explore YouTube</h1>
          <Videogrid videos={videos} error={error} />
        </main>
      </div>
    </div>
  );
}
