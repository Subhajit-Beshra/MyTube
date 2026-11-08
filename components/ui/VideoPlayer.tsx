"use client";

import {
  Check,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";

type VideoPlayerProps = {
  video: {
    _id: string;
    filepath: string;
    filetype: string;
    youtubeId?: string;
    videotitle?: string;
    thumbnailUrl?: string;
  };
  nextVideo?: {
    _id: string;
    videotitle: string;
  };
};

const playbackRates = [0.5, 1, 1.25, 1.5, 2];

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;
  const clock = `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}` : clock;
}

function getResumePosition(videoId: string) {
  try {
    const savedPositions: unknown = JSON.parse(
      localStorage.getItem("mytube-playback-progress") ?? "{}",
    );
    if (
      typeof savedPositions === "object" &&
      savedPositions !== null &&
      videoId in savedPositions
    ) {
      const position = (savedPositions as Record<string, unknown>)[videoId];
      return typeof position === "number" && Number.isFinite(position)
        ? position
        : 0;
    }
  } catch (error) {
    console.error("Could not read saved video progress:", error);
  }
  return 0;
}

function saveResumePosition(videoId: string, position: number) {
  try {
    const savedPositions: unknown = JSON.parse(
      localStorage.getItem("mytube-playback-progress") ?? "{}",
    );
    const positions =
      typeof savedPositions === "object" && savedPositions !== null
        ? (savedPositions as Record<string, unknown>)
        : {};
    positions[videoId] = position;
    localStorage.setItem("mytube-playback-progress", JSON.stringify(positions));
    return true;
  } catch (error) {
    console.error("Could not save video progress:", error);
    return false;
  }
}

