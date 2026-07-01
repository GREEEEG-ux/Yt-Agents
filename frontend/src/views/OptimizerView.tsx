import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api, type OptimizerReport } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { BarChart3, Loader2, AlertTriangle, TrendingUp, TrendingDown, Check } from "lucide-react";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">{children}</h2>;
}

function Bullets({ items }: { items?: string[] }) {
  if (!items || items.length === 0) return <p className="text-[12px] text-muted-foreground">—</p>;
  return (
    <ul className="space-y-1">
      {items.map((it, i) => (
        <li key={i} className="text-[12px] flex gap-2">
          <span className="text-primary">•</span>
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

function priorityVariant(p?: string): "default" | "secondary" | "destructive" {
  if (p === "high") return "destructive";
  if (p === "medium") return "default";
  return "secondary";
}

function UpdateRow({ u }: { u: NonNullable<OptimizerReport["videos_to_update"]>[number] }) {
  const [state, setState] = useState<"idle" | "applying" | "done" | "error">("idle");
  async function apply() {
    setState("applying");
    const res = await api.applyUpdate({
      video_id: u.video_id,
      title: u.new_title || undefined,
      description: u.new_description || undefined,
    });
    setState(res.error ? "error" : "done");
  }
  return (
    <div className="border rounded-md p-3 space-y-2">
      <div className="text-[12px]">
        <span className="text-muted-foreground line-through">{u.current_title}</span>
        <span className="mx-1.5">→</span>
        <span className="font-medium">{u.new_title}</span>
      </div>
      {u.reason && <p className="text-[11px] text-muted-foreground">{u.reason}</p>}
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" disabled={state !== "idle"} onClick={apply}>
          {state === "applying" && <Loader2 className="size-3 animate-spin" />}
          {state === "done" ? (
            <>
              <Check className="size-3 text-green-500" /> Appliqué
            </>
          ) : state === "error" ? (
            "Échec"
          ) : (
            "Appliquer sur YouTube"
          )}
        </Button>
        <a
          href={`https://youtu.be/${u.video_id}`}
          target="_blank"
          rel="noreferrer"
          className="text-[11px] text-primary hover:underline"
        >
          voir la vidéo →
        </a>
      </div>
    </div>
  );
}

export function OptimizerView() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<OptimizerReport | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.optimizer({ limit: 20, days: 90 });
      if (res.error) setError(res.error);
      else setReport(res);
    } catch {
      setError("Échec de l'analyse. Backend, autorisation YouTube et clé Groq OK ?");
    } finally {
      setLoading(false);
    }
  }

  const dq = report?.data_quality;
  const ga = report?.global_analysis;
  const seo = report?.seo_recommendations;
  const sum = report?.summary;

  return (
    <section className="max-w-2xl">
      <PageHeader
        title="Optimizer"
        intro="Analyse rétention, trafic et engagement de tes Shorts, puis propose des améliorations basées sur tes vraies données."
      />

      <Button disabled={loading} onClick={run}>
        {loading ? <Loader2 className="size-4 animate-spin" /> : <BarChart3 className="size-4" />}
        {loading ? "Analyse en cours..." : "Analyser mes Shorts"}
      </Button>
      {error && <p className="text-[12px] text-destructive mt-2">{error}</p>}

      {report && (
        <div className="space-y-5 mt-6">
          {/* Qualité des données */}
          {(dq?.sample_size_warning || report._meta?.analytics_available === false) && (
            <Card className="p-4 border-l-2 border-l-yellow-500 gap-2">
              <div className="flex items-center gap-2 text-[12px] font-medium">
                <AlertTriangle className="size-4 text-yellow-500" /> Qualité des données
              </div>
              {report._meta?.analytics_available === false && (
                <p className="text-[12px] text-muted-foreground">
                  Métriques Analytics indisponibles (rétention, sources de trafic) — autorise
                  l'accès Analytics (re-connexion YouTube) pour une analyse complète.
                </p>
              )}
              {dq?.sample_size_warning && (
                <p className="text-[12px] text-muted-foreground">
                  Échantillon faible : conclusions à prendre comme des hypothèses.
                </p>
              )}
              {dq?.missing_or_unreliable_fields && dq.missing_or_unreliable_fields.length > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  Champs manquants : {dq.missing_or_unreliable_fields.join(", ")}
                </p>
              )}
            </Card>
          )}

          {/* Résumé / action principale */}
          {sum && (
            <Card className="p-4 gap-2 border-l-2 border-l-primary">
              <div className="flex items-center justify-between">
                <SectionTitle>Action prioritaire</SectionTitle>
                <Badge variant={priorityVariant(sum.priority_level)}>{sum.priority_level}</Badge>
              </div>
              <p className="text-[13px] font-medium">{sum.main_action_to_take}</p>
              <Bullets items={sum.next_3_actions} />
            </Card>
          )}

          {/* Forces / faiblesses */}
          {ga && (
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4 gap-2">
                <div className="flex items-center gap-2 text-[12px] font-medium text-green-600">
                  <TrendingUp className="size-4" /> Forces
                </div>
                <Bullets items={ga.main_strengths} />
              </Card>
              <Card className="p-4 gap-2">
                <div className="flex items-center gap-2 text-[12px] font-medium text-destructive">
                  <TrendingDown className="size-4" /> Faiblesses
                </div>
                <Bullets items={ga.main_weaknesses} />
              </Card>
            </div>
          )}

          {/* Top vidéos */}
          {report.top_videos && report.top_videos.length > 0 && (
            <Card className="p-4 gap-3">
              <SectionTitle>À reproduire (top vidéos)</SectionTitle>
              {report.top_videos.map((v) => (
                <div key={v.video_id} className="text-[12px] border-b last:border-0 pb-2 last:pb-0">
                  <div className="font-medium">{v.title}</div>
                  <div className="text-muted-foreground text-[11px]">{v.reason}</div>
                  <Bullets items={v.what_to_repeat} />
                </div>
              ))}
            </Card>
          )}

          {/* Sous-performantes */}
          {report.underperforming_videos && report.underperforming_videos.length > 0 && (
            <Card className="p-4 gap-3">
              <SectionTitle>À corriger</SectionTitle>
              {report.underperforming_videos.map((v) => (
                <div key={v.video_id} className="text-[12px] border-b last:border-0 pb-2 last:pb-0">
                  <div className="font-medium">{v.title}</div>
                  <div className="text-muted-foreground text-[11px]">
                    {v.problem} {v.root_cause && <Badge variant="outline">{v.root_cause}</Badge>}
                  </div>
                  <Bullets items={v.fixes} />
                </div>
              ))}
            </Card>
          )}

          {/* Recommandations SEO */}
          {seo && (
            <Card className="p-4 gap-3">
              <SectionTitle>Recommandations SEO</SectionTitle>
              <div>
                <div className="text-[11px] text-muted-foreground mb-1">Patterns de titre</div>
                <Bullets items={seo.recommended_title_patterns} />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {seo.recommended_hashtags?.map((h) => (
                  <Badge key={h}>{h}</Badge>
                ))}
                {seo.hashtags_to_avoid?.map((h) => (
                  <Badge key={h} variant="outline" className="line-through opacity-60">
                    {h}
                  </Badge>
                ))}
              </div>
            </Card>
          )}

          {/* Idées de vidéos */}
          {report.content_strategy?.new_video_ideas &&
            report.content_strategy.new_video_ideas.length > 0 && (
              <Card className="p-4 gap-3">
                <SectionTitle>Idées de prochaines vidéos</SectionTitle>
                {report.content_strategy.new_video_ideas.map((idea, i) => (
                  <div key={i} className="text-[12px] border-b last:border-0 pb-2 last:pb-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{idea.idea}</span>
                      <Badge variant="secondary">{idea.estimated_potential}</Badge>
                    </div>
                    {idea.suggested_title && (
                      <div className="text-[11px] mt-0.5">Titre : {idea.suggested_title}</div>
                    )}
                    {idea.suggested_hook && (
                      <div className="text-[11px] text-muted-foreground">Hook : {idea.suggested_hook}</div>
                    )}
                  </div>
                ))}
              </Card>
            )}

          {/* Vidéos à mettre à jour */}
          {report.videos_to_update && report.videos_to_update.length > 0 && (
            <Card className="p-4 gap-3">
              <SectionTitle>Vidéos à mettre à jour</SectionTitle>
              {report.videos_to_update.map((u) => (
                <UpdateRow key={u.video_id} u={u} />
              ))}
            </Card>
          )}
        </div>
      )}
    </section>
  );
}
