import "server-only";
import type { Video } from "@/lib/videos";

type YouTubeSnippet = {
  title: string;
  channelTitle: string;
  channelId: string;
  description: string;
  publishedAt: string;
  thumbnails: {
    high?: { url: string };
    medium?: { url: string };
    default?: { url: string };
  };
};

type YouTubeSearchResponse = {
  items?: Array<{ id: { videoId?: string }; snippet: YouTubeSnippet }>;
};

type YouTubeVideoResponse = {
  items?: Array<{
    id: string;
    snippet: YouTubeSnippet;
    statistics?: { viewCount?: string };
    kind?: string;
  }>;
};

type YouTubePopularResponse = {
  items?: Array<{
    id: string;
    snippet: YouTubeSnippet & { categoryId?: string };
    statistics?: { viewCount?: string };
  }>;
};

const apiBase = "https://www.googleapis.com/youtube/v3";
const categoryNames: Record<string, string> = {
  "1": "Film & Animation",
  "2": "Autos & Vehicles",
  "10": "Music",
  "15": "Pets & Animals",
  "17": "Sports",
  "19": "Travel",
  "20": "Gaming",
  "22": "People & Blogs",
  "23": "Comedy",
  "24": "Entertainment",
  "25": "News",
  "26": "How-to & Style",
  "27": "Education",
  "28": "Science & Technology",
  "29": "Nonprofits",
};

export const isYouTubeConfigured = () => Boolean(process.env.YOUTUBE_API_KEY);

function formatViews(count: string | undefined): string {
  const views = Number(count ?? 0);
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(views);
}

async function youtubeRequest<T>(resource: string, params: URLSearchParams): Promise<T> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("YouTube API key is not configured.");

  params.set("key", key);
  const response = await fetch(`${apiBase}/${resource}?${params}`, { cache: "no-store" });
  if (!response.ok) {
    let detail: { error?: { message?: string } } | null = null;
    try {
      detail = (await response.json()) as { error?: { message?: string } };
    } catch {
      detail = null;
    }
    throw new Error(detail?.error?.message ?? `YouTube API request failed (${response.status}).`);
  }
  return response.json() as Promise<T>;
}

function toVideo(
  item: { id: { videoId?: string } | string; snippet: YouTubeSnippet & { categoryId?: string } },
  views: string,
): Video | null {
  const id = typeof item.id === "string" ? item.id : item.id.videoId;
  if (!id) return null;

  const snippet = item.snippet;
  return {
    _id: id,
    youtubeId: id,
    videotitle: snippet.title,
    filename: "",
    filetype: "video/youtube",
    filepath: "",
    filesize: "",
    videochannel: snippet.channelTitle,
    channelId: snippet.channelId,
    category: categoryNames[snippet.categoryId ?? ""] ?? "Other",
    like: "",
    dislike: "",
    views,
    uploader: snippet.channelTitle,
    createdAt: snippet.publishedAt,
    thumbnailUrl:
      snippet.thumbnails.high?.url ??
      snippet.thumbnails.medium?.url ??
      snippet.thumbnails.default?.url,
    description: snippet.description,
  };
}

export async function getPopularYouTubeVideos(): Promise<Video[]> {
  const result = await youtubeRequest<YouTubePopularResponse>(
    "videos",
    new URLSearchParams({ part: "snippet,statistics", chart: "mostPopular", regionCode: "IN", maxResults: "24" }),
  );

  return (result.items ?? []).flatMap((item) => {
    const video = toVideo(item, formatViews(item.statistics?.viewCount));
    return video ? [video] : [];
  });
}

export async function searchYouTubeVideos(query: string): Promise<Video[]> {
  const params = new URLSearchParams({
    part: "snippet",
    type: "video",
    maxResults: "12",
    q: query,
    safeSearch: "moderate",
  });
  const result = await youtubeRequest<YouTubeSearchResponse>("search", params);
  const items = (result.items ?? []).filter(
    (item): item is typeof item & { id: { videoId: string } } => Boolean(item.id.videoId),
  );

  return items.flatMap((item) => {
    const video = toVideo(item, "—");
    return video ? [video] : [];
  });
}

export async function getYouTubeVideo(id: string): Promise<Video | null> {
  const result = await youtubeRequest<YouTubeVideoResponse>(
    "videos",
    new URLSearchParams({ part: "snippet,statistics", id }),
  );
  const item = result.items?.[0];
  if (!item) return null;

  return toVideo(
    { id: { videoId: item.id }, snippet: item.snippet },
    item.statistics?.viewCount ?? "0",
  );
}
