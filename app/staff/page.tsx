import Header from "@/components/ui/Header";
import Sidebar from "@/components/ui/Sidebar";
import StaffDashboard from "@/components/ui/StaffDashboard";

export default function StaffPage() {
  return (
    <div className="min-h-screen bg-[#f5f6fa] text-slate-900">
      <Header />
      <div className="mx-auto flex max-w-[1800px]">
        <Sidebar />
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Staff tools</p>
          <h1 className="mb-6 mt-1 text-2xl font-extrabold sm:text-3xl">Moderation dashboard</h1>
          <StaffDashboard />
        </main>
      </div>
    </div>
  );
}
