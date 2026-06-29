import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { api, type GenerateRequest, type JobMessage } from "@/lib/api";

export type JobStatus = "idle" | "running" | "done" | "error" | "skipped";

export type JobState = {
  status: JobStatus;
  percent: number;
  lastMessage: string;
  log: string[];
  result: { video_id: string; title: string } | null;
};

type JobContextValue = JobState & {
  startJob: (req: GenerateRequest, file?: File | null) => Promise<void>;
  dismiss: () => void;
};

const initialState: JobState = {
  status: "idle",
  percent: 0,
  lastMessage: "",
  log: [],
  result: null,
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
    setState({ status: "running", percent: 0, lastMessage: "Démarrage...", log: [], result: null });

    let finalReq = req;
    if (file) {
      setState((s) => ({ ...s, lastMessage: "Envoi du fichier local...", log: [...s.log, "Envoi du fichier local..."] }));
      const uploaded = await api.uploadLocal(file);
      finalReq = { ...req, file_path: uploaded.file_path };
    }

    const { job_id } = await api.generate(finalReq);
    wsRef.current = api.watchJob(job_id, handleMessage);
  }

  function dismiss() {
    setState(initialState);
  }

  return (
    <JobContext.Provider value={{ ...state, startJob, dismiss }}>{children}</JobContext.Provider>
  );
}

export function useJob() {
  const ctx = useContext(JobContext);
  if (!ctx) throw new Error("useJob must be used within JobProvider");
  return ctx;
}
