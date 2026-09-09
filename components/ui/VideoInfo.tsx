'use client';

import { Avatar, AvatarFallback } from './avatar';
import { Button } from './button';
import { Check, Download, MoreHorizontal, Share2, ThumbsDown, ThumbsUp } from 'lucide-react';
import { useState } from 'react';

type Video = {
    _id: string;
    videotitle: string;
    filename: string;
    filepath: string;
    videochannel: string;
    like?: string | number;
    dislike?: string | number;
};

const parseCount = (value: string | number | undefined) => {
    if (typeof value === 'number') return value;
    const match = value?.trim().match(/^([\d.]+)\s*([KM])?$/i);
    if (!match) return 0;

    const multiplier = match[2]?.toUpperCase() === 'M' ? 1_000_000 : match[2] ? 1_000 : 1;
    return Number(match[1]) * multiplier;
};

const VideoInfo = ({video}: { video: Video }) => {
    const [like, setLike] = useState(parseCount(video.like));
    const [dislike, setDislike] = useState(parseCount(video.dislike));
    const [isLike, setIsLike] = useState(false);
    const [isDisliked, setIsDisliked] = useState(false);
    const [isMoreOpen, setIsMoreOpen] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    const handleLike = () => {
        if(isLike){
            setLike((prev: number) => prev - 1);
            setIsLike(false);
        }else{
            setLike((prev: number) => prev + 1);
            setIsLike(true);
            if(isDisliked){
                setDislike((prev: number) => prev - 1);
                setIsDisliked(false);
            }
        }
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

  return (
    <div className='space-y-4'>
        <h1 className='text-xl font-semibold'>{video.videotitle}</h1>
        <div className='flex flex-wrap items-center justify-between gap-4'>
            <div className='flex items-center gap-3'>
                <Avatar className='w-10 h-10'>
                    <AvatarFallback>{video.videochannel[0]}</AvatarFallback>
                </Avatar>
                <div>
                    <h3 className='font-medium'>{video.videochannel}</h3>
                    <p className='text-sm text-gray-600'>1.2M subscribers</p>
                </div>
                <Button className='ml-4'>Subscribe</Button>
            </div>
            <div className='flex flex-wrap items-center gap-2'>
                <div className='flex overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800'>
                    <Button
                        variant='ghost'
                        className={isLike ? 'bg-gray-200 dark:bg-gray-700' : ''}
                        onClick={handleLike}
                        aria-label='Like video'
                    >
                        <ThumbsUp />
                        {like.toLocaleString()}
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
                <Button variant='secondary' render={<a href={video.filepath} download={video.filename} />}>
                    <Download />
                    Download
                </Button>
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
                        <div className='absolute right-0 top-11 z-10 min-w-40 rounded-lg border bg-white p-1 shadow-lg dark:bg-gray-900'>
                            <button className='w-full rounded-md px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800'>Save to playlist</button>
                            <button className='w-full rounded-md px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800'>Report</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  )
}

export default VideoInfo