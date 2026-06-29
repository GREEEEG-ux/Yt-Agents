import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { api, type GenerateRequest, type JobMessage } from "@/lib/api";

export type JobStatus = "idle" | "running" | "preview" | "publishing" | "done" | "error" | "skipped";

export type JobState = {
  status: JobStatus;
  percent: number;
  lastMessage: string;
  log: string[];
  result: { video_id: string; title: string } | null;
  jobId: string | null;
  previewUrl: string | null;
  previewTitle: string | null;
};

type JobContextValue = JobState & {
  startJob: (req: GenerateRequest, file?: File | null) => Promise<void>;
  publish: () => Promise<void>;
  cancelPreview: () => Promise<void>;
  dismiss: () => void;
};

const initialState: JobState = {
  status: "idle",
  percent: 0,
  lastMessage: "",
  log: [],
  result: null,
  jobId: null,
  previewUrl: null,
  previewTitle: null,
};

const JobContext = createContext<JobContextValue | null>(null);

export function JobProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<JobState>(initialState);
  const wsRef = useRef<WebSocket | null>(null);

  function handleMessage(msg: JobMessage) {
    if (msg.type === "progress") {
      setState((s) => ({
        ...s,
        status: "running",
        lastMessage: msg.message,
        percent: msg.percent ?? s.percent,
        log: [...s.log, msg.message],
      }));
    } else if (msg.type === "preview") {
      setState((s) => ({
        ...s,
        status: "preview",
        percent: 100,
        lastMessage: "Prévisualisation prête.",
        log: [...s.log, "Prévisualisation prête."],
        jobId: msg.job_id,
        // cache-bust : le fichier short.mp4 est réécrit à chaque génération.
        previewUrl: `${msg.result.preview_url}?t=${Date.now()}`,
        previewTitle: msg.result.title,
      }));
    } else if (msg.type === "done") {
      setState((s) => ({
        ...s,
        status: "done",
        percent: 100,
        lastMessage: "Terminé.",
        log: [...s.log, "Terminé."],
        result: { video_id: msg.result.video_id, title: msg.result.title },
      }));
    } else if (msg.type === "skipped") {
      setState((s) => ({ ...s, status: "skipped", lastMessage: msg.message, log: [...s.log, msg.message] }));
    } else if (msg.type === "error") {
      setState((s) => ({
        ...s,
        status: "error",
        lastMessage: msg.message,
        log: [...s.log, "Erreur : " + msg.message],
      }));
    }
  }

  async function startJob(req: GenerateRequest, file?: File | null) {
    wsRef.current?.close();
    setState({ ...initialState, status: "running", lastMessage: "Démarrage..." });

    let finalReq = req;
    if (file) {
      setState((s) => ({ ...s, lastMessage: "Envoi du fichier local...", log: [...s.log, "Envoi du fichier local..."] }));
      const uploaded = await api.uploadLocal(file);
      finalReq = { ...req, file_path: uploaded.file_path };
    }

    const { job_id } = await api.generate(finalReq);
    setState((s) => ({ ...s, jobId: job_id }));
    wsRef.current = api.watchJob(job_id, handleMessage);
  }

  async function publish() {
    const previewJobId = state.jobId;
    if (!previewJobId) return;
    wsRef.current?.close();
    setState((s) => ({
      ...s,
      status: "publishing",
      lastMessage: "Publication sur YouTube...",
      log: [...s.log, "Publication sur YouTube..."],
    }));
    const res = await api.publishBuilt(previewJobId);
    if (res.error || !res.job_id) {
      setState((s) => ({ ...s, status: "error", lastMessage: res.error ?? "Échec de la publication." }));
      return;
    }
    wsRef.current = api.watchJob(res.job_id, handleMessage);
  }

  async function cancelPreview() {
    if (state.jobId) await api.discardPreview(state.jobId);
    setState(initialState);
  }

  function dismiss() {
    setState(initialState);
  }

  return (
    <JobContext.Provider value={{ ...state, startJob, publish, cancelPreview, dismiss }}>
      {children}
    </JobContext.Provider>
  );
}

export function useJob() {
  const ctx = useContext(JobContext);
  if (!ctx) throw new Error("useJob must be used within JobProvider");
  return ctx;
}
