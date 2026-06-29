import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/StatCard";
import { HistoryRow, EmptyState } from "@/components/HistoryRow";
import { api, type HistoryEntry } from "@/lib/api";

export function Home({ onCreate }: { onCreate: () => void }) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    api.getHistory().then(setHistory);
  }, []);

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold tracking-tight">Aperçu</h1>
        <Button onClick={onCreate}>Nouvelle génération</Button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-8">
        <StatCard label="Vidéos générées" value={history.length} />
      </div>

      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3">
        Dernières vidéos
      </div>
      <Card className="py-0 divide-y divide-border">
        {history.length === 0 && <EmptyState>Aucune vidéo encore.</EmptyState>}
        {history.slice(0, 5).map((entry) => (
          <HistoryRow
            key={entry.video_id}
            title={entry.title}
            subtitle={`${entry.topic} · ${new Date(entry.date).toLocaleString("fr-FR")}`}
            videoId={entry.video_id}
          />
        ))}
      </Card>
    </section>
  );
}
