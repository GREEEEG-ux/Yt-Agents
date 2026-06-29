import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { api, type SeoResult } from "@/lib/api";
import { Copy, Check, Loader2, Sparkles } from "lucide-react";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
      {children}
    </Label>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
    >
      {copied ? <Check className="size-3 text-green-500" /> : <Copy className="size-3" />}
    </Button>
  );
}

function ResultBlock({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <FieldLabel>{label}</FieldLabel>
        <CopyButton value={value} />
      </div>
      {children}
    </div>
  );
}

export function SeoTool() {
  const [topic, setTopic] = useState("");
  const [niche, setNiche] = useState("");
  const [script, setScript] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SeoResult | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.seo({ topic, script, niche });
      setResult(res);
    } catch {
      setError("Échec de la génération SEO. Vérifie que le backend et la clé Groq sont OK.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="max-w-lg">
      <h1 className="text-lg font-semibold tracking-tight mb-1">Outil SEO</h1>
      <p className="text-[12px] text-muted-foreground mb-6">
        Titre, description, hashtags et tags optimisés pour YouTube Shorts. Titre et hashtags
        toujours en anglais ; la niche est déduite automatiquement si tu la laisses vide.
      </p>

      <Card className="p-5 gap-4 border-l-2 border-l-primary">
        <div className="space-y-1.5">
          <FieldLabel>Sujet</FieldLabel>
          <Input
            placeholder="Ex : scène culte de Two and a Half Men"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <FieldLabel>Niche (optionnel)</FieldLabel>
          <Input
            placeholder="anime, cinéma, IA, sitcom... (vide = auto)"
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <FieldLabel>Script / transcription</FieldLabel>
          <Textarea
            placeholder="Colle le script ou la transcription de la vidéo..."
            rows={6}
            value={script}
            onChange={(e) => setScript(e.target.value)}
          />
        </div>

        <Button
          className="w-full"
          disabled={loading || (!topic.trim() && !script.trim())}
          onClick={run}
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Génération...
            </>
          ) : (
            <>
              <Sparkles className="size-4" /> Générer le SEO
            </>
          )}
        </Button>
        {error && <p className="text-[12px] text-destructive">{error}</p>}
      </Card>

      {result && (
        <Card className="p-5 gap-5 mt-6">
          <ResultBlock label="Titre" value={result.title}>
            <p className="text-[13px] font-medium">{result.title}</p>
            <p className="text-[10px] text-muted-foreground">{result.title.length} / 100 caractères</p>
          </ResultBlock>

          <ResultBlock label="Description" value={result.description}>
            <p className="text-[12px] whitespace-pre-wrap text-muted-foreground">
              {result.description}
            </p>
          </ResultBlock>

          <ResultBlock
            label="3 hashtags principaux"
            value={result.hashtags_main.join(" ")}
          >
            <div className="flex flex-wrap gap-1.5">
              {result.hashtags_main.map((h) => (
                <Badge key={h}>{h}</Badge>
              ))}
            </div>
          </ResultBlock>

          <ResultBlock
            label="5 hashtags secondaires"
            value={result.hashtags_secondary.join(" ")}
          >
            <div className="flex flex-wrap gap-1.5">
              {result.hashtags_secondary.map((h) => (
                <Badge key={h} variant="secondary">
                  {h}
                </Badge>
              ))}
            </div>
          </ResultBlock>

          <ResultBlock label="10 tags YouTube" value={result.tags.join(", ")}>
            <div className="flex flex-wrap gap-1.5">
              {result.tags.map((t) => (
                <Badge key={t} variant="outline">
                  {t}
                </Badge>
              ))}
            </div>
          </ResultBlock>

          {result.hooks.length > 0 && (
            <ResultBlock label="3 variantes de hook" value={result.hooks.join("\n")}>
              <ul className="space-y-1.5">
                {result.hooks.map((h, i) => (
                  <li key={i} className="text-[12px] flex gap-2">
                    <span className="text-primary font-mono">{i + 1}.</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </ResultBlock>
          )}
        </Card>
      )}
    </section>
  );
}
