import { formatDistanceToNow } from "date-fns";
import Image from "next/image";
import Link from "next/link";
import { Avatar, AvatarFallback } from "./avatar";
import type { Video } from "@/lib/videos";

const VideoCard = ({ video }: { video: Video }) => (
  <Link href={`/watch/${video._id}`} className="group block min-w-0">
    <div className="relative aspect-video overflow-hidden bg-slate-200 shadow-sm ring-1 ring-slate-900/5">
      {video.thumbnailUrl ? (
        <Image
          src={video.thumbnailUrl}
          alt=""
          fill
          unoptimized
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
          className="object-cover transition duration-300 group-hover:scale-[1.03]"
        />
      ) : (
        <video
          src={video.filepath}
          className="size-full object-cover transition duration-300 group-hover:scale-[1.03]"
          muted
          preload="metadata"
          playsInline
        />
      )}
      <span className="absolute left-3 top-3 rounded bg-white/90 px-2.5 py-1 text-[11px] font-bold text-slate-700 shadow-sm backdrop-blur">
        {video.category}
      </span>
      <span className="absolute bottom-3 right-3 rounded bg-slate-950/80 px-2 py-1 text-[11px] font-semibold text-white">
        Play video
      </span>
    </div>
    <div className="mt-3 flex gap-3">
      <Avatar className="size-10 shrink-0">
        <AvatarFallback className="bg-indigo-100 text-sm font-bold text-indigo-700">
          {video.videochannel.slice(0, 1).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <h2 className="line-clamp-2 text-[15px] font-bold leading-5 text-slate-900 transition group-hover:text-indigo-700">
          {video.videotitle}
        </h2>
        <p className="mt-1.5 truncate text-sm text-slate-500">{video.videochannel}</p>
        <p className="mt-0.5 text-xs text-slate-500">
          {video.views !== "—" && <>{video.views} views <span className="px-1">·</span></>}
          {formatDistanceToNow(new Date(video.createdAt), { addSuffix: true })}
        </p>
      </div>
    </div>
  </Link>
);

export default VideoCard;
