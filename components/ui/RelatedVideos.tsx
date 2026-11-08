import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import type { Video } from "@/lib/videos";

interface RelatedVideosProps {
  videos: Video[];
}

export default function RelatedVideos({ videos }: RelatedVideosProps) {
  const youtubeVideos = videos.filter(
    (video): video is Video & { youtubeId: string } =>
      typeof video.youtubeId === "string" && video.youtubeId.length > 0,
  );

  return (
    <div className="space-y-2">
      {youtubeVideos.map((video) => (
        <Link
          key={video.youtubeId}
          href={`/watch/${video.youtubeId}`}
          className="flex gap-2 group"
        >
          <div className="relative aspect-video w-40 shrink-0 overflow-hidden rounded bg-gray-100">
            {video.thumbnailUrl && (
              <Image src={video.thumbnailUrl} alt="" fill unoptimized sizes="160px" className="object-cover" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm line-clamp-2 group-hover:text-blue-600">
              {video.videotitle}
            </h3>
            <p className="text-xs text-gray-600 mt-1">{video.videochannel}</p>
            <p className="text-xs text-gray-600">
              {video.views} views •{" "}
              {formatDistanceToNow(new Date(video.createdAt))} ago
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}