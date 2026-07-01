import { useRef, useState } from "react";
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
import { PageHeader } from "@/components/PageHeader";
import { SubtitlePreview } from "@/components/SubtitlePreview";
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

export function Create() {
  const job = useJob();

  const [mode, setMode] = useState<GenerateMode>("free");
  const [topic, setTopic] = useState("");
  const [film, setFilm] = useState("");

  const [clipUrl, setClipUrl] = useState("");
  const [clipMine, setClipMine] = useState(false);
  const [clipMode, setClipMode] = useState<ClipMode>("manual");
  const [clipStart, setClipStart] = useState(0);
  const [clipDuration, setClipDuration] = useState(30);
  const [videoFormat, setVideoFormat] = useState<VideoFormat>("short");
  const [videoQuality, setVideoQuality] = useState<VideoQuality>("best");

  const [llmEngine, setLlmEngine] = useState<LlmEngine>("groq");
  const [voiceEngine, setVoiceEngine] = useState<VoiceEngine>("piper");

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

  const running = job.status === "running";

  const subtitleFields = {
    subtitle_size: subSize,
    subtitle_color: subColor,
    subtitle_mode: subMode,
    subtitle_max_words: subMaxWords,
  };

  const engineFields = { llm_engine: llmEngine, voice_engine: voiceEngine };

  async function startGeneration() {
    let req: GenerateRequest = { mode, topic, film, ...subtitleFields, ...engineFields };
    let file: File | null = null;

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
        language,
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

  return (
    <section className="max-w-lg">
      <PageHeader
        title="Nouvelle génération"
        intro="Choisis un mode, règle les options, prévisualise avant de publier."
      />

      <Card className="p-6 gap-5 shadow-none">
        <div className="space-y-1.5">
          <FieldLabel>Mode</FieldLabel>
          <Select value={mode} onValueChange={(v) => setMode(v as GenerateMode)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="free">Sujet libre</SelectItem>
              <SelectItem value="topic">Sujet imposé</SelectItem>
              <SelectItem value="film">Analyse de film / série</SelectItem>
              <SelectItem value="clip">Auto-clip depuis un lien / fichier</SelectItem>
            </SelectContent>
          </Select>
        </div>

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

        {mode === "topic" && (
          <div className="space-y-1.5">
            <FieldLabel>Sujet</FieldLabel>
            <Input placeholder="Mystères de l'univers" value={topic} onChange={(e) => setTopic(e.target.value)} />
          </div>
        )}

        {mode === "film" && (
          <div className="space-y-1.5">
            <FieldLabel>Film / série — angle</FieldLabel>
            <Input
              placeholder="Inception - théorie sur la toupie finale"
              value={film}
              onChange={(e) => setFilm(e.target.value)}
            />
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
                <div className="space-y-1.5">
                  <FieldLabel>Moteur de voix</FieldLabel>
                  <Select value={voiceEngine} onValueChange={(v) => setVoiceEngine(v as VoiceEngine)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="piper">Piper (local, gratuit)</SelectItem>
                      <SelectItem value="elevenlabs">ElevenLabs (cloud, premium)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Langue de la voix</FieldLabel>
                  <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="en">Anglais</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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

        <Button className="w-full" disabled={running} onClick={startGeneration}>
          {running ? "Génération en cours..." : "Lancer la génération"}
        </Button>
        {running && (
          <p className="text-[11px] text-muted-foreground text-center">
            Tu peux naviguer librement, la génération continue en arrière-plan.
          </p>
        )}
      </Card>

      {job.log.length > 0 && (
        <div className="mt-6">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Journal</div>
          <Card className="p-4 h-52 overflow-y-auto font-mono text-xs text-muted-foreground gap-1">
            {job.log.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </Card>
        </div>
      )}
    </section>
  );
}
