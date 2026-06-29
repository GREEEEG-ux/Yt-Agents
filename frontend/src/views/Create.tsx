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
import {
  api,
  type GenerateMode,
  type JobMessage,
  type ClipMode,
  type VideoFormat,
  type Language,
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
  const [mode, setMode] = useState<GenerateMode>("free");
  const [topic, setTopic] = useState("");
  const [film, setFilm] = useState("");

  // Mode clip
  const [clipUrl, setClipUrl] = useState("");
  const [clipMine, setClipMine] = useState(false);
  const [clipMode, setClipMode] = useState<ClipMode>("manual");
  const [clipStart, setClipStart] = useState(0);
  const [clipDuration, setClipDuration] = useState(30);
  const [videoFormat, setVideoFormat] = useState<VideoFormat>("short");

  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [language, setLanguage] = useState<Language>("fr");
  const [scriptMode, setScriptMode] = useState<ScriptMode>("manual");
  const [scriptText, setScriptText] = useState("");
  const [scriptTopic, setScriptTopic] = useState("");
  const [transcriptionEnabled, setTranscriptionEnabled] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [result, setResult] = useState<{ video_id: string } | null>(null);

  function appendLog(line: string) {
    setLog((prev) => [...prev, line]);
  }

  async function startGeneration() {
    setBusy(true);
    setLog([]);
    setResult(null);

    let req: Parameters<typeof api.generate>[0] = { mode, topic, film };

    if (mode === "clip") {
      let filePath: string | null = null;
      const file = fileInputRef.current?.files?.[0];
      if (file) {
        appendLog("Envoi du fichier local...");
        const uploaded = await api.uploadLocal(file);
        filePath = uploaded.file_path;
      }

      req = {
        mode: "clip",
        source_url: clipUrl || null,
        file_path: filePath,
        mine: clipMine,
        clip_mode: clipMode,
        clip_start: clipStart,
        clip_duration: clipDuration,
        video_format: videoFormat,
        voice_enabled: voiceEnabled,
        language,
        transcription_enabled: !voiceEnabled && transcriptionEnabled,
        script_text: voiceEnabled && scriptMode === "manual" ? scriptText : null,
        topic: voiceEnabled && scriptMode === "ai" ? scriptTopic : null,
      };
    }

    const { job_id } = await api.generate(req);

    api.watchJob(job_id, (msg: JobMessage) => {
      if (msg.type === "progress") {
        appendLog(msg.message);
      } else if (msg.type === "done") {
        appendLog("Terminé.");
        setResult({ video_id: msg.result.video_id });
        setBusy(false);
      } else if (msg.type === "skipped") {
        appendLog(msg.message);
        setBusy(false);
      } else if (msg.type === "error") {
        appendLog("Erreur : " + msg.message);
        setBusy(false);
      }
    });
  }

  return (
    <section className="max-w-lg">
      <h1 className="text-lg font-semibold tracking-tight mb-6">Nouvelle génération</h1>

      <Card className="p-5 gap-4 border-l-2 border-l-primary">
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

        {mode === "topic" && (
          <div className="space-y-1.5">
            <FieldLabel>Sujet</FieldLabel>
            <Input
              placeholder="Mystères de l'univers"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
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
            {/* Source */}
            <div className="space-y-1.5">
              <FieldLabel>Lien vidéo</FieldLabel>
              <Input
                placeholder="https://..."
                value={clipUrl}
                onChange={(e) => setClipUrl(e.target.value)}
              />
              <label className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <Checkbox checked={clipMine} onCheckedChange={(v) => setClipMine(!!v)} />
                Cette vidéo m'appartient
              </label>
              <p className="text-[11px] text-muted-foreground mt-1">
                Sinon : Wikimedia Commons, Internet Archive, licence Creative Commons
                vérifiable, ou lien direct .mp4 (Pexels/Pixabay).
              </p>
              <div className="text-center text-[11px] text-muted-foreground my-2">— ou —</div>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="w-full text-xs text-muted-foreground"
              />
            </div>

            {/* Découpage */}
            <div className="space-y-1.5">
              <FieldLabel>Découpage du clip</FieldLabel>
              <Select value={clipMode} onValueChange={(v) => setClipMode(v as ClipMode)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Horodatage manuel (précis)</SelectItem>
                  <SelectItem value="speech">Auto — meilleur passage parlé</SelectItem>
                  <SelectItem value="first">Premières secondes</SelectItem>
                </SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {clipMode === "manual" && (
                  <div className="space-y-1">
                    <FieldLabel>Début (sec)</FieldLabel>
                    <Input
                      type="number"
                      min={0}
                      value={clipStart}
                      onChange={(e) => setClipStart(Number(e.target.value))}
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <FieldLabel>Durée (sec)</FieldLabel>
                  <Input
                    type="number"
                    min={5}
                    max={180}
                    value={clipDuration}
                    onChange={(e) => setClipDuration(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            {/* Format de sortie */}
            <div className="space-y-1.5">
              <FieldLabel>Format de publication</FieldLabel>
              <Select value={videoFormat} onValueChange={(v) => setVideoFormat(v as VideoFormat)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">YouTube Short (9:16 vertical)</SelectItem>
                  <SelectItem value="video">Vidéo YouTube classique (format d'origine)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Voix off */}
            <div className="flex items-center justify-between">
              <FieldLabel>Voix off IA</FieldLabel>
              <Switch checked={voiceEnabled} onCheckedChange={setVoiceEnabled} />
            </div>

            {voiceEnabled ? (
              <div className="space-y-4 pl-3 border-l border-border">
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
                    <Textarea
                      rows={4}
                      placeholder="Ton script de voix off..."
                      value={scriptText}
                      onChange={(e) => setScriptText(e.target.value)}
                    />
                  ) : (
                    <Input
                      placeholder="Sujet pour la génération IA"
                      value={scriptTopic}
                      onChange={(e) => setScriptTopic(e.target.value)}
                    />
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between pl-3 border-l border-border">
                <div>
                  <FieldLabel>Sous-titres auto (transcription)</FieldLabel>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Transcrit l'audio d'origine du clip (Whisper).
                  </p>
                </div>
                <Switch checked={transcriptionEnabled} onCheckedChange={setTranscriptionEnabled} />
              </div>
            )}
          </div>
        )}

        <Button className="w-full" disabled={busy} onClick={startGeneration}>
          Lancer la génération
        </Button>
      </Card>

      {log.length > 0 && (
        <div className="mt-6">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
            Progression
          </div>
          <Card className="p-4 h-52 overflow-y-auto font-mono text-xs text-muted-foreground gap-1">
            {log.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </Card>
          {result && (
            <a
              href={`https://youtu.be/${result.video_id}`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-primary hover:underline text-sm"
            >
              Voir la vidéo sur YouTube →
            </a>
          )}
        </div>
      )}
    </section>
  );
}
