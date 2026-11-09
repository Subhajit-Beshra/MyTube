export function buildUploadNotifications(subscriberIds, channelId, videoId) {
  return subscriberIds.map((recipient) => ({
    recipient,
    channel: channelId,
    video: videoId,
  }));
}
