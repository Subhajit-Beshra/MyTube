"use client";

import { Download, LoaderCircle } from "lucide-react";
import { useState } from "react";
import type { Video } from "@/lib/videos";
import { getApiUrl, platformRequest } from "@/lib/platform-api";
import { Button } from "./button";

type DownloadActionProps = {
  video: Pick<Video, "_id" | "youtubeId">;
  onComplete?: () => void;
};

type Reservation = {
  download: {
    id: string;
    filepath: string;
    filename: string;
    downloadUrl: string;
  };
};

export default function DownloadAction({ video, onComplete }: DownloadActionProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  async function handleDownload() {
    if (video.youtubeId) {
      setIsError(true);
      setMessage("Downloads are available for platform-hosted videos only.");
      return;
    }

    setLoading(true);
    setMessage("");
    let downloadId: string | undefined;
    try {
      const reservation = await platformRequest<Reservation>(
        `/downloads/${encodeURIComponent(video._id)}/start`,
        { method: "POST" },
      );
      downloadId = reservation.download.id;

      const response = await fetch(`${getApiUrl()}${reservation.download.downloadUrl}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`The video file could not be downloaded (${response.status}).`);
      }

      const objectUrl = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = reservation.download.filename;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);

      setIsError(false);
      setMessage("Download ready. Your daily quota has been updated.");
      onComplete?.();
    } catch (error) {
      if (downloadId) {
        try {
          await platformRequest(`/downloads/${downloadId}/fail`, { method: "PATCH" });
        } catch (releaseError) {
          console.error("Could not release the failed download reservation:", releaseError);
        }
      }
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "The download failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-1">
      <Button type="button" variant="secondary" disabled={loading || Boolean(video.youtubeId)} onClick={() => void handleDownload()}>
        {loading ? <LoaderCircle className="animate-spin" /> : <Download />}
        {loading ? "Preparing…" : "Download"}
      </Button>
      {message && (
        <p role={isError ? "alert" : "status"} className={`max-w-56 text-xs ${isError ? "text-red-600" : "text-emerald-700"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
