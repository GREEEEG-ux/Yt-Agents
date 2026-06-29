import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HistoryRow, EmptyState } from "@/components/HistoryRow";
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
      <h1 className="text-lg font-semibold tracking-tight mb-6">Bibliothèque</h1>
      <Card className="py-0 divide-y divide-border">
        {history.length === 0 && <EmptyState>Aucune vidéo encore.</EmptyState>}
        {history.map((entry) => (
          <HistoryRow
            key={entry.video_id}
            title={entry.title}
            subtitle={`${entry.topic} · ${new Date(entry.date).toLocaleString("fr-FR")}`}
            videoId={entry.video_id}
            actions={
              <>
                <Button size="sm" variant="outline" onClick={() => publish(entry.video_id)}>
                  Rendre public
                </Button>
                <Button size="sm" variant="outline" onClick={() => remove(entry.video_id)}>
                  Supprimer
                </Button>
              </>
            }
          />
        ))}
      </Card>
    </section>
  );
}
