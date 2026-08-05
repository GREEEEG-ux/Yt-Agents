import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { api, type VideoInfo } from "@/lib/api";
import { extractYoutubeId } from "@/lib/youtube";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">{children}</Label>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2"
    >
      {copied ? "Copié" : "Copier"}
    </button>
  );
}

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Récupère titre / bio (description) / hashtags de la vidéo source, et fournit
 * un sélecteur visuel de segment (lecteur intégré + curseurs début/fin) qui
 * pilote `start`/`duration`.
 */
export function SourceInsight({
  url,
  start,
  duration,
  onChangeStart,
  onChangeDuration,
}: {
  url: string;
  start: number;
  duration: number;
  onChangeStart: (v: number) => void;
  onChangeDuration: (v: number) => void;
}) {
  const [info, setInfo] = useState<VideoInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const videoId = extractYoutubeId(url);

  useEffect(() => {
    if (!videoId) {
      setInfo(null);
      return;
    }
    setLoading(true);
    api
      .getVideoInfo(videoId)
      .then((res) => setInfo(res.error ? null : res))
      .finally(() => setLoading(false));
  }, [videoId]);

  if (!videoId) return null;

  const total = info?.duration_seconds ?? null;
  const end = Math.min(start + duration, total ?? start + duration);

  return (
    <div className="space-y-4 border-t pt-4">
      {loading && <div className="text-[12px] text-muted-foreground">Récupération des infos de la vidéo...</div>}

      {info && (
        <div className="space-y-3">
          <FieldLabel>Vidéo source</FieldLabel>
          <div className="rounded-lg border border-border bg-card p-3 space-y-2.5">
            <div className="text-[13px] font-medium">{info.title}</div>

            {info.description && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Bio / description</span>
                  <CopyButton text={info.description} />
                </div>
                <p className="text-[12px] text-muted-foreground whitespace-pre-wrap line-clamp-4">
                  {info.description}
                </p>
              </div>
            )}

            {info.hashtags.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Hashtags</span>
                  <CopyButton text={info.hashtags.join(" ")} />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {info.hashtags.map((h) => (
                    <span key={h} className="text-[11px] px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
                      {h}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <FieldLabel>Recadrer le passage à utiliser</FieldLabel>
          <span className="text-[11px] font-mono text-muted-foreground">
            {fmt(start)} → {fmt(end)} ({fmt(duration)})
          </span>
        </div>

        <div className="rounded-lg overflow-hidden border border-border aspect-video bg-black">
          <iframe
            key={`${videoId}-${start}`}
            className="w-full h-full"
            src={`https://www.youtube.com/embed/${videoId}?start=${Math.floor(start)}&end=${Math.floor(end)}`}
            title="Aperçu du segment"
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
        </div>

        {total ? (
          <div className="space-y-3 pt-1">
            <div>
              <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                <span>Début</span>
                <span>{fmt(start)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={Math.max(0, total - 1)}
                value={start}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  onChangeStart(Math.min(v, total - 1));
                }}
                className="w-full accent-primary"
              />
            </div>
            <div>
              <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                <span>Durée</span>
                <span>{fmt(duration)}</span>
              </div>
              <input
                type="range"
                min={5}
                max={Math.min(180, total - start)}
                value={duration}
                onChange={(e) => onChangeDuration(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Durée totale de la vidéo : {fmt(total)}. Le lecteur ci-dessus rejoue automatiquement le passage sélectionné.
            </p>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            Durée totale inconnue — règle le début/la durée manuellement ci-dessous.
          </p>
        )}
      </div>
    </div>
  );
}
