export const downloadableVideos = {
  "1": {
    title: "A little joy goes a long way | Teacher's Day at La Familia",
    filepath: "/Video/Video.mp4",
    filename: "la-familia-teachers-day.mp4",
    filesize: 14208432,
  },
  "2": {
    title: "Building an AI-powered healthcare app from scratch",
    filepath: "/Video/VitaCare.mp4",
    filename: "vitacare-app-build.mp4",
    filesize: 36528352,
  },
  "3": {
    title: "Small details, big impact: a calmer workspace",
    filepath: "/Video/Video.mp4",
    filename: "calmer-workspace.mp4",
    filesize: 14208432,
  },
  "4": {
    title: "From idea to launch: a one-weekend product build",
    filepath: "/Video/VitaCare.mp4",
    filename: "weekend-product-build.mp4",
    filesize: 36528352,
  },
};

export function getDownloadableVideo(videoId) {
  if (typeof videoId !== "string" || !Object.hasOwn(downloadableVideos, videoId)) {
    return null;
  }
  return downloadableVideos[videoId];
}
