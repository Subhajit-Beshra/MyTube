import Header from '@/components/ui/Header';
import Sidebar from '@/components/ui/Sidebar';
import VideoPlayer from '@/components/ui/VideoPlayer';
import VideoInfo from '@/components/ui/VideoInfo';
import Comments from '@/components/ui/Comments';
import RelatedVideos from '@/components/ui/RelatedVideos';
import WatchTracker from '@/components/ui/WatchTracker';
import { videos } from '@/lib/videos';
import { getYouTubeVideo, isYouTubeConfigured, searchYouTubeVideos } from '@/lib/youtube';
import { checkVideoAvailability } from '@/lib/video-moderation';

const isYouTubeId = (id: string) => /^[\w-]{11}$/.test(id);

const WatchPage = async ({ params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const availability = await checkVideoAvailability(id);
    if (!availability.visible) {
        return (
            <div className="min-h-screen bg-[#f5f6fa]">
                <Header />
                <div className="mx-auto flex max-w-[1800px]">
                    <Sidebar />
                    <main className="min-w-0 flex-1 px-6 py-20 text-center">
                        <h1 className="text-xl font-bold text-slate-800">This video is unavailable</h1>
                        <p className="mt-2 text-sm text-slate-600">MyTube staff removed this video from the platform.</p>
                    </main>
                </div>
            </div>
        );
    }
    const localVideoIndex = videos.findIndex((item) => item._id === id);
    const localVideo = localVideoIndex >= 0 ? videos[localVideoIndex] : undefined;
    const nextVideo = localVideoIndex >= 0 ? videos[localVideoIndex + 1] : undefined;
    const video = localVideo ?? (
        isYouTubeId(id)
            ? isYouTubeConfigured()
                ? await getYouTubeVideo(id)
                : {
                    _id: id,
                    youtubeId: id,
                    videotitle: 'YouTube video',
                    filename: '',
                    filetype: 'video/youtube',
                    filepath: '',
                    filesize: '',
                    videochannel: 'YouTube',
                    category: 'YouTube',
                    like: '',
                    dislike: '',
                    views: '—',
                    uploader: 'YouTube',
                    createdAt: new Date().toISOString(),
                }
            : null
    );

    if (!video) {
        return (
            <div className="min-h-screen bg-[#f5f6fa]">
                <Header />
                <p className="mx-auto max-w-3xl px-6 py-20 text-center text-lg font-semibold text-slate-600">Video not found.</p>
            </div>
        );
    }

    const relatedVideos = isYouTubeConfigured()
        ? (await searchYouTubeVideos(video.videotitle)).filter(
            (item) => item.youtubeId !== video.youtubeId,
        )
        : [];

    return (
        <div className="min-h-screen bg-[#f5f6fa] text-slate-900">
            <Header />
            <div className="mx-auto flex max-w-[1800px]">
                <Sidebar />
                <main className="mx-auto grid min-w-0 max-w-[1500px] flex-1 grid-cols-1 gap-7 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:px-8">
                    <div className="min-w-0 space-y-5">
                        {availability.warning && <p role="status" className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">{availability.warning}</p>}
                        <WatchTracker video={video} />
                        <VideoPlayer video={video} nextVideo={nextVideo} />
                        <VideoInfo key={video._id} video={video} />
                        <Comments videoId={video._id} />
                    </div>
                    <aside className="space-y-4">
                        <h2 className="text-lg font-bold">More to watch</h2>
                        {!isYouTubeConfigured() && (
                            <p role="status" className="text-xs text-amber-800">
                                Add a YouTube API key to show related videos.
                            </p>
                        )}
                        {isYouTubeConfigured() && relatedVideos.length === 0 && (
                            <p className="text-sm text-slate-500">No related YouTube videos found.</p>
                        )}
                        <RelatedVideos videos={relatedVideos} />
                    </aside>
                </main>
            </div>
        </div>
    );
};

export default WatchPage;