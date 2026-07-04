import { useEffect, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, type VoicesResponse, type VoiceEngine, type Language } from "@/lib/api";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">{children}</Label>
  );
}

export function VoicePicker({
  engine,
  setEngine,
  language,
  setLanguage,
  voice,
  setVoice,
}: {
  engine: VoiceEngine;
  setEngine: (v: VoiceEngine) => void;
  language: Language;
  setLanguage: (v: Language) => void;
  voice: string | null;
  setVoice: (v: string | null) => void;
}) {
  const [voices, setVoices] = useState<VoicesResponse | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    api.getVoices().then(setVoices);
  }, []);

  // Liste filtrée selon le moteur et (pour Piper) la langue.
  const options =
    engine === "elevenlabs"
      ? voices?.elevenlabs ?? []
      : (voices?.piper ?? []).filter((v) => v.language === language);

  // Sélectionne une voix par défaut valide quand la liste change.
  useEffect(() => {
    if (options.length && !options.some((o) => o.id === voice)) {
      setVoice(options[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, language, voices]);

  async function playPreview() {
    setPreviewing(true);
    try {
      const { url } = await api.previewVoice({ engine, voice, language });
      audioRef.current?.pause();
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setPreviewing(false);
      audio.onerror = () => setPreviewing(false);
      await audio.play();
    } catch {
      setPreviewing(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <FieldLabel>Moteur de voix</FieldLabel>
          <Select value={engine} onValueChange={(v) => setEngine(v as VoiceEngine)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="piper">Piper (local, gratuit)</SelectItem>
              <SelectItem value="elevenlabs">ElevenLabs (premium)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <FieldLabel>Langue</FieldLabel>
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
      </div>

      <div className="space-y-1.5">
        <FieldLabel>Voix</FieldLabel>
        <div className="flex gap-2">
          <Select value={voice ?? ""} onValueChange={(v) => setVoice(v)}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Choisir une voix" />
            </SelectTrigger>
            <SelectContent>
              {options.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            type="button"
            onClick={playPreview}
            disabled={previewing || !voice}
            className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border bg-elevated/60 hover:bg-elevated text-xs transition-colors disabled:opacity-50"
            title="Écouter un aperçu"
          >
            <svg viewBox="0 0 24 24" className="size-3.5" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
            {previewing ? "Lecture..." : "Aperçu"}
          </button>
        </div>
        {engine === "elevenlabs" && (
          <p className="text-[11px] text-muted-foreground">
            ElevenLabs est un service payant : l'aperçu et la génération nécessitent des crédits sur le compte.
          </p>
        )}
      </div>
    </div>
  );
}
