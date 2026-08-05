import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, SectionLabel } from "@/components/PageHeader";
import { EmptyState } from "@/components/HistoryRow";
import {
  api,
  type ChannelVideo,
  type DiscoverVideo,
  type SearchDuration,
  type SearchOrder,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  public: "Public",
  unlisted: "Non répertorié",
  private: "Privé",
};

function Badge({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "positive" }) {
  return (
    <span
      className={cn(
        "text-[10px] font-medium px-2 py-0.5 rounded-md backdrop-blur-sm",
        tone === "positive" ? "bg-emerald-600/85 text-white" : "bg-black/70 text-white"
      )}
    >
      {children}
    </span>
  );
}

function VideoTile({
  videoId,
  title,
  thumbnail,
  meta,
  badge,
  onResume,
}: {
  videoId: string;
  title: string;
  thumbnail: string;
  meta: string;
  badge?: React.ReactNode;
  onResume: (url: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <a
        href={`https://youtu.be/${videoId}`}
        target="_blank"
        rel="noreferrer"
        className="group block relative aspect-video bg-muted overflow-hidden"
      >
        <img
          src={thumbnail}
          alt={title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {badge && <div className="absolute top-2 left-2">{badge}</div>}
      </a>
      <div className="p-3">
        <div className="text-[13px] font-medium truncate">{title}</div>
        <div className="text-[11px] text-muted-foreground truncate mt-0.5 mb-2.5">{meta}</div>
        <Button size="sm" variant="outline" className="w-full" onClick={() => onResume(`https://youtu.be/${videoId}`)}>
          Reprendre comme source
        </Button>
      </div>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">{children}</div>;
}

function ErrorNote({ error }: { error: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
      Impossible de charger le contenu : {error}
      <br />
      Vérifie que la connexion YouTube est bien autorisée (Réglages).
    </div>
  );
}

function LoadMore({ show, loading, onClick }: { show: boolean; loading: boolean; onClick: () => void }) {
  if (!show) return null;
  return (
    <div className="flex justify-center">
      <Button variant="outline" disabled={loading} onClick={onClick}>
        {loading ? "Chargement..." : "Charger plus"}
      </Button>
    </div>
  );
}

// --- Ma chaîne -----------------------------------------------------------

function MyChannelTab({ onResume }: { onResume: (url: string) => void }) {
  const [videos, setVideos] = useState<ChannelVideo[]>([]);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(pageToken?: string | null) {
    const res = await api.getChannelVideos(pageToken);
    if (res.error) return setError(res.error);
    setVideos((prev) => (pageToken ? [...prev, ...res.items] : res.items));
    setNextToken(res.next_page_token);
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-muted-foreground text-sm">Chargement...</div>;
  if (error) return <ErrorNote error={error} />;
  if (videos.length === 0) return <EmptyState>Aucune vidéo sur cette chaîne.</EmptyState>;

  return (
    <>
      <SectionLabel>{videos.length} vidéo{videos.length > 1 ? "s" : ""}</SectionLabel>
      <Grid>
        {videos.map((v) => (
          <VideoTile
            key={v.video_id}
            videoId={v.video_id}
            title={v.title}
            thumbnail={v.thumbnail}
            meta={`${new Date(v.published_at).toLocaleDateString("fr-FR")} · ${v.view_count} vues · ${v.like_count} likes`}
            badge={<Badge tone={v.privacy_status === "public" ? "positive" : "default"}>{STATUS_LABEL[v.privacy_status] ?? v.privacy_status}</Badge>}
            onResume={onResume}
          />
        ))}
      </Grid>
      <LoadMore
        show={!!nextToken}
        loading={loadingMore}
        onClick={async () => {
          setLoadingMore(true);
          await load(nextToken).finally(() => setLoadingMore(false));
        }}
      />
    </>
  );
}

// --- Tendances -------------------------------------------------------------

const REGIONS = [
  { id: "FR", label: "France" },
  { id: "US", label: "États-Unis" },
  { id: "GB", label: "Royaume-Uni" },
  { id: "CA", label: "Canada" },
  { id: "DE", label: "Allemagne" },
  { id: "JP", label: "Japon" },
];

function TrendingTab({ onResume }: { onResume: (url: string) => void }) {
  const [region, setRegion] = useState("FR");
  const [videos, setVideos] = useState<DiscoverVideo[]>([]);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(pageToken?: string | null) {
    const res = await api.getTrending(region, pageToken);
    if (res.error) return setError(res.error);
    setVideos((prev) => (pageToken ? [...prev, ...res.items] : res.items));
    setNextToken(res.next_page_token);
  }

  useEffect(() => {
    setLoading(true);
    setError(null);
    load().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region]);

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <SectionLabel>Tendances</SectionLabel>
        <Select value={region} onValueChange={setRegion}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REGIONS.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading && <div className="text-muted-foreground text-sm">Chargement...</div>}
      {!loading && error && <ErrorNote error={error} />}
      {!loading && !error && videos.length === 0 && <EmptyState>Aucune tendance trouvée.</EmptyState>}
      {!loading && !error && videos.length > 0 && (
        <>
          <Grid>
            {videos.map((v) => (
              <VideoTile
                key={v.video_id}
                videoId={v.video_id}
                title={v.title}
                thumbnail={v.thumbnail}
                meta={`${v.channel_title} · ${v.view_count?.toLocaleString("fr-FR") ?? "—"} vues`}
                onResume={onResume}
              />
            ))}
          </Grid>
          <LoadMore
            show={!!nextToken}
            loading={loadingMore}
            onClick={async () => {
              setLoadingMore(true);
              await load(nextToken).finally(() => setLoadingMore(false));
            }}
          />
        </>
      )}
    </>
  );
}

// --- Recherche ---------------------------------------------------------

function SearchTab({ onResume }: { onResume: (url: string) => void }) {
  const [query, setQuery] = useState("");
  const [duration, setDuration] = useState<SearchDuration>("any");
  const [order, setOrder] = useState<SearchOrder>("relevance");
  const [videos, setVideos] = useState<DiscoverVideo[]>([]);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  async function load(pageToken?: string | null) {
    const res = await api.searchYoutube(query, duration, order, pageToken);
    if (res.error) return setError(res.error);
    setVideos((prev) => (pageToken ? [...prev, ...res.items] : res.items));
    setNextToken(res.next_page_token);
  }

  async function runSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    await load().finally(() => setLoading(false));
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-2 mb-2">
        <Input
          placeholder="Rechercher sur YouTube..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && runSearch()}
          className="flex-1"
        />
        <Select value={duration} onValueChange={(v) => setDuration(v as SearchDuration)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Toutes durées</SelectItem>
            <SelectItem value="short">Shorts / courtes (&lt; 4 min)</SelectItem>
            <SelectItem value="medium">Moyennes (4-20 min)</SelectItem>
            <SelectItem value="long">Longues (&gt; 20 min)</SelectItem>
          </SelectContent>
        </Select>
        <Select value={order} onValueChange={(v) => setOrder(v as SearchOrder)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="relevance">Pertinence</SelectItem>
            <SelectItem value="viewCount">Plus vues</SelectItem>
            <SelectItem value="date">Plus récentes</SelectItem>
            <SelectItem value="rating">Mieux notées</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={runSearch} disabled={loading || !query.trim()}>
          {loading ? "..." : "Rechercher"}
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground mb-5">
        « Shorts / courtes » filtre les vidéos de moins de 4 min — l'API YouTube n'expose pas de filtre Shorts exact, c'est l'approximation la plus proche.
      </p>

      {error && <ErrorNote error={error} />}
      {!error && searched && !loading && videos.length === 0 && <EmptyState>Aucun résultat.</EmptyState>}
      {!error && videos.length > 0 && (
        <>
          <Grid>
            {videos.map((v) => (
              <VideoTile
                key={v.video_id}
                videoId={v.video_id}
                title={v.title}
                thumbnail={v.thumbnail}
                meta={`${v.channel_title} · ${v.view_count?.toLocaleString("fr-FR") ?? "—"} vues`}
                onResume={onResume}
              />
            ))}
          </Grid>
          <LoadMore
            show={!!nextToken}
            loading={loadingMore}
            onClick={async () => {
              setLoadingMore(true);
              await load(nextToken).finally(() => setLoadingMore(false));
            }}
          />
        </>
      )}
    </>
  );
}

// --- Shell -------------------------------------------------------------

type Tab = "mine" | "trending" | "search";

export function YouTubeChannel({ onResume }: { onResume: (url: string) => void }) {
  const [tab, setTab] = useState<Tab>("trending");

  const tabs: { id: Tab; label: string }[] = [
    { id: "trending", label: "Tendances" },
    { id: "search", label: "Recherche" },
    { id: "mine", label: "Ma chaîne" },
  ];

  return (
    <section>
      <PageHeader
        title="YouTube"
        intro="Explore les tendances et tout YouTube (vidéos et Shorts), ou reprends une vidéo de ta chaîne comme source."
      />

      <div className="flex items-center gap-1 mb-6 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "px-3 py-2 text-[13px] border-b-2 -mb-px transition-colors",
              tab === t.id ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "mine" && <MyChannelTab onResume={onResume} />}
      {tab === "trending" && <TrendingTab onResume={onResume} />}
      {tab === "search" && <SearchTab onResume={onResume} />}
    </section>
  );
}
