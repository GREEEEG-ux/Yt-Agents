import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/StatCard";
import { PageHeader, SectionLabel } from "@/components/PageHeader";
import { HistoryRow, EmptyState } from "@/components/HistoryRow";
import { api, type HistoryEntry } from "@/lib/api";

export function Home({ onCreate }: { onCreate: () => void }) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    api.getHistory().then(setHistory);
  }, []);

  return (
    <section>
      <PageHeader
        title="Aperçu"
        intro="Génère, prévisualise et publie des vidéos courtes assistées par IA."
        action={<Button onClick={onCreate}>Nouvelle génération</Button>}
      />

      <div className="grid grid-cols-3 gap-4 mb-12">
        <StatCard label="Vidéos générées" value={history.length} />
      </div>

      <SectionLabel>Dernières vidéos</SectionLabel>
      <Card className="py-0 divide-y divide-border shadow-none overflow-hidden">
        {history.length === 0 && <EmptyState>Aucune vidéo pour l'instant.</EmptyState>}
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
