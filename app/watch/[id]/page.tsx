import VideoPlayer from '@/components/ui/VideoPlayer';
import VideoInfo from '@/components/ui/VideoInfo';

const relatedVideos = [
    {
        _id: "1",
        videotitle: "Teacher's day Celebration",
        filename: "Video.mp4",
        filetype: "video/mp4",
        filepath: "/Video/Video.mp4",
        filesize: "13.5 MB",
        videochannel: "La familia",
        like: "1250",
        views: "45000",
        uploader: "Sick Boy",
        createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
        _id: "2",
        videotitle: "Creating an AI powered healthcare app",
        filename: "VitaCare.mp4",
        filetype: "video/mp4",
        filepath: "/Video/VitaCare.mp4",
        filesize: "34.8 MB",
        videochannel: "Developer's Development",
        like: "1.2 M",
        views: "4.6 M",
        uploader: "Hacker",
        createdAt: new Date(Date.now() - 86400000).toISOString(),
    }
];

const WatchPage = async ({ params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const video = relatedVideos.find((item) => item._id === id);

    if (!video) {
        return <div>Video Not Found</div>;
    }

    return (
        <div className='min-h-screen'>
            <div className='max-w-7xl mx-auto p-4'>
                <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
                    <div className='lg:col-span-2 space-y-4'>
                        <VideoPlayer video={video} />
                        <VideoInfo key={video._id} video={video} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WatchPage;