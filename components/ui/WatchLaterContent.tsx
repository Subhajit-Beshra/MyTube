'use client'

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Clock3, MoreVertical, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface WatchLaterVideo {
  _id: string;
  videotitle: string;
  videochannel: string;
  views: number | string;
  createdAt: string;
  duration: string;
  savedForLaterAt: string;
}

const watchLaterSeed: WatchLaterVideo[] = [
  {
    _id: 'later-1',
    videotitle: 'How to Build a Better Product Roadmap',
    videochannel: 'Product Lab',
    views: 8700,
    createdAt: new Date(Date.now() - 43200000).toISOString(),
    duration: '06:48',
    savedForLaterAt: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    _id: 'later-2',
    videotitle: 'The Future of AI in Everyday Workflows',
    videochannel: 'Future Stack',
    views: '2.1 M',
    createdAt: new Date(Date.now() - 345600000).toISOString(),
    duration: '14:03',
    savedForLaterAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    _id: 'later-3',
    videotitle: 'Designing Faster and Cleaner User Flows',
    videochannel: 'UX Weekly',
    views: 15400,
    createdAt: new Date(Date.now() - 604800000).toISOString(),
    duration: '11:25',
    savedForLaterAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

export default function WatchLaterContent() {
  const [videos, setVideos] = useState<WatchLaterVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVideos(watchLaterSeed);
      setLoading(false);
    }, 200);

    return () => clearTimeout(timer);
  }, []);

  const handleRemove = (videoId: string) => {
    setVideos((current) => current.filter((video) => video._id !== videoId));
  };

  if (loading) {
    return <div className="py-8 text-sm text-gray-600">Loading watch later list...</div>;
  }

  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Clock3 className="mb-4 h-16 w-16 text-gray-400" />
        <h2 className="mb-2 text-xl font-semibold">No videos saved for later</h2>
        <p className="text-gray-600">Videos you save will show up here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">{videos.length} videos</p>
      </div>

      <div className="space-y-4">
        {videos.map((video) => (
          <div key={video._id} className="group flex gap-4">
            <Link href={`/watch/${video._id.replace('later-', '')}`} className="flex-shrink-0">
              <div className="relative h-24 w-40 overflow-hidden rounded-xl bg-gradient-to-br from-sky-400 via-cyan-300 to-blue-200 shadow-sm">
                <div className="absolute inset-0 bg-black/10" />
                <div className="absolute bottom-2 right-2 rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  {video.duration}
                </div>
              </div>
            </Link>

            <div className="min-w-0 flex-1">
              <Link href={`/watch/${video._id.replace('later-', '')}`}>
                <h3 className="mb-1 text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-blue-600">
                  {video.videotitle}
                </h3>
              </Link>
              <p className="text-sm text-gray-600">{video.videochannel}</p>
              <p className="text-sm text-gray-600">
                {typeof video.views === 'number' ? video.views.toLocaleString() : video.views} views • saved{' '}
                {formatDistanceToNow(new Date(video.savedForLaterAt))} ago
              </p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-md opacity-0 transition-opacity group-hover:opacity-100 hover:bg-gray-100">
                <MoreVertical className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleRemove(video._id)}>
                  <X className="mr-2 h-4 w-4" />
                  Remove from watch later
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>
    </div>
  );
}
