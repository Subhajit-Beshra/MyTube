"use client";

import { useState } from "react";
import CategoryTabs from "./CategoryTabs";
import VideoCard from "./VideoCard";
import type { Video } from "@/lib/videos";

const Videogrid = ({ videos, error }: { videos: Video[]; error?: string }) => {
  const [activeCategory, setActiveCategory] = useState("All");
  const categories = ["All", ...new Set(videos.map((video) => video.category))];
  const filteredVideos = videos.filter(
    (video) => activeCategory === "All" || video.category === activeCategory,
  );

  return (
    <>
      {error && (
        <p role="alert" className="mb-5 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </p>
      )}
      <CategoryTabs categories={categories} activeCategory={activeCategory} onCategoryChange={setActiveCategory} />
      <section aria-label={`${activeCategory} videos`} className="grid grid-cols-1 gap-x-5 gap-y-9 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {filteredVideos.map((video) => <VideoCard key={video._id} video={video} />)}
      </section>
      {!error && filteredVideos.length === 0 && (
        <p className="py-16 text-center text-sm text-slate-500">No popular videos are available right now.</p>
      )}
    </>
  );
};

export default Videogrid;
