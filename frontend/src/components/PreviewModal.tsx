import { useJob } from "@/lib/JobContext";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2 } from "lucide-react";

export function PreviewModal() {
  const { status, previewUrl, previewTitle, publish, cancelPreview } = useJob();

  if (status !== "preview" || !previewUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-card border rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="text-[13px] font-semibold">Prévisualisation</div>
          <Button variant="ghost" size="icon-xs" onClick={cancelPreview}>
            <X className="size-3.5" />
          </Button>
        </div>

        <div className="p-4 flex flex-col items-center gap-3">
          <video
            key={previewUrl}
            src={previewUrl}
            controls
            autoPlay
            loop
            className="rounded-lg max-h-[60vh] w-auto bg-black"
          />
          {previewTitle && (
            <div className="text-[12px] text-muted-foreground text-center line-clamp-2">
              {previewTitle}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 px-4 py-3 border-t">
          <Button variant="outline" className="flex-1" onClick={cancelPreview}>
            Annuler
          </Button>
          <Button className="flex-1" onClick={publish}>
            <Upload className="size-4" />
            Publier sur YouTube
          </Button>
        </div>
      </div>
    </div>
  );
}

export function PublishingOverlay() {
  const { status } = useJob();
  if (status !== "publishing") return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border rounded-xl shadow-2xl px-6 py-5 flex items-center gap-3">
        <Loader2 className="size-4 animate-spin text-primary" />
        <span className="text-[13px]">Publication sur YouTube...</span>
      </div>
    </div>
  );
}
