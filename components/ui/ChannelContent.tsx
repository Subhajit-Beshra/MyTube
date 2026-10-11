'use client';

import Link from 'next/link';
import { Bell, Check, Play, UserPlus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const channelData = {
  '1': {
    id: '1',
    name: 'Subhajit Beshra',
    handle: '@subhajitbeshra',
    banner: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 50%, #ec4899 100%)',
    avatar: '/LUFFY.jpg',
    subscribers: '128K',
    videos: 42,
    bio: 'Building products, learning through shipping, and sharing practical design and development workflows.',
    links: ['portfolio.dev', 'youtube.com/@subhajitbeshra'],
  },
};

const videos = [
  {
    _id: '1',
    videotitle: "Teacher's Day Celebration",
    videochannel: 'Subhajit Beshra',
    views: '125K',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    duration: '12:45',
  },
  {
    _id: '2',
    videotitle: 'Creating an AI Powered Healthcare App',
    videochannel: 'Subhajit Beshra',
    views: '4.6M',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    duration: '18:22',
  },
  {
    _id: '3',
    videotitle: 'Modern UI Design Tips for Product Teams',
    videochannel: 'Subhajit Beshra',
    views: '98K',
    createdAt: new Date(Date.now() - 259200000).toISOString(),
    duration: '09:10',
  },
  {
    _id: '4',
    videotitle: 'Building a Startup Dashboard in a Weekend',
    videochannel: 'Subhajit Beshra',
    views: '230K',
    createdAt: new Date(Date.now() - 345600000).toISOString(),
    duration: '21:08',
  },
];

export default function ChannelContent({ channelId }: { channelId: string }) {
  const channel = channelData[channelId as keyof typeof channelData] ?? channelData['1'];

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="h-40 md:h-52" style={{ background: channel.banner }} />

        <div className="p-4 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 border-4 border-white shadow-md md:h-24 md:w-24">
                <AvatarImage src={channel.avatar} alt={channel.name} />
                <AvatarFallback>{channel.name.charAt(0)}</AvatarFallback>
              </Avatar>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{channel.name}</h1>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                    <Check className="mr-1 inline h-3.5 w-3.5" />
                    Verified
                  </span>
                </div>
                <p className="text-sm text-gray-600">{channel.handle}</p>
                <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-600">
                  <span>{channel.subscribers} subscribers</span>
                  <span>{channel.videos} videos</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 rounded-full border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50">
                <Bell className="h-4 w-4" />
                Notify me
              </button>
              <button className="flex items-center gap-2 rounded-full bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
                <UserPlus className="h-4 w-4" />
                Subscribe
              </button>
            </div>
          </div>

          <p className="mt-5 max-w-2xl text-sm text-gray-700">{channel.bio}</p>

          <div className="mt-3 flex flex-wrap gap-3 text-sm text-blue-600">
            {channel.links.map((link) => (
              <span key={link} className="rounded-full bg-blue-50 px-2.5 py-1.5 font-medium">
                {link}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex gap-2 text-sm font-medium">
            <button className="rounded-full bg-black px-3 py-1.5 text-white">Home</button>
            <button className="rounded-full bg-gray-100 px-3 py-1.5 text-gray-700">Videos</button>
            <button className="rounded-full bg-gray-100 px-3 py-1.5 text-gray-700">Shorts</button>
            <button className="rounded-full bg-gray-100 px-3 py-1.5 text-gray-700">About</button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {videos.map((video) => (
            <Link key={video._id} href={`/watch/${video._id}`} className="group block overflow-hidden rounded-xl border bg-gray-50 transition hover:shadow-sm">
              <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-sky-200 via-indigo-200 to-violet-300">
                <div className="absolute inset-0 bg-black/10" />
                <div className="absolute inset-0 flex items-center justify-center text-white opacity-0 transition group-hover:opacity-100">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60">
                    <Play className="ml-0.5 h-4 w-4 fill-current" />
                  </div>
                </div>
                <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  {video.duration}
                </span>
              </div>

              <div className="space-y-2 p-3">
                <h3 className="line-clamp-2 text-sm font-medium text-gray-900 group-hover:text-blue-600">
                  {video.videotitle}
                </h3>
                <p className="text-xs text-gray-600">{video.views} views</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
