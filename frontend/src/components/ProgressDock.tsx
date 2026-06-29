import { useJob } from "@/lib/JobContext";
import { Button } from "@/components/ui/button";
import { X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export function ProgressDock() {
  const { status, percent, lastMessage, result, dismiss } = useJob();

  // Les états "preview" et "publishing" sont gérés par PreviewModal / PublishingOverlay.
  if (status === "idle" || status === "preview" || status === "publishing") return null;

  const running = status === "running";
  const isError = status === "error";

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80">
      <div className="bg-card border rounded-lg shadow-xl overflow-hidden">
        <div className="h-1 bg-muted">
          <div
            className={
              "h-full transition-all duration-500 " +
              (isError ? "bg-destructive" : status === "done" ? "bg-green-500" : "bg-primary")
            }
            style={{ width: `${running ? percent : 100}%` }}
          />
        </div>

        <div className="p-3.5 flex items-start gap-3">
          <div className="mt-0.5 shrink-0">
            {running && <Loader2 className="size-4 animate-spin text-primary" />}
            {status === "done" && <CheckCircle2 className="size-4 text-green-500" />}
            {(isError || status === "skipped") && <AlertCircle className="size-4 text-destructive" />}
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-medium">
              {running ? `Génération en cours · ${percent}%` : status === "done" ? "Vidéo prête" : status === "skipped" ? "Génération arrêtée" : "Erreur"}
            </div>
            <div className="text-[11px] text-muted-foreground truncate mt-0.5">{lastMessage}</div>

            {status === "done" && result && (
              <a
                href={`https://youtu.be/${result.video_id}`}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-primary hover:underline mt-1.5 inline-block"
              >
                Voir sur YouTube →
              </a>
            )}
          </div>

          {!running && (
            <Button variant="ghost" size="icon-xs" onClick={dismiss} className="shrink-0 -mr-1 -mt-1">
              <X className="size-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
