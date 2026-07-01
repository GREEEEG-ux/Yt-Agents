import { useJob } from "@/lib/JobContext";
import { Button } from "@/components/ui/button";

function Spinner() {
  return (
    <svg className="size-3.5 animate-spin text-foreground" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function Check() {
  return (
    <svg className="size-3.5 text-[#346538]" viewBox="0 0 24 24" fill="none">
      <path d="M4 12.5l5 5 11-11" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Alert() {
  return (
    <svg className="size-3.5 text-[#9f2f2d]" viewBox="0 0 24 24" fill="none">
      <path d="M12 8v5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="12" cy="17" r="1.3" fill="currentColor" />
      <circle cx="12" cy="12" r="9.2" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function Close() {
  return (
    <svg className="size-3.5" viewBox="0 0 24 24" fill="none">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function ProgressDock() {
  const { status, percent, lastMessage, result, dismiss } = useJob();

  if (status === "idle" || status === "preview" || status === "publishing") return null;

  const running = status === "running";
  const isError = status === "error";

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80">
      <div className="bg-card border border-border rounded-lg overflow-hidden shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
        <div className="h-px bg-border">
          <div
            className={
              "h-full transition-all duration-500 " +
              (isError ? "bg-[#9f2f2d]" : status === "done" ? "bg-[#346538]" : "bg-primary")
            }
            style={{ width: `${running ? percent : 100}%` }}
          />
        </div>

        <div className="p-4 flex items-start gap-3">
          <div className="mt-0.5 shrink-0">
            {running && <Spinner />}
            {status === "done" && <Check />}
            {(isError || status === "skipped") && <Alert />}
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-medium">
              {running
                ? `Génération · ${percent}%`
                : status === "done"
                  ? "Vidéo prête"
                  : status === "skipped"
                    ? "Génération arrêtée"
                    : "Erreur"}
            </div>
            <div className="text-[11px] text-muted-foreground truncate mt-0.5">{lastMessage}</div>

            {status === "done" && result && (
              <a
                href={`https://youtu.be/${result.video_id}`}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-foreground underline underline-offset-4 decoration-border mt-2 inline-block"
              >
                Voir sur YouTube
              </a>
            )}
          </div>

          {!running && (
            <Button variant="ghost" size="icon-xs" onClick={dismiss} className="shrink-0 -mr-1 -mt-1 text-muted-foreground">
              <Close />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
