import { Suspense } from 'react';
import Header from '@/components/ui/Header';
import Sidebar from '@/components/ui/Sidebar';
import WatchLaterContent from '@/components/ui/WatchLaterContent';

export default function WatchLaterPage() {
  return (
    <div className="min-h-screen p-1">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="min-w-0 flex-1 p-4 md:p-6">
          <div className="mb-6">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-gray-500">Library</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Watch later</h1>
          </div>
          <Suspense fallback={<div>Loading watch later videos...</div>}>
            <WatchLaterContent />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
