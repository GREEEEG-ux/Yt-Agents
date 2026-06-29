import { useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, type GenerateMode, type JobMessage } from "@/lib/api";

type ScriptMode = "manual" | "ai";

export function Create() {
  const [mode, setMode] = useState<GenerateMode>("free");
  const [topic, setTopic] = useState("");
  const [film, setFilm] = useState("");

  const [clipUrl, setClipUrl] = useState("");
  const [clipMine, setClipMine] = useState(false);
  const [scriptMode, setScriptMode] = useState<ScriptMode>("manual");
  const [scriptText, setScriptText] = useState("");
  const [scriptTopic, setScriptTopic] = useState("");
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
        script_text: scriptMode === "manual" ? scriptText : null,
        topic: scriptMode === "ai" ? scriptTopic : null,
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
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Mode
          </Label>
          <Select value={mode} onValueChange={(v) => setMode(v as GenerateMode)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="free">Sujet libre</SelectItem>
              <SelectItem value="topic">Sujet imposé</SelectItem>
              <SelectItem value="film">Analyse de film / série</SelectItem>
              <SelectItem value="clip">Depuis un lien ou un fichier vidéo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {mode === "topic" && (
          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Sujet
            </Label>
            <Input
              placeholder="Mystères de l'univers"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>
        )}

        {mode === "film" && (
          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Film / série — angle
            </Label>
            <Input
              placeholder="Inception - théorie sur la toupie finale"
              value={film}
              onChange={(e) => setFilm(e.target.value)}
            />
          </div>
        )}

        {mode === "clip" && (
          <div className="space-y-4 border-t pt-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Lien vidéo
              </Label>
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
                Sinon, seules les sources autorisées sont acceptées : Wikimedia Commons,
                Internet Archive, licence Creative Commons vérifiable, ou lien direct .mp4
                (Pexels/Pixabay — clic droit sur le bouton de téléchargement → copier
                l'adresse du lien).
              </p>
            </div>

            <div className="text-center text-[11px] text-muted-foreground">— ou —</div>

            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Importer un fichier local
              </Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="w-full text-xs text-muted-foreground"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Script
              </Label>
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
