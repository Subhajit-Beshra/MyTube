'use client'

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, ThumbsUp, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface LikedVideo {
  _id: string;
  videotitle: string;
  videochannel: string;
  views: number | string;
  createdAt: string;
  duration: string;
}

const likedVideosSeed: LikedVideo[] = [
  {
    _id: 'liked-1',
    videotitle: 'Teacher\'s Day Celebration',
    videochannel: 'La Familia',
    views: 1250,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    duration: '12:45',
  },
  {
    _id: 'liked-2',
    videotitle: 'Creating an AI Powered Healthcare App',
    videochannel: "Developer's Development",
    views: '4.6 M',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    duration: '18:22',
  },
  {
    _id: 'liked-3',
    videotitle: 'Modern UI Design Tips for Product Teams',
    videochannel: 'Pixel Studio',
    views: 9800,
    createdAt: new Date(Date.now() - 604800000).toISOString(),
    duration: '09:10',
  },
];

export default function LikedContent() {
  const [videos, setVideos] = useState<LikedVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVideos(likedVideosSeed);
      setLoading(false);
    }, 200);

    return () => clearTimeout(timer);
  }, []);

  const handleRemove = (videoId: string) => {
    setVideos((current) => current.filter((video) => video._id !== videoId));
  };

  if (loading) {
    return <div className="py-8 text-sm text-gray-600">Loading liked videos...</div>;
  }

  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <ThumbsUp className="mb-4 h-16 w-16 text-gray-400" />
        <h2 className="mb-2 text-xl font-semibold">No liked videos yet</h2>
        <p className="text-gray-600">Videos you like will appear here.</p>
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
            <Link href={`/watch/${video._id.replace('liked-', '')}`} className="flex-shrink-0">
              <div className="relative h-24 w-40 overflow-hidden rounded-xl bg-gradient-to-br from-red-400 via-orange-300 to-yellow-200 shadow-sm">
                <div className="absolute inset-0 bg-black/10" />
                <div className="absolute bottom-2 right-2 rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  {video.duration}
                </div>
              </div>
            </Link>

            <div className="min-w-0 flex-1">
              <Link href={`/watch/${video._id.replace('liked-', '')}`}>
                <h3 className="mb-1 text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-blue-600">
                  {video.videotitle}
                </h3>
              </Link>
              <p className="text-sm text-gray-600">{video.videochannel}</p>
              <p className="text-sm text-gray-600">
                {typeof video.views === 'number' ? video.views.toLocaleString() : video.views} views •{' '}
                {formatDistanceToNow(new Date(video.createdAt))} ago
              </p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-md opacity-0 transition-opacity group-hover:opacity-100 hover:bg-gray-100">
                <MoreVertical className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleRemove(video._id)}>
                  <X className="mr-2 h-4 w-4" />
                  Remove from liked videos
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>
    </div>
  );
}
