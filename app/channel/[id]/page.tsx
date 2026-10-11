import Header from '@/components/ui/Header';
import Sidebar from '@/components/ui/Sidebar';
import ChannelContent from '@/components/ui/ChannelContent';

export default async function ChannelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="min-h-screen p-1">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="min-w-0 flex-1 p-4 md:p-6">
          <ChannelContent channelId={id} />
        </main>
      </div>
    </div>
  );
}
