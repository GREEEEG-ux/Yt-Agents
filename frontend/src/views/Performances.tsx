import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/StatCard";
import { PageHeader } from "@/components/PageHeader";
import { HistoryRow, EmptyState } from "@/components/HistoryRow";
import { api, type StatsResponse } from "@/lib/api";

export function Performances() {
  const [data, setData] = useState<StatsResponse | null>(null);

  useEffect(() => {
    api.getStats().then(setData);
  }, []);

  if (!data) return null;

  return (
    <section>
      <PageHeader title="Performances" intro="Vues et likes agrégés depuis l'API YouTube." />
      <div className="grid grid-cols-3 gap-4 mb-12">
        <StatCard label="Vidéos" value={data.totals.videos} />
        <StatCard label="Vues totales" value={data.totals.views} />
        <StatCard label="Likes totaux" value={data.totals.likes} />
      </div>
      <Card className="py-0 divide-y divide-border shadow-none overflow-hidden">
        {data.videos.length === 0 && <EmptyState>Aucune donnée.</EmptyState>}
        {data.videos.map((v) => (
          <HistoryRow
            key={v.video_id}
            title={v.title}
            subtitle={`${v.privacyStatus ?? "—"} · ${new Date(v.date).toLocaleDateString("fr-FR")}`}
            actions={
              <div className="font-mono text-xs text-muted-foreground">
                {v.viewCount ?? "—"} vues · {v.likeCount ?? "—"} likes
              </div>
            }
          />
        ))}
      </Card>
    </section>
  );
}
