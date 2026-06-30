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
  auto_upload?: boolean;
};

export type SeoResult = {
  topic: string;
  title: string;
  description: string;
  short_description: string;
  hashtags_main: string[];
  hashtags_secondary: string[];
  tags: string[];
  hooks: string[];
};

export type OptimizerReport = {
  error?: string;
  _meta?: { videos_analyzed: number; analytics_available: boolean };
  data_quality?: {
    total_videos_received: number;
    usable_videos: number;
    sample_size_warning: boolean;
    missing_or_unreliable_fields: string[];
    notes: string;
  };
  channel_benchmarks?: Record<string, number>;
  global_analysis?: {
    total_videos_analyzed: number;
    average_views: number;
    average_retention_rate: number;
    average_ctr: number;
    best_performing_topics: string[];
    worst_performing_topics: string[];
    main_strengths: string[];
    main_weaknesses: string[];
  };
  top_videos?: {
    video_id: string;
    title: string;
    reason: string;
    what_to_repeat: string[];
  }[];
  underperforming_videos?: {
    video_id: string;
    title: string;
    problem: string;
    root_cause: string;
    fixes: string[];
  }[];
  seo_recommendations?: {
    recommended_title_patterns: string[];
    recommended_description_structure: string;
    recommended_hashtags: string[];
    hashtags_to_avoid: string[];
    recommended_tags: string[];
    best_keywords: string[];
    keywords_to_avoid: string[];
  };
  content_strategy?: {
    topics_to_repeat: string[];
    topics_to_avoid: string[];
    new_video_ideas: {
      idea: string;
      reason: string;
      suggested_hook: string;
      suggested_title: string;
      suggested_hashtags: string[];
      estimated_potential: string;
      confidence: number;
    }[];
    recommended_posting_times: string[];
  };
  next_upload_settings?: Record<string, unknown> & {
    title_formula?: string;
    description_template?: string;
    hashtags?: string[];
    tags?: string[];
    hook_style?: string;
    publish_time?: string;
  };
  videos_to_update?: {
    video_id: string;
    current_title: string;
    new_title: string;
    current_description: string;
    new_description: string;
    current_hashtags: string[];
    new_hashtags: string[];
    reason: string;
    confidence: number;
  }[];
  summary?: {
    main_action_to_take: string;
    priority_level: string;
    confidence: number;
    next_3_actions: string[];
  };
};

export type JobMessage =
  | { type: "progress"; message: string; percent?: number }
  | { type: "done"; result: { video_id: string; topic: string; title: string } }
  | { type: "preview"; job_id: string; result: { title: string; topic: string; preview_url: string } }
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

  publishBuilt: (jobId: string): Promise<{ job_id?: string; error?: string }> =>
    fetch("/api/publish-built", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_id: jobId }),
    }).then((r) => json(r)),

  discardPreview: (jobId: string): Promise<{ ok: boolean }> =>
    fetch("/api/discard-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_id: jobId }),
    }).then((r) => json(r)),

  seo: (req: { topic?: string; script?: string; niche?: string }): Promise<SeoResult> =>
    fetch("/api/seo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    }).then((r) => json<SeoResult>(r)),

  optimizer: (req: { limit?: number; days?: number }): Promise<OptimizerReport> =>
    fetch("/api/optimizer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    }).then((r) => json<OptimizerReport>(r)),

  applyUpdate: (req: {
    video_id: string;
    title?: string;
    description?: string;
    tags?: string[];
  }): Promise<{ ok?: boolean; error?: string }> =>
    fetch("/api/optimizer/apply", {
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
