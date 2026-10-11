import VideoCard from '@/components/ui/VideoCard';

const allVideos = [
  {
    _id: '1',
    videotitle: "Teacher's Day Celebration",
    filename: 'Video.mp4',
    filetype: 'video/mp4',
    filepath: '/Video/Video.mp4',
    filesize: '13.5 MB',
    videochannel: 'La Familia',
    like: '1250',
    dislike: '121',
    views: '45000',
    uploader: 'Sick Boy',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    _id: '2',
    videotitle: 'Creating an AI Powered Healthcare App',
    filename: 'VitaCare.mp4',
    filetype: 'video/mp4',
    filepath: '/Video/VitaCare.mp4',
    filesize: '34.8 MB',
    videochannel: "Developer's Development",
    like: '1.2 M',
    dislike: '200',
    views: '4.6 M',
    uploader: 'Hacker',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    _id: '3',
    videotitle: 'Modern UI Design Tips for Product Teams',
    filename: 'UI.mp4',
    filetype: 'video/mp4',
    filepath: '/Video/Video.mp4',
    filesize: '11.4 MB',
    videochannel: 'Pixel Studio',
    like: '22K',
    dislike: '430',
    views: '98K',
    uploader: 'Pixel Studio',
    createdAt: new Date(Date.now() - 259200000).toISOString(),
  },
  {
    _id: '4',
    videotitle: 'Building a Startup Dashboard in a Weekend',
    filename: 'Dashboard.mp4',
    filetype: 'video/mp4',
    filepath: '/Video/VitaCare.mp4',
    filesize: '18.7 MB',
    videochannel: 'Startup Weekly',
    like: '64K',
    dislike: '880',
    views: '230K',
    uploader: 'Startup Weekly',
    createdAt: new Date(Date.now() - 345600000).toISOString(),
  },
];

export default function SearchResults({ query }: { query: string }) {
  const normalizedQuery = query.trim().toLowerCase();

  const results =
    normalizedQuery.length === 0
      ? allVideos
      : allVideos.filter((video) => {
          const haystack = `${video.videotitle} ${video.videochannel} ${video.uploader}`.toLowerCase();
          return haystack.includes(normalizedQuery);
        });

  if (results.length === 0) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 text-center">
        <h2 className="text-xl font-semibold">No results found</h2>
        <p className="mt-2 text-sm text-gray-600">Try a different keyword or browse popular videos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600">
        About {results.length} results for <span className="font-medium text-gray-900">“{query}”</span>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {results.map((video) => (
          <VideoCard key={video._id} video={video} />
        ))}
      </div>
    </div>
  );
}
