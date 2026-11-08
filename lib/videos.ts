export type Video = {
  _id: string;
  videotitle: string;
  filename: string;
  filetype: string;
  filepath: string;
  filesize: string;
  videochannel: string;
  category: string;
  like: string;
  dislike: string;
  views: string;
  uploader: string;
  createdAt: string;
  youtubeId?: string;
  channelId?: string;
  thumbnailUrl?: string;
  description?: string;
  watchedAt?: string;
};

export const videos: Video[] = [
  {
    _id: "1",
    videotitle: "A little joy goes a long way | Teacher's Day at La Familia",
    filename: "Video.mp4",
    filetype: "video/mp4",
    filepath: "/Video/Video.mp4",
    filesize: "13.5 MB",
    videochannel: "La Familia",
    category: "Lifestyle",
    like: "1.2K",
    dislike: "121",
    views: "45K",
    uploader: "La Familia",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    _id: "2",
    videotitle: "Building an AI-powered healthcare app from scratch",
    filename: "VitaCare.mp4",
    filetype: "video/mp4",
    filepath: "/Video/VitaCare.mp4",
    filesize: "34.8 MB",
    videochannel: "Developer's Development",
    category: "Technology",
    like: "1.2M",
    dislike: "200",
    views: "4.6M",
    uploader: "Hacker",
    createdAt: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    _id: "3",
    videotitle: "Small details, big impact: a calmer workspace",
    filename: "Video.mp4",
    filetype: "video/mp4",
    filepath: "/Video/Video.mp4",
    filesize: "13.5 MB",
    videochannel: "Pixel Studio",
    category: "Design",
    like: "22K",
    dislike: "430",
    views: "98K",
    uploader: "Pixel Studio",
    createdAt: new Date(Date.now() - 259200000).toISOString(),
  },
  {
    _id: "4",
    videotitle: "From idea to launch: a one-weekend product build",
    filename: "VitaCare.mp4",
    filetype: "video/mp4",
    filepath: "/Video/VitaCare.mp4",
    filesize: "34.8 MB",
    videochannel: "Startup Weekly",
    category: "Learning",
    like: "64K",
    dislike: "880",
    views: "230K",
    uploader: "Startup Weekly",
    createdAt: new Date(Date.now() - 345600000).toISOString(),
  },
];
