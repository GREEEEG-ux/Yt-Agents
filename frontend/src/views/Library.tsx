import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader, SectionLabel } from "@/components/PageHeader";
import { EmptyState } from "@/components/HistoryRow";
import { LibraryCard } from "@/components/VideoCard";
import { api, type HistoryEntry } from "@/lib/api";

export function Library() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const reload = () => api.getHistory().then(setHistory);

  useEffect(() => {
    reload();
  }, []);

  async function publish(videoId: string) {
    if (!confirm("Rendre cette vidéo PUBLIQUE sur YouTube ? Cette action est visible par tout le monde.")) return;
    await api.publish(videoId, "public");
    reload();
  }

  async function remove(videoId: string) {
    if (!confirm("Supprimer cette entrée de l'historique ? (la vidéo YouTube n'est pas supprimée)")) return;
    await api.deleteHistoryEntry(videoId);
    reload();
  }

  return (
    <section>
      <PageHeader title="Bibliothèque" intro="Toutes tes vidéos générées, prêtes à publier ou à retirer." />

      {history.length === 0 ? (
        <EmptyState>Aucune vidéo encore.</EmptyState>
      ) : (
        <>
          <SectionLabel>{history.length} vidéo{history.length > 1 ? "s" : ""}</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {history.map((entry) => (
              <LibraryCard
                key={entry.video_id}
                videoId={entry.video_id}
                title={entry.title}
                subtitle={`${entry.topic} · ${new Date(entry.date).toLocaleDateString("fr-FR")}`}
                badge={
                  <span className="text-[10px] font-medium bg-black/70 text-white px-2 py-0.5 rounded-md backdrop-blur-sm">
                    Privé
                  </span>
                }
                actions={
                  <>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => publish(entry.video_id)}>
                      Rendre public
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => remove(entry.video_id)}>
                      Supprimer
                    </Button>
                  </>
                }
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
