const videoIdPattern = /^[\w-]{1,64}$/;
const reportResolutions = new Set(["reviewed", "dismissed"]);

export function isValidVideoId(videoId) {
  return typeof videoId === "string" && videoIdPattern.test(videoId);
}

export function isValidModerationReason(reason) {
  return typeof reason === "string" && reason.trim().length > 0 && reason.trim().length <= 500;
}

export function isValidReportResolution(status) {
  return typeof status === "string" && reportResolutions.has(status);
}
