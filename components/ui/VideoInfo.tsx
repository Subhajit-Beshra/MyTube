'use client';

import { Avatar, AvatarFallback } from './avatar';
import { Button } from './button';
import { formatDistanceToNow } from 'date-fns';
import { Bookmark, Check, Flag, MoreHorizontal, Share2, ThumbsDown, ThumbsUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Video } from '@/lib/videos';
import { useAuth } from '@/lib/AuthContext';
import { platformRequest } from '@/lib/platform-api';
import DownloadAction from '@/components/ui/DownloadAction';
import {
    changeEvent,
    readLibrary,
    readSubscriptions,
    writeLibrary,
    writeSubscriptions,
} from '@/lib/local-library';

const parseCount = (value: string | number | undefined) => {
    if (typeof value === 'number') return value;
    const match = value?.trim().match(/^([\d.]+)\s*([KM])?$/i);
    if (!match) return 0;

    const multiplier = match[2]?.toUpperCase() === 'M' ? 1_000_000 : match[2] ? 1_000 : 1;
    return Number(match[1]) * multiplier;
};

const VideoInfo = ({video}: { video: Video }) => {
    const { user } = useAuth();
    const [like, setLike] = useState(parseCount(video.like));
    const [dislike, setDislike] = useState(parseCount(video.dislike));
    const [isLike, setIsLike] = useState(false);
    const [isDisliked, setIsDisliked] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isMoreOpen, setIsMoreOpen] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [showFullDescription, setShowFullDescription] = useState(false);
    const [reportMessage, setReportMessage] = useState('');
    const [reporting, setReporting] = useState(false);

    useEffect(() => {
        const update = () => {
            setIsLike(readLibrary('liked').some((item) => item._id === video._id));
            setIsSaved(readLibrary('watch-later').some((item) => item._id === video._id));
            setIsSubscribed(readSubscriptions().some((channel) => channel.id === (video.channelId ?? video.videochannel)));
        };
        update();
        window.addEventListener(changeEvent, update);
        window.addEventListener('storage', update);
        return () => {
            window.removeEventListener(changeEvent, update);
            window.removeEventListener('storage', update);
        };
    }, [video]);

    const handleLike = () => {
        const liked = readLibrary('liked');
        const alreadyLiked = liked.some((item) => item._id === video._id);
        writeLibrary('liked', alreadyLiked ? liked.filter((item) => item._id !== video._id) : [video, ...liked]);
        setIsLike(!alreadyLiked);
        setLike((count) => count + (alreadyLiked ? -1 : 1));
        if (!alreadyLiked && isDisliked) handleDislike();
    }

    const handleDislike = () => {
        if(isDisliked){
            setDislike((prev: number) => prev - 1);
            setIsDisliked(false);
        }else{
            setDislike((prev: number) => prev + 1);
            setIsDisliked(true);
            if(isLike){
                setLike((prev: number) => prev - 1);
                setIsLike(false);
            }
        }
    }

    const handleShare = async () => {
        const shareData = { title: video.videotitle, url: window.location.href };
        if (navigator.share) {
            await navigator.share(shareData);
        } else {
            await navigator.clipboard.writeText(window.location.href);
            setIsCopied(true);
            window.setTimeout(() => setIsCopied(false), 2000);
        }
    };

    const toggleWatchLater = () => {
        const saved = readLibrary('watch-later');
        const alreadySaved = saved.some((item) => item._id === video._id);
        writeLibrary('watch-later', alreadySaved ? saved.filter((item) => item._id !== video._id) : [video, ...saved]);
        setIsSaved(!alreadySaved);
        setIsMoreOpen(false);
    };

    const toggleSubscription = () => {
        const id = video.channelId ?? video.videochannel;
        const subscriptions = readSubscriptions();
        const subscribed = subscriptions.some((channel) => channel.id === id);
        writeSubscriptions(
            subscribed
                ? subscriptions.filter((channel) => channel.id !== id)
                : [{ id, name: video.videochannel }, ...subscriptions],
        );
        setIsSubscribed(!subscribed);
    };

    const reportVideo = async () => {
        if (!user) {
            setReportMessage('Sign in to report this video.');
            return;
        }
        setReporting(true);
        setReportMessage('');
        try {
            const result = await platformRequest<{ message: string }>(
                `/moderation/videos/${encodeURIComponent(video._id)}/report`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        provider: video.youtubeId ? 'youtube' : 'platform',
                        title: video.videotitle,
                        reason: 'Inappropriate or harmful content',
                    }),
                },
            );
            setReportMessage(result.message);
        } catch (error) {
            setReportMessage(error instanceof Error ? error.message : 'Could not report this video.');
        } finally {
            setReporting(false);
        }
    };

  return (
    <div className='space-y-4'>
        <h1 className='text-xl font-semibold'>{video.videotitle}</h1>
        <div className='flex` flex-wrap items-center justify-between gap-4 py-3'>
            <div className='flex items-center gap-3'>
                <Avatar className='w-10 h-10'>
                    <AvatarFallback>{video.videochannel[0]}</AvatarFallback>
                </Avatar>
                <div>
                    {video.channelId ? (
                        <a href={`https://www.youtube.com/channel/${video.channelId}`} target="_blank" rel="noreferrer" className='font-medium hover:text-indigo-700'>
                            {video.videochannel}
                        </a>
                    ) : (
                        <h3 className='font-medium'>{video.videochannel}</h3>
                    )}
                    <p className='text-sm text-gray-600'>1.2M subscribers</p>
                </div>
                <Button className='ml-4' onClick={toggleSubscription}>{isSubscribed ? 'Subscribed' : 'Subscribe'}</Button>
            </div>
            <div className='flex flex-wrap items-center gap-2'>
                <div className='flex overflow-hidden rounded bg-gray-100 dark:bg-gray-800'>
                    <Button
                        variant='ghost'
                        className={isLike ? 'bg-gray-200 dark:bg-gray-700' : ''}
                        onClick={handleLike}
                        aria-label='Like video'
                    >
                        <ThumbsUp />
                        {video.like ? like.toLocaleString() : isLike ? 'Liked' : 'Like'}
                    </Button>
                    <Button
                        variant='ghost'
                        className={isDisliked ? 'bg-gray-200 dark:bg-gray-700' : ''}
                        onClick={handleDislike}
                        aria-label='Dislike video'
                    >
                        <ThumbsDown />
                        {dislike.toLocaleString()}
                    </Button>
                </div>
                <Button variant='secondary' onClick={handleShare}>
                    {isCopied ? <Check /> : <Share2 />}
                    {isCopied ? 'Copied' : 'Share'}
                </Button>
                {video.filepath && (
                    <DownloadAction video={video} />
                )}
                <div className='relative'>
                    <Button
                        variant='secondary'
                        size='icon'
                        onClick={() => setIsMoreOpen((open) => !open)}
                        aria-label='More actions'
                        aria-expanded={isMoreOpen}
                    >
                        <MoreHorizontal />
                    </Button>
                    {isMoreOpen && (
                        <div className='absolute right-0 top-11 z-10 min-w-40  border bg-white p-1 shadow-lg dark:bg-gray-900'>
                            <button onClick={toggleWatchLater} className='flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800'>
                                <Bookmark className='size-4' /> {isSaved ? 'Remove from Watch later' : 'Save to Watch later'}
                            </button>
                            <button type="button" disabled={reporting} onClick={() => void reportVideo()} className='flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-gray-800'>
                                <Flag className='size-4' /> {reporting ? 'Sending report…' : 'Report video'}
                            </button>
                            <a href={video.youtubeId ? `https://www.youtube.com/watch?v=${video.youtubeId}` : window.location.href} target="_blank" rel="noreferrer" className='block rounded-md px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800'>Open on YouTube</a>
                        </div>
                    )}
                </div>
            </div>
        </div>
        {reportMessage && <p role="status" className="text-sm text-slate-600">{reportMessage}</p>}
        <div className="bg-gray-100 rounded-lg p-4">
            <div className="flex gap-4 text-sm font-medium mb-2">
                <span>{video.views.toLocaleString()}</span>
                 <span>{formatDistanceToNow(new Date(video.createdAt))} ago</span>
            </div>
            <div className={`text-sm ${showFullDescription ? "" : "line-clamp-3"}`}>
                <p>
                    {video.description || 'Watch and explore more from this creator on MyTube.'}
                </p>
            </div>
            <Button variant="ghost" size="sm" className="mt-2 p-0 h-auto font-medium" onClick={() => setShowFullDescription(!showFullDescription)}>
                {showFullDescription ? 'show less' : 'show more'}
            </Button>
        </div>
    </div>
  )
}

export default VideoInfo