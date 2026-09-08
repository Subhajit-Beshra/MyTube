// import Image from "next/image";

import Header from "@/components/ui/Header";
import CategoryTabs from "@/components/ui/CategoryTabs";
import Sidebar from "@/components/ui/Sidebar";
import { Suspense } from "react";
import Videogrid from "@/components/ui/Videogrid";

export default function Home() {
  return (
    <div className="min-h-screen p-1">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="min-w-0 flex-1 p-4">
          <CategoryTabs />
          <Suspense fallback={<div>Loading videos.....</div>}>
            <Videogrid />
          </Suspense>
        </main>
       </div>
    </div>
  );
}
