import VideoCard from '@/components/ui/VideoCard';
import type { Video } from '@/lib/videos';

export default function SearchResults({
  query,
  results,
  liveSearch,
  searchError,
}: {
  query: string;
  results: Video[];
  liveSearch: boolean;
  searchError?: string;
}) {
  if (results.length === 0) {
    return (
      <div className="space-y-5">
        {searchError && <SearchNotice message={searchError} error />}
        {!liveSearch && query && !searchError && (
          <SearchNotice message="Add a YouTube Data API key to search YouTube. Showing local videos instead." />
        )}
        <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-center">
          <h2 className="text-xl font-bold text-slate-800">No results found</h2>
          <p className="mt-2 text-sm text-slate-500">Try a different keyword or browse popular videos.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {searchError && <SearchNotice message={searchError} error />}
      {!liveSearch && query && !searchError && (
        <SearchNotice message="Add a YouTube Data API key to search YouTube. Showing local videos instead." />
      )}
      <div className="text-sm text-slate-500">{liveSearch ? "YouTube results" : "MyTube videos"} · {results.length} for <span className="font-semibold text-slate-800">“{query}”</span></div>
      <div className="grid grid-cols-1 gap-x-5 gap-y-9 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {results.map((video) => (
          <VideoCard key={video._id} video={video} />
        ))}
      </div>
    </div>
  );
}

function SearchNotice({ message, error = false }: { message: string; error?: boolean }) {
  return (
    <p
      role={error ? "alert" : "status"}
      className={`rounded-xl border px-4 py-3 text-sm ${
        error
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-indigo-100 bg-indigo-50 text-indigo-800"
      }`}
    >
      {message}
    </p>
  );
}
