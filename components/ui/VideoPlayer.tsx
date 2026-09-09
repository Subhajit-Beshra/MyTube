import React from 'react'

type VideoPlayerProps = {
  video: {
    filepath: string;
    filetype: string;
  };
};

const VideoPlayer = ({video}: VideoPlayerProps) => {
  return (
    <div className="aspect-video bg-black rounded-lg overflow-hidden">
        <video className='w-full h-full' controls>
            <source src={video.filepath} type={video.filetype}/>
            Your browsers do not support this video.
        </video>
    </div>
  )
}

export default VideoPlayer