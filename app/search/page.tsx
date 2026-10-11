import Header from '@/components/ui/Header';
import SearchResults from '@/components/ui/SearchResults';
import Sidebar from '@/components/ui/Sidebar';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = '' } = await searchParams;

  return (
    <div className="min-h-screen p-1">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="min-w-0 flex-1 p-4 md:p-6">
          <div className="mb-6">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-gray-500">Search</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              {q ? `Results for “${q}”` : 'Popular videos'}
            </h1>
          </div>
          <SearchResults query={q} />
        </main>
      </div>
    </div>
  );
}
