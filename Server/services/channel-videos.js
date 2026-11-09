export const MAX_CHANNEL_VIDEO_SIZE = 500 * 1024 * 1024;

const supportedVideoExtensions = new Set([".mp4", ".m4v", ".mov", ".ogv", ".webm"]);

export function isSupportedVideoFile(file) {
  const extension = file.originalname
    .slice(file.originalname.lastIndexOf("."))
    .toLowerCase();
  return file.mimetype.startsWith("video/") && supportedVideoExtensions.has(extension);
}
