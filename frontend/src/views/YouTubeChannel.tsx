import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader, SectionLabel } from "@/components/PageHeader";
import { EmptyState } from "@/components/HistoryRow";
import { api, type ChannelVideo } from "@/lib/api";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  public: "Public",
  unlisted: "Non répertorié",
  private: "Privé",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "text-[10px] font-medium px-2 py-0.5 rounded-md backdrop-blur-sm",
        status === "public" ? "bg-emerald-600/85 text-white" : "bg-black/70 text-white"
      )}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function YouTubeChannel({ onResume }: { onResume: (url: string) => void }) {
  const [videos, setVideos] = useState<ChannelVideo[]>([]);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(pageToken?: string | null) {
    const res = await api.getChannelVideos(pageToken);
    if (res.error) {
      setError(res.error);
      return;
    }
    setVideos((prev) => (pageToken ? [...prev, ...res.items] : res.items));
    setNextToken(res.next_page_token);
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  async function loadMore() {
    if (!nextToken) return;
    setLoadingMore(true);
    await load(nextToken).finally(() => setLoadingMore(false));
  }

  return (
    <section>
      <PageHeader
        title="Chaîne YouTube"
        intro="Toutes les vidéos publiées sur ta chaîne, en direct depuis YouTube — reprends-en une comme source."
      />

      {loading && <div className="text-muted-foreground text-sm">Chargement de la chaîne...</div>}

      {error && (
        <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          Impossible de charger la chaîne : {error}
          <br />
          Vérifie que la connexion YouTube est bien autorisée (Réglages).
        </div>
      )}

      {!loading && !error && videos.length === 0 && <EmptyState>Aucune vidéo sur cette chaîne.</EmptyState>}

      {!loading && videos.length > 0 && (
        <>
          <SectionLabel>{videos.length} vidéo{videos.length > 1 ? "s" : ""}</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {videos.map((v) => (
              <div key={v.video_id} className="rounded-xl border border-border bg-card overflow-hidden">
                <a
                  href={`https://youtu.be/${v.video_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="group block relative aspect-video bg-muted overflow-hidden"
                >
                  <img
                    src={v.thumbnail}
                    alt={v.title}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute top-2 left-2">
                    <StatusBadge status={v.privacy_status} />
                  </div>
                </a>
                <div className="p-3">
                  <div className="text-[13px] font-medium truncate">{v.title}</div>
                  <div className="text-[11px] text-muted-foreground truncate mt-0.5 mb-2.5">
                    {new Date(v.published_at).toLocaleDateString("fr-FR")} · {v.view_count} vues · {v.like_count} likes
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => onResume(`https://youtu.be/${v.video_id}`)}
                  >
                    Reprendre comme source
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {nextToken && (
            <div className="flex justify-center">
              <Button variant="outline" disabled={loadingMore} onClick={loadMore}>
                {loadingMore ? "Chargement..." : "Charger plus"}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
