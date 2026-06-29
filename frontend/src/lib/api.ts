export type HistoryEntry = {
  topic: string;
  title: string;
  video_id: string;
  date: string;
};

export type VideoStats = HistoryEntry & {
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  privacyStatus?: string;
};

export type StatsResponse = {
  totals: { videos: number; views: number; likes: number };
  videos: VideoStats[];
};

export type ConfigStatus = {
  groq: boolean;
  pexels: boolean;
  pixabay: boolean;
  assemblyai: boolean;
  deepgram: boolean;
  piper_exe: boolean;
  piper_voice: boolean;
  ffmpeg: boolean;
  client_secret: boolean;
  token: boolean;
};

export type GenerateMode = "free" | "topic" | "film" | "clip";

export type ClipMode = "manual" | "speech" | "first";
export type VideoFormat = "short" | "video";
export type Language = "fr" | "en";
export type TranscriptionEngine = "whisper" | "assemblyai" | "deepgram";
export type VideoQuality = "best" | "1080" | "720" | "480" | "360";
export type SubtitleMode = "sentence" | "word";

export type GenerateRequest = {
  mode: GenerateMode;
  topic?: string | null;
  film?: string | null;
  source_url?: string | null;
  file_path?: string | null;
  mine?: boolean;
  script_text?: string | null;
  clip_mode?: ClipMode;
  clip_start?: number;
  clip_duration?: number;
  voice_enabled?: boolean;
  language?: Language;
  transcription_enabled?: boolean;
  transcription_engine?: TranscriptionEngine;
  video_format?: VideoFormat;
  video_quality?: VideoQuality;
  subtitle_size?: number;
  subtitle_color?: string;
  subtitle_mode?: SubtitleMode;
  subtitle_max_words?: number;
};

export type JobMessage =
  | { type: "progress"; message: string; percent?: number }
  | { type: "done"; result: { video_id: string; topic: string; title: string } }
  | { type: "skipped"; message: string }
  | { type: "error"; message: string };

async function json<T>(res: Response): Promise<T> {
  return res.json() as Promise<T>;
}

export const api = {
  getHistory: () => fetch("/api/history").then((r) => json<HistoryEntry[]>(r)),

  deleteHistoryEntry: (videoId: string) =>
    fetch(`/api/history/${videoId}`, { method: "DELETE" }),

  getConfigStatus: () => fetch("/api/config/status").then((r) => json<ConfigStatus>(r)),

  getStats: () => fetch("/api/stats").then((r) => json<StatsResponse>(r)),

  publish: (videoId: string, privacyStatus: string) =>
    fetch("/api/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ video_id: videoId, privacy_status: privacyStatus }),
    }),

  uploadLocal: async (file: File): Promise<{ file_path: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload-local", { method: "POST", body: formData });
    return json(res);
  },

  generate: (req: GenerateRequest): Promise<{ job_id: string }> =>
    fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    }).then((r) => json(r)),

  watchJob: (jobId: string, onMessage: (msg: JobMessage) => void) => {
    const ws = new WebSocket(`ws://${location.host}/ws/jobs/${jobId}`);
    ws.onmessage = (event) => onMessage(JSON.parse(event.data) as JobMessage);
    return ws;
  },
};
