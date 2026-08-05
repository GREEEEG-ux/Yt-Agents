import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useJob } from "@/lib/JobContext";
import { SubtitlePreview } from "@/components/SubtitlePreview";
import { VoicePicker } from "@/components/VoicePicker";
import { MovieTitleInput } from "@/components/MovieTitleInput";
import { StepShell, OptionGrid, OptionCard } from "@/components/StepShell";
import { SourceInsight } from "@/components/SourceInsight";
import { extractYoutubeId } from "@/lib/youtube";
import { api } from "@/lib/api";
import { Sparkles, PenLine, Clapperboard, Library, Link2 } from "lucide-react";
import {
  type GenerateMode,
  type GenerateRequest,
  type ClipMode,
  type VideoFormat,
  type Language,
  type TranscriptionEngine,
  type VideoQuality,
  type SubtitleMode,
  type LlmEngine,
  type VoiceEngine,
} from "@/lib/api";

type ScriptMode = "manual" | "ai";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
      {children}
    </Label>
  );
}

const MODE_OPTIONS: { id: GenerateMode; title: string; subtitle: string; icon: typeof Sparkles }[] = [
  { id: "free", title: "Sujet libre", subtitle: "L'IA choisit un sujet accrocheur pour toi.", icon: Sparkles },
  { id: "topic", title: "Sujet imposé", subtitle: "Tu donnes le sujet, l'IA écrit le script.", icon: PenLine },
  { id: "film", title: "Analyse de film / série", subtitle: "Commentaire original sur une œuvre.", icon: Clapperboard },
  { id: "recap", title: "Résumé en plusieurs parties", subtitle: "Récap d'un film/série découpé en Shorts.", icon: Library },
  { id: "clip", title: "Auto-clip", subtitle: "Depuis un lien ou un fichier vidéo.", icon: Link2 },
];

type Step = "mode" | "options" | "review";

