import React from 'react'
import VideoCard from './VideoCard'

const Videogrid = () => {
    const videos = [
        {
            _id: "1",
            videotitle: "Teacher's day Celebration",
            filename: "Video.mp4",
            filetype: "Video/mp4",
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
            filetype: "Video/mp4",
            filepath: "/Video/VitaCare.mp4",
            filesize: "34.8 MB",
            videochannel: "Developer's Development",
            like: "1.2 M",
            views: "4.6 M",
            uploader: "Hacker",
            createdAt: new Date(Date.now() - 86400000).toISOString(),
        }
    ]
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {videos.map((video) => 
            <VideoCard key={video._id} video ={video} />
        )}
    </div>
  )
}

export default Videogrid