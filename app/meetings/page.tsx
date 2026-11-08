import Header from "@/components/ui/Header";
import Sidebar from "@/components/ui/Sidebar";
import MeetingsContent from "@/components/ui/MeetingsContent";

export default function MeetingsPage() {
  return (
    <div className="min-h-screen bg-[#f5f6fa] text-slate-900">
      <Header />
      <div className="mx-auto flex max-w-[1800px]">
        <Sidebar />
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">LiveKit video</p>
          <h1 className="mb-2 mt-1 text-2xl font-extrabold sm:text-3xl">Meetings</h1>
          <p className="mb-6 text-sm text-slate-600">Start a one-to-one call or group meeting. Share the private link with signed-in participants.</p>
          <MeetingsContent />
        </main>
      </div>
    </div>
  );
}