export default function VideoPlayer({ video, nextVideo }: VideoPlayerProps) {
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSavedAtRef = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [loading, setLoading] = useState(!video.youtubeId);
  const [error, setError] = useState("");
  const [storageWarning, setStorageWarning] = useState("");
  const [theaterMode, setTheaterMode] = useState(false);
  const [autoPlayNext, setAutoPlayNext] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const saveProgress = useCallback(() => {
    const player = videoRef.current;
    if (!player || video.youtubeId || !Number.isFinite(player.currentTime)) return;
    const position = player.ended ? 0 : player.currentTime;
    if (!saveResumePosition(video._id, position)) {
      setStorageWarning("Playback progress could not be saved in this browser.");
    }
  }, [video._id, video.youtubeId]);

  const syncMetadata = useCallback((player: HTMLVideoElement) => {
    setDuration(Number.isFinite(player.duration) ? player.duration : 0);
    setLoading(false);
    const resumeAt = getResumePosition(video._id);
    if (resumeAt > 3 && resumeAt < player.duration - 3) {
      player.currentTime = resumeAt;
      setCurrentTime(resumeAt);
    }
  }, [video._id]);

  useEffect(() => {
    const player = videoRef.current;
    if (!player || video.youtubeId) return;
    let metadataSynchronized = false;
    const handleMetadata = () => {
      if (metadataSynchronized || player.readyState < 1) return;
      metadataSynchronized = true;
      syncMetadata(player);
    };
    const handleCanPlay = () => setLoading(false);
    player.addEventListener("loadedmetadata", handleMetadata);
    player.addEventListener("durationchange", handleMetadata);
    player.addEventListener("canplay", handleCanPlay);
    if (player.readyState >= 1) queueMicrotask(handleMetadata);
    if (player.readyState >= 3) queueMicrotask(handleCanPlay);
    return () => {
      player.removeEventListener("loadedmetadata", handleMetadata);
      player.removeEventListener("durationchange", handleMetadata);
      player.removeEventListener("canplay", handleCanPlay);
    };
  }, [syncMetadata, video.youtubeId]);

  useEffect(() => {
    const player = videoRef.current;
    if (!player || video.youtubeId) return;

    const onPageHide = () => saveProgress();
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      saveProgress();
    };
  }, [saveProgress, video.youtubeId]);

  async function togglePlayback() {
    const player = videoRef.current;
    if (!player) return;
    if (player.paused) {
      try {
        await player.play();
        setError("");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Video playback could not start.");
      }
    } else {
      player.pause();
    }
  }

  function seekBy(seconds: number) {
    const player = videoRef.current;
    if (!player) return;
    player.currentTime = Math.min(
      Math.max(0, player.currentTime + seconds),
      Number.isFinite(player.duration) ? player.duration : player.currentTime + seconds,
    );
  }

  function handleSeek(event: ChangeEvent<HTMLInputElement>) {
    const player = videoRef.current;
    if (!player) return;
    const nextTime = Number(event.currentTarget.value);
    player.currentTime = nextTime;
    setCurrentTime(nextTime);
  }

  function handleVolumeChange(event: ChangeEvent<HTMLInputElement>) {
    const nextVolume = Number(event.currentTarget.value);
    const player = videoRef.current;
    setVolume(nextVolume);
    setMuted(nextVolume === 0);
    if (player) {
      player.volume = nextVolume;
      player.muted = nextVolume === 0;
    }
  }

  async function toggleFullscreen() {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await wrapper.requestFullscreen();
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Fullscreen is not available.");
    }
  }

  async function togglePictureInPicture() {
    const player = videoRef.current;
    if (
      !player ||
      !document.pictureInPictureEnabled ||
      typeof player.requestPictureInPicture !== "function"
    ) {
      setError("Picture-in-Picture is not supported by this browser.");
      return;
    }
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await player.requestPictureInPicture();
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Picture-in-Picture is not available.");
    }
  }

  function handleKeyboard(event: KeyboardEvent<HTMLDivElement>) {
    const target = event.target;
    if (
      target instanceof HTMLElement &&
      ["BUTTON", "INPUT", "SELECT", "TEXTAREA"].includes(target.tagName)
    ) {
      return;
    }

    switch (event.key.toLowerCase()) {
      case " ":
      case "k":
        event.preventDefault();
        void togglePlayback();
        break;
      case "arrowleft":
        event.preventDefault();
        seekBy(-10);
        break;
      case "arrowright":
        event.preventDefault();
        seekBy(10);
        break;
      case "m":
        setMuted((isMuted) => {
          if (videoRef.current) videoRef.current.muted = !isMuted;
          return !isMuted;
        });
        break;
      case "f":
        event.preventDefault();
        void toggleFullscreen();
        break;
      case "t":
        setTheaterMode((isTheater) => !isTheater);
        break;
    }
  }

  if (video.youtubeId) {
    return (
      <div className="aspect-video overflow-hidden rounded-2xl bg-black shadow-lg">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}`}
          title={video.videotitle ?? "YouTube video"}
          className="size-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      className={`group relative overflow-hidden rounded-2xl bg-black text-white shadow-lg ${theaterMode ? "aspect-[2.2/1]" : "aspect-video"} focus:outline-none`}
      onKeyDown={handleKeyboard}
      tabIndex={0}
      aria-label="Video player. Press K or Space to play, arrows to seek, M to mute, F for fullscreen, and T for theater mode."
    >
      <video
        key={video._id}
        ref={videoRef}
        className="size-full object-contain"
        poster={video.thumbnailUrl}
        preload="metadata"
        playsInline
        onPlay={() => setPlaying(true)}
        onPause={() => {
          setPlaying(false);
          saveProgress();
        }}
        onWaiting={() => setLoading(true)}
        onCanPlay={() => setLoading(false)}
        onPlaying={() => setLoading(false)}
        onDurationChange={(event) => {
          const nextDuration = event.currentTarget.duration;
          if (Number.isFinite(nextDuration)) setDuration(nextDuration);
        }}
        onTimeUpdate={(event) => {
          const player = event.currentTarget;
          setCurrentTime(player.currentTime);
          const lastRange = player.buffered.length - 1;
          setBuffered(lastRange >= 0 ? player.buffered.end(lastRange) : 0);
          if (player.currentTime - lastSavedAtRef.current >= 5) {
            lastSavedAtRef.current = player.currentTime;
            saveProgress();
          }
        }}
        onError={() => {
          setLoading(false);
          setError("This video could not be loaded. Please try again later.");
        }}
        onEnded={() => {
          saveProgress();
          if (autoPlayNext && nextVideo) {
            router.push(`/watch/${nextVideo._id}`);
          }
        }}
      >
        <source src={video.filepath} type={video.filetype} />
        Your browser does not support this video.
      </video>

      {loading && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/35" role="status">
          <span className="size-10 animate-spin rounded-full border-4 border-white/35 border-t-white" />
          <span className="sr-only">Loading video</span>
        </div>
      )}

      {!playing && !loading && !error && (
        <button
          type="button"
          onClick={() => void togglePlayback()}
          className="absolute inset-0 m-auto flex size-16 items-center justify-center rounded-full bg-black/65 text-white transition hover:bg-black/85"
          aria-label="Play video"
        >
          <Play className="size-8 fill-current" />
        </button>
      )}

      {error && (
        <p role="alert" className="absolute left-4 right-4 top-4 rounded-lg bg-red-950/90 px-4 py-3 text-sm">
          {error}
        </p>
      )}
      {storageWarning && (
        <p role="status" className="absolute left-4 right-4 top-4 rounded-lg bg-amber-950/90 px-4 py-3 text-sm">
          {storageWarning}
        </p>
      )}

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent px-3 pb-3 pt-10 opacity-100 transition-opacity sm:px-5 sm:pb-4 group-hover:opacity-100">
        <input
          aria-label="Video progress"
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={Math.min(currentTime, duration || 0)}
          onChange={handleSeek}
          className="mb-2 h-1 w-full cursor-pointer accent-red-500"
          style={{ backgroundSize: `${duration ? (buffered / duration) * 100 : 0}% 100%` }}
        />
        <div className="flex items-center gap-2 sm:gap-3">
          <button type="button" onClick={() => void togglePlayback()} className="rounded p-1 hover:bg-white/15" aria-label={playing ? "Pause video" : "Play video"}>
            {playing ? <Pause className="size-5 fill-current" /> : <Play className="size-5 fill-current" />}
          </button>
          <button type="button" onClick={() => seekBy(-10)} className="rounded p-1 hover:bg-white/15" aria-label="Seek backward 10 seconds">
            <SkipBack className="size-5" />
          </button>
          <button type="button" onClick={() => seekBy(10)} className="rounded p-1 hover:bg-white/15" aria-label="Seek forward 10 seconds">
            <SkipForward className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => {
              const nextMuted = !muted;
              setMuted(nextMuted);
              if (videoRef.current) videoRef.current.muted = nextMuted;
            }}
            className="rounded p-1 hover:bg-white/15"
            aria-label={muted ? "Unmute video" : "Mute video"}
          >
            {muted || volume === 0 ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </button>
          <input
            aria-label="Volume"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : volume}
            onChange={handleVolumeChange}
            className="hidden w-20 accent-white sm:block"
          />
          <span className="min-w-[5.5rem] text-xs tabular-nums sm:text-sm">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          <span className="flex-1" />
          {nextVideo && (
            <button
              type="button"
              onClick={() => router.push(`/watch/${nextVideo._id}`)}
              className="hidden items-center gap-1 rounded px-2 py-1 text-xs hover:bg-white/15 sm:flex"
              aria-label={`Play next: ${nextVideo.videotitle}`}
            >
              Next
            </button>
          )}
          {nextVideo && (
            <button
              type="button"
              onClick={() => setAutoPlayNext((enabled) => !enabled)}
              className="hidden rounded p-1 hover:bg-white/15 sm:block"
              aria-label={autoPlayNext ? "Cancel autoplay next" : "Enable autoplay next"}
              title={autoPlayNext ? "Autoplay next is on" : "Autoplay next is off"}
            >
              {autoPlayNext ? <Check className="size-4" /> : <Play className="size-4" />}
            </button>
          )}
          <select
            aria-label="Playback speed"
            value={playbackRate}
            onChange={(event) => {
              const nextRate = Number(event.currentTarget.value);
              setPlaybackRate(nextRate);
              if (videoRef.current) videoRef.current.playbackRate = nextRate;
            }}
            className="max-w-14 rounded bg-transparent py-1 text-xs outline-none hover:bg-white/15 sm:max-w-none sm:text-sm"
          >
            {playbackRates.map((rate) => (
              <option key={rate} value={rate} className="bg-slate-900">
                {rate}x
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setTheaterMode((enabled) => !enabled)}
            className="hidden rounded p-1 hover:bg-white/15 sm:block"
            aria-label={theaterMode ? "Exit theater mode" : "Theater mode"}
            title="Theater mode (T)"
          >
            <span className="block h-4 w-5 rounded-sm border-2 border-current" />
          </button>
          <button type="button" onClick={() => void togglePictureInPicture()} className="hidden rounded p-1 hover:bg-white/15 sm:block" aria-label="Picture in Picture">
            <PictureInPicture2 className="size-5" />
          </button>
          <button type="button" onClick={() => void toggleFullscreen()} className="rounded p-1 hover:bg-white/15" aria-label="Toggle fullscreen">
            {isFullscreen ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