export function Create({
  initialSourceUrl,
  onConsumeInitialSourceUrl,
}: {
  initialSourceUrl?: string | null;
  onConsumeInitialSourceUrl?: () => void;
} = {}) {
  const job = useJob();

  const [step, setStep] = useState<Step>("mode");
  const [mode, setMode] = useState<GenerateMode>("free");
  const [topic, setTopic] = useState("");
  const [film, setFilm] = useState("");
  const [numParts, setNumParts] = useState(3);
  const [recapVoiceEnabled, setRecapVoiceEnabled] = useState(true);

  const [clipUrl, setClipUrl] = useState("");
  const [clipMine, setClipMine] = useState(false);

  // Vidéo choisie depuis "Chaîne YouTube" / "YouTube" -> reste sur le choix de
  // mode, mais garde la référence en attente. Le mode cliqué décide comment
  // l'utiliser (auto-clip = source directe, autres = titre en inspiration).
  const [pendingReferenceUrl, setPendingReferenceUrl] = useState<string | null>(null);
  const [referenceTitle, setReferenceTitle] = useState<string | null>(null);

  useEffect(() => {
    if (!initialSourceUrl) return;
    setPendingReferenceUrl(initialSourceUrl);
    setReferenceTitle(null);
    setStep("mode");

    const videoId = extractYoutubeId(initialSourceUrl);
    if (videoId) {
      api.getVideoInfo(videoId).then((info) => {
        if (!info.error) setReferenceTitle(info.title);
      });
    }
    onConsumeInitialSourceUrl?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSourceUrl]);

  function selectMode(id: GenerateMode) {
    setMode(id);
    if (pendingReferenceUrl) {
      if (id === "clip") {
        setClipUrl(pendingReferenceUrl);
        setClipMine(true);
      } else if (id === "topic") {
        setTopic(referenceTitle ?? "");
      } else if (id === "film" || id === "recap") {
        setFilm(referenceTitle ?? "");
      }
      setPendingReferenceUrl(null);
      setReferenceTitle(null);
    }
    setStep("options");
  }

  const [clipMode, setClipMode] = useState<ClipMode>("manual");
  const [clipStart, setClipStart] = useState(0);
  const [clipDuration, setClipDuration] = useState(30);
  const [videoFormat, setVideoFormat] = useState<VideoFormat>("short");
  const [videoQuality, setVideoQuality] = useState<VideoQuality>("best");

  const [llmEngine, setLlmEngine] = useState<LlmEngine>("groq");
  const [voiceEngine, setVoiceEngine] = useState<VoiceEngine>("piper");

  const [voice, setVoice] = useState<string | null>(null);

  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [language, setLanguage] = useState<Language>("fr");
  const [scriptMode, setScriptMode] = useState<ScriptMode>("manual");
  const [scriptText, setScriptText] = useState("");
  const [scriptTopic, setScriptTopic] = useState("");
  const [transcriptionEnabled, setTranscriptionEnabled] = useState(true);
  const [engine, setEngine] = useState<TranscriptionEngine>("whisper");

  // Sous-titres
  const [subSize, setSubSize] = useState(64);
  const [subColor, setSubColor] = useState("#FFFFFF");
  const [subMode, setSubMode] = useState<SubtitleMode>("sentence");
  const [subMaxWords, setSubMaxWords] = useState(3);

  // Prévisualiser la vidéo avant de l'envoyer sur YouTube.
  const [previewFirst, setPreviewFirst] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const recapFileRef = useRef<HTMLInputElement>(null);

  // Source vidéo optionnelle pour le mode récap.
  const [recapUrl, setRecapUrl] = useState("");
  const [recapMine, setRecapMine] = useState(false);
  const [recapFormat, setRecapFormat] = useState<VideoFormat>("short");

  const running = job.status === "running";

  const subtitleFields = {
    subtitle_size: subSize,
    subtitle_color: subColor,
    subtitle_mode: subMode,
    subtitle_max_words: subMaxWords,
  };

  const engineFields = { llm_engine: llmEngine, voice_engine: voiceEngine, voice, language };

  async function startGeneration() {
    let req: GenerateRequest = { mode, topic, film, num_parts: numParts, ...subtitleFields, ...engineFields };
    let file: File | null = null;

    if (mode === "recap") {
      file = recapFileRef.current?.files?.[0] ?? null;
      req = {
        mode: "recap",
        film,
        num_parts: numParts,
        source_url: recapUrl || null,
        mine: recapMine,
        video_format: recapFormat,
        video_quality: videoQuality,
        voice_enabled: recapVoiceEnabled,
        transcription_enabled: !recapVoiceEnabled,
        transcription_engine: engine,
        ...subtitleFields,
        ...engineFields,
      };
    }

    if (mode === "clip") {
      file = fileInputRef.current?.files?.[0] ?? null;
      req = {
        mode: "clip",
        source_url: clipUrl || null,
        mine: clipMine,
        clip_mode: clipMode,
        clip_start: clipStart,
        clip_duration: clipDuration,
        video_format: videoFormat,
        video_quality: videoQuality,
        voice_enabled: voiceEnabled,
        transcription_enabled: !voiceEnabled && transcriptionEnabled,
        transcription_engine: engine,
        script_text: voiceEnabled && scriptMode === "manual" ? scriptText : null,
        topic: voiceEnabled && scriptMode === "ai" ? scriptTopic : null,
        ...subtitleFields,
        ...engineFields,
      };
    }

    req.auto_upload = !previewFirst;
    await job.startJob(req, file);
  }

  if (step === "mode") {
    return (
      <section className="max-w-2xl mx-auto py-6">
        <StepShell
          eyebrow="Studio de création"
          title="Que veux-tu créer ?"
          subtitle={
            pendingReferenceUrl
              ? `Vidéo de référence prête — choisis comment l'utiliser.`
              : "Choisis un mode — tu pourras revenir en arrière."
          }
        >
          {pendingReferenceUrl && (
            <div className="mb-5 rounded-lg border border-border bg-card p-3 text-[12px]">
              <span className="text-muted-foreground">Basé sur : </span>
              <span className="font-medium">{referenceTitle ?? "chargement..."}</span>
              <p className="text-[11px] text-muted-foreground mt-1">
                Auto-clip réutilise directement cette vidéo comme source. Les autres modes reprennent son titre
                comme inspiration ; « Sujet libre » ignore la référence.
              </p>
            </div>
          )}
          <OptionGrid>
            {MODE_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <OptionCard
                  key={opt.id}
                  icon={<Icon className="size-5" strokeWidth={1.75} />}
                  title={opt.title}
                  subtitle={opt.subtitle}
                  selected={mode === opt.id}
                  onClick={() => selectMode(opt.id)}
                />
              );
            })}
          </OptionGrid>
        </StepShell>
      </section>
    );
  }

  if (step === "review") {
    const modeLabel = MODE_OPTIONS.find((m) => m.id === mode)?.title ?? mode;
    const subjectLine =
      mode === "topic" ? topic : mode === "film" || mode === "recap" ? film : mode === "clip" ? clipUrl || "Fichier local" : "Choisi par l'IA";

    return (
      <section className="max-w-lg mx-auto py-6">
        <StepShell
          eyebrow="Dernière étape"
          title="Prêt à générer ?"
          subtitle="Vérifie tes choix, puis lance la génération."
          badge={modeLabel}
          onBack={() => setStep("options")}
          backLabel="Modifier les options"
        >
          <Card className="p-5 gap-0 divide-y divide-border shadow-none">
            <div className="flex items-center justify-between py-2.5 text-[13px]">
              <span className="text-muted-foreground">Mode</span>
              <span className="font-medium">{modeLabel}</span>
            </div>
            <div className="flex items-center justify-between py-2.5 text-[13px]">
              <span className="text-muted-foreground">Sujet / source</span>
              <span className="font-medium truncate max-w-[220px]">{subjectLine || "—"}</span>
            </div>
            {mode === "recap" && (
              <div className="flex items-center justify-between py-2.5 text-[13px]">
                <span className="text-muted-foreground">Parties</span>
                <span className="font-medium">{numParts}</span>
              </div>
            )}
            <div className="flex items-center justify-between py-2.5 text-[13px]">
              <span className="text-muted-foreground">Modèle IA</span>
              <span className="font-medium">{llmEngine}</span>
            </div>
            <div className="flex items-center justify-between py-2.5 text-[13px]">
              <span className="text-muted-foreground">Publication</span>
              <span className="font-medium">{previewFirst ? "Prévisualiser avant" : "Directe"}</span>
            </div>
          </Card>

          <Button className="w-full mt-5" disabled={running} onClick={startGeneration}>
            {running ? "Génération en cours..." : "Finish — Lancer la génération"}
          </Button>
          <p className="text-[11px] text-muted-foreground mt-3 text-center">
            Une fois lancée, tu peux naviguer librement — la génération continue en arrière-plan.
          </p>

          {job.log.length > 0 && (
            <div className="mt-6 text-left">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Journal</div>
              <Card className="p-4 h-48 overflow-y-auto font-mono text-xs text-muted-foreground gap-1 shadow-none">
                {job.log.map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </Card>
            </div>
          )}
        </StepShell>
      </section>
    );
  }

  return (
    <section className="max-w-lg">
      <StepShell
        eyebrow="Studio de création"
        title="Réglages"
        subtitle="Configure ta génération, puis passe à l'étape suivante."
        badge={MODE_OPTIONS.find((m) => m.id === mode)?.title}
        onBack={() => setStep("mode")}
        backLabel="Changer de mode"
      >
      <Card className="p-6 gap-5 shadow-none text-left">
        <div className="space-y-1.5">
          <FieldLabel>Modèle IA (script)</FieldLabel>
          <Select value={llmEngine} onValueChange={(v) => setLlmEngine(v as LlmEngine)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="groq">Groq — Llama 3.3 (gratuit)</SelectItem>
              <SelectItem value="mistral">Mistral — Large</SelectItem>
              <SelectItem value="openai">ChatGPT — GPT-4o mini</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {mode !== "clip" && !(mode === "recap" && !recapVoiceEnabled) && (
          <div className="space-y-2 border-t pt-4">
            <FieldLabel>Voix off</FieldLabel>
            <VoicePicker
              engine={voiceEngine}
              setEngine={setVoiceEngine}
              language={language}
              setLanguage={setLanguage}
              voice={voice}
              setVoice={setVoice}
            />
          </div>
        )}

        {mode === "topic" && (
          <div className="space-y-1.5">
            <FieldLabel>Sujet</FieldLabel>
            <Input placeholder="Mystères de l'univers" value={topic} onChange={(e) => setTopic(e.target.value)} />
          </div>
        )}

        {mode === "film" && (
          <div className="space-y-1.5">
            <FieldLabel>Film / série — angle</FieldLabel>
            <MovieTitleInput
              placeholder="Inception - théorie sur la toupie finale"
              value={film}
              onChange={setFilm}
            />
          </div>
        )}

        {mode === "recap" && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <FieldLabel>Film / série à résumer</FieldLabel>
              <MovieTitleInput placeholder="Breaking Bad" value={film} onChange={setFilm} />
            </div>
            <div className="space-y-1.5">
              <FieldLabel>Nombre de parties</FieldLabel>
              <Select value={String(numParts)} onValueChange={(v) => setNumParts(Number(v))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2, 3, 4, 5, 6].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} parties
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Résumé condensé découpé en {numParts} Shorts (uploadés en privé). La prévisualisation ne s'applique pas à ce mode.
            </p>

            <div className="flex items-center justify-between border-t pt-4">
              <div>
                <FieldLabel>Voix off IA</FieldLabel>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {recapVoiceEnabled
                    ? "Narration IA du résumé."
                    : "Sans narration : audio d'origine conservé, sous-titres par transcription. Vidéo source requise."}
                </p>
              </div>
              <Switch checked={recapVoiceEnabled} onCheckedChange={setRecapVoiceEnabled} />
            </div>

            {!recapVoiceEnabled && (
              <div className="grid grid-cols-2 gap-3 pl-3 border-l border-border">
                <div className="space-y-1.5">
                  <FieldLabel>Moteur de transcription</FieldLabel>
                  <Select value={engine} onValueChange={(v) => setEngine(v as TranscriptionEngine)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whisper">Whisper (local, gratuit)</SelectItem>
                      <SelectItem value="assemblyai">AssemblyAI (cloud)</SelectItem>
                      <SelectItem value="deepgram">Deepgram (cloud)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Langue de transcription</FieldLabel>
                  <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="en">Anglais</SelectItem>
                      <SelectItem value="es">Espagnol</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="space-y-3 border-t pt-4">
              <FieldLabel>{recapVoiceEnabled ? "Vidéo source (optionnel)" : "Vidéo source (requise)"}</FieldLabel>
              <p className="text-[11px] text-muted-foreground">
                {recapVoiceEnabled
                  ? "Laisse vide pour des illustrations IA. Ou colle un lien : la vidéo est découpée et la narration montée dessus."
                  : "Colle le lien de la vidéo à résumer : N extraits courts en seront tirés, avec leur audio d'origine et des sous-titres transcrits."}
              </p>
              <Input placeholder="https://..." value={recapUrl} onChange={(e) => setRecapUrl(e.target.value)} />
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Checkbox checked={recapMine} onCheckedChange={(v) => setRecapMine(!!v)} />
                Je confirme avoir les droits d'utiliser cette vidéo
              </label>
              <input ref={recapFileRef} type="file" accept="video/*" className="w-full text-xs text-muted-foreground" />
              <div className="space-y-1.5">
                <FieldLabel>Format (si vidéo source)</FieldLabel>
                <Select value={recapFormat} onValueChange={(v) => setRecapFormat(v as VideoFormat)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Short — plein cadre 9:16 (recadré)</SelectItem>
                    <SelectItem value="blur">Short — vidéo centrée, haut/bas flou</SelectItem>
                    <SelectItem value="video">Vidéo classique (format d'origine)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {mode === "clip" && (
          <div className="space-y-5 border-t pt-4">
            <div className="space-y-1.5">
              <FieldLabel>Lien vidéo</FieldLabel>
              <Input placeholder="https://..." value={clipUrl} onChange={(e) => setClipUrl(e.target.value)} />
              <label className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <Checkbox checked={clipMine} onCheckedChange={(v) => setClipMine(!!v)} />
                Je confirme avoir les droits d'utiliser cette vidéo
              </label>
              <p className="text-[11px] text-muted-foreground mt-1">
                Coché : n'importe quel lien de n'importe quel site est accepté (YouTube, Vimeo, Twitch…),
                tu es responsable du respect du droit d'auteur. Décoché : seules les sources libres
                (Pexels, Pixabay, Wikimedia, Archive.org, ou licence Creative Commons) sont acceptées.
              </p>
              <div className="text-center text-[11px] text-muted-foreground my-2">— ou —</div>
              <input ref={fileInputRef} type="file" accept="video/*" className="w-full text-xs text-muted-foreground" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <FieldLabel>Découpage</FieldLabel>
                <Select value={clipMode} onValueChange={(v) => setClipMode(v as ClipMode)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Horodatage manuel</SelectItem>
                    <SelectItem value="speech">Meilleur passage parlé</SelectItem>
                    <SelectItem value="first">Premières secondes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <FieldLabel>Qualité vidéo</FieldLabel>
                <Select value={videoQuality} onValueChange={(v) => setVideoQuality(v as VideoQuality)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="best">Meilleure</SelectItem>
                    <SelectItem value="1080">1080p</SelectItem>
                    <SelectItem value="720">720p</SelectItem>
                    <SelectItem value="480">480p</SelectItem>
                    <SelectItem value="360">360p</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {clipMode === "manual" && clipUrl ? (
              <SourceInsight
                url={clipUrl}
                start={clipStart}
                duration={clipDuration}
                onChangeStart={setClipStart}
                onChangeDuration={setClipDuration}
              />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {clipMode === "manual" && (
                  <div className="space-y-1">
                    <FieldLabel>Début (sec)</FieldLabel>
                    <Input type="number" min={0} value={clipStart} onChange={(e) => setClipStart(Number(e.target.value))} />
                  </div>
                )}
                <div className="space-y-1">
                  <FieldLabel>Durée (sec)</FieldLabel>
                  <Input type="number" min={5} max={180} value={clipDuration} onChange={(e) => setClipDuration(Number(e.target.value))} />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <FieldLabel>Format de publication</FieldLabel>
              <Select value={videoFormat} onValueChange={(v) => setVideoFormat(v as VideoFormat)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">YouTube Short — plein cadre 9:16 (recadré)</SelectItem>
                  <SelectItem value="blur">YouTube Short — vidéo centrée, haut/bas flou</SelectItem>
                  <SelectItem value="video">Vidéo YouTube classique (format d'origine)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <FieldLabel>Voix off IA</FieldLabel>
              <Switch checked={voiceEnabled} onCheckedChange={setVoiceEnabled} />
            </div>

            {voiceEnabled ? (
              <div className="space-y-4 pl-3 border-l border-border">
                <VoicePicker
                  engine={voiceEngine}
                  setEngine={setVoiceEngine}
                  language={language}
                  setLanguage={setLanguage}
                  voice={voice}
                  setVoice={setVoice}
                />
                <div className="space-y-1.5">
                  <FieldLabel>Script</FieldLabel>
                  <Select value={scriptMode} onValueChange={(v) => setScriptMode(v as ScriptMode)}>
                    <SelectTrigger className="w-full mb-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Écrire le script moi-même</SelectItem>
                      <SelectItem value="ai">Générer avec l'IA à partir d'un sujet</SelectItem>
                    </SelectContent>
                  </Select>
                  {scriptMode === "manual" ? (
                    <Textarea rows={4} placeholder="Ton script de voix off..." value={scriptText} onChange={(e) => setScriptText(e.target.value)} />
                  ) : (
                    <Input placeholder="Sujet pour la génération IA" value={scriptTopic} onChange={(e) => setScriptTopic(e.target.value)} />
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4 pl-3 border-l border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <FieldLabel>Sous-titres auto (transcription)</FieldLabel>
                    <p className="text-[11px] text-muted-foreground mt-1">Transcrit l'audio d'origine du clip.</p>
                  </div>
                  <Switch checked={transcriptionEnabled} onCheckedChange={setTranscriptionEnabled} />
                </div>
                {transcriptionEnabled && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <FieldLabel>Moteur de transcription</FieldLabel>
                      <Select value={engine} onValueChange={(v) => setEngine(v as TranscriptionEngine)}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="whisper">Whisper (local, gratuit)</SelectItem>
                          <SelectItem value="assemblyai">AssemblyAI (cloud)</SelectItem>
                          <SelectItem value="deepgram">Deepgram (cloud)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel>Langue de transcription</FieldLabel>
                      <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fr">Français</SelectItem>
                          <SelectItem value="en">Anglais</SelectItem>
                          <SelectItem value="es">Espagnol</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="space-y-4 border-t pt-4">
          <FieldLabel>Sous-titres</FieldLabel>
          <div className="flex gap-5">
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <FieldLabel>Affichage</FieldLabel>
                  <Select value={subMode} onValueChange={(v) => setSubMode(v as SubtitleMode)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sentence">Phrase</SelectItem>
                      <SelectItem value="word">Mot par mot</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <FieldLabel>Couleur</FieldLabel>
                  <input
                    type="color"
                    value={subColor}
                    onChange={(e) => setSubColor(e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-background cursor-pointer"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <FieldLabel>Taille · {subSize}px</FieldLabel>
                <input
                  type="range"
                  min={32}
                  max={120}
                  value={subSize}
                  onChange={(e) => setSubSize(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>

              {subMode === "sentence" && (
                <div className="space-y-1">
                  <FieldLabel>Longueur · {subMaxWords} mots / sous-titre</FieldLabel>
                  <input
                    type="range"
                    min={1}
                    max={12}
                    value={subMaxWords}
                    onChange={(e) => setSubMaxWords(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>
              )}
            </div>

            <SubtitlePreview
              size={subSize}
              color={subColor}
              mode={subMode}
              maxWords={subMaxWords}
              format={mode === "clip" ? videoFormat : "short"}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <FieldLabel>Prévisualiser avant de publier</FieldLabel>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Voir la vidéo montée et confirmer avant l'envoi sur YouTube.
            </p>
          </div>
          <Switch checked={previewFirst} onCheckedChange={setPreviewFirst} />
        </div>

        <Button className="w-full" onClick={() => setStep("review")}>
          Continuer
        </Button>
      </Card>
      </StepShell>
    </section>
  );
}
