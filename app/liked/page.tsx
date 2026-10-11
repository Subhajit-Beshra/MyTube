import { Suspense } from 'react';
import Header from '@/components/ui/Header';
import Sidebar from '@/components/ui/Sidebar';
import LikedContent from '@/components/ui/LikedContent';

export default function LikedPage() {
  return (
    <div className="min-h-screen p-1">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="min-w-0 flex-1 p-4 md:p-6">
          <div className="mb-6">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-gray-500">Library</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Liked videos</h1>
          </div>
          <Suspense fallback={<div>Loading liked videos...</div>}>
            <LikedContent />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
