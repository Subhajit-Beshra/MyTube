import "server-only";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export async function filterAvailableVideos<T extends { _id: string }>(videos: T[]) {
  if (videos.length === 0) return { videos, warning: "" };
  try {
    const response = await fetch(`${API_URL}/moderation/videos/visibility`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoIds: videos.map((video) => video._id) }),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Moderation API responded with ${response.status}.`);
    const result = (await response.json()) as { hiddenVideoIds?: unknown };
    if (
      !Array.isArray(result.hiddenVideoIds) ||
      result.hiddenVideoIds.some((id) => typeof id !== "string")
    ) {
      throw new Error("Moderation API returned an invalid visibility response.");
    }
    const hiddenIds = new Set(result.hiddenVideoIds);
    return {
      videos: videos.filter((video) => !hiddenIds.has(video._id)),
      warning: "",
    };
  } catch (error) {
    console.error("Could not filter moderated videos:", error);
    return {
      videos,
      warning: "Some video availability could not be verified. Try again later.",
    };
  }
}

export async function checkVideoAvailability(videoId: string) {
  try {
    const response = await fetch(
      `${API_URL}/moderation/videos/${encodeURIComponent(videoId)}/status`,
      { cache: "no-store" },
    );
    if (!response.ok) throw new Error(`Moderation API responded with ${response.status}.`);
    const result = (await response.json()) as { visible?: unknown };
    if (typeof result.visible !== "boolean") {
      throw new Error("Moderation API returned an invalid availability response.");
    }
    return { visible: result.visible, warning: "" };
  } catch (error) {
    console.error("Could not check video availability:", error);
    return {
      visible: true,
      warning: "Video moderation status could not be checked. Try again later.",
    };
  }
}
