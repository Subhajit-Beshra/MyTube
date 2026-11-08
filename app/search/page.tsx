import Header from '@/components/ui/Header';
import SearchResults from '@/components/ui/SearchResults';
import Sidebar from '@/components/ui/Sidebar';
import { videos } from '@/lib/videos';
import { isYouTubeConfigured, searchYouTubeVideos } from '@/lib/youtube';
import { filterAvailableVideos } from '@/lib/video-moderation';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = '' } = await searchParams;
  const configured = isYouTubeConfigured();
  let results = videos.filter((video) => {
    const normalizedQuery = q.trim().toLowerCase();
    return (
      !normalizedQuery ||
      `${video.videotitle} ${video.videochannel} ${video.uploader} ${video.category}`.toLowerCase().includes(normalizedQuery)
    );
  });
  let liveSearch = false;
  let searchError: string | undefined;

  if (configured && q.trim()) {
    try {
      results = await searchYouTubeVideos(q.trim());
      liveSearch = true;
    } catch (error) {
      searchError = error instanceof Error ? error.message : 'YouTube search failed.';
    }
  }

  const available = await filterAvailableVideos(results);
  results = available.videos;
  if (available.warning) searchError = searchError || available.warning;

  return (
    <div className="min-h-screen bg-[#f5f6fa] text-slate-900">
      <Header />
      <div className="mx-auto flex max-w-[1800px]">
        <Sidebar />
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Search</p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
              {q ? `Results for “${q}”` : 'Popular videos'}
            </h1>
          </div>
          <SearchResults query={q} results={results} liveSearch={liveSearch} searchError={searchError} />
        </main>
      </div>
    </div>
  );
}
