import Header from '@/components/ui/Header';
import Sidebar from '@/components/ui/Sidebar';
import ChannelContent from '@/components/ui/ChannelContent';

export default async function ChannelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="min-h-screen bg-[#f8f9fc] text-slate-900">
      <Header />
      <div className="mx-auto flex max-w-[1900px]">
        <Sidebar />
        <main className="min-w-0 flex-1 px-4 py-6 md:px-7 md:py-8">
          <ChannelContent channelId={id} />
        </main>
      </div>
    </div>
  );
}
