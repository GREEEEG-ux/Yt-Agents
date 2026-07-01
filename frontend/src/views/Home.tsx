import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { VideoCard, Rail, thumbUrl } from "@/components/VideoCard";
import { api, type HistoryEntry } from "@/lib/api";

function Hero({ latest, onCreate }: { latest?: HistoryEntry; onCreate: () => void }) {
  return (
    <div className="relative rounded-2xl overflow-hidden border border-border aspect-[21/8] mb-10">
      {latest ? (
        <img
          src={thumbUrl(latest.video_id)}
          alt=""
          onError={(e) => {
            const yt = `https://i.ytimg.com/vi/${latest.video_id}/hqdefault.jpg`;
            if (e.currentTarget.src !== yt) e.currentTarget.src = yt;
          }}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-background to-background" />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/20" />
      <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />

      <div className="relative h-full flex flex-col justify-end p-8 max-w-xl gap-3">
        <div className="text-[11px] uppercase tracking-[0.14em] text-primary font-medium">
          Studio de création
        </div>
        <h1 className="font-display text-3xl leading-tight">
          {latest ? latest.title : "Crée ta première vidéo"}
        </h1>
        <p className="text-muted-foreground text-sm max-w-md">
          {latest
            ? `Dernière génération · ${latest.topic}`
            : "Génère un Short assisté par IA — script, voix, sous-titres et montage, prêt à publier."}
        </p>
        <div className="flex items-center gap-3 mt-1">
          <Button onClick={onCreate} className="gap-2">
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            Nouvelle génération
          </Button>
          {latest && (
            <a
              href={`https://youtu.be/${latest.video_id}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 h-9 px-4 rounded-md border border-border bg-elevated/60 hover:bg-elevated text-sm transition-colors"
            >
              Voir la dernière
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export function Home({ onCreate }: { onCreate: () => void }) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    api.getHistory().then(setHistory);
  }, []);

  const latest = history[0];

  return (
    <section>
      <Hero latest={latest} onCreate={onCreate} />

      {history.length === 0 ? (
        <div className="text-center text-muted-foreground text-sm py-16 border border-dashed border-border rounded-xl">
          Aucune vidéo pour l'instant. Lance ta première génération.
        </div>
      ) : (
        <Rail title="Vos dernières vidéos">
          {history.map((entry) => (
            <VideoCard
              key={entry.video_id}
              videoId={entry.video_id}
              title={entry.title}
              subtitle={`${entry.topic} · ${new Date(entry.date).toLocaleDateString("fr-FR")}`}
            />
          ))}
        </Rail>
      )}
    </section>
  );
}
