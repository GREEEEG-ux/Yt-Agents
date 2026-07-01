import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { PageHeader, SectionLabel } from "@/components/PageHeader";
import { api, type ConfigStatus } from "@/lib/api";
import { cn } from "@/lib/utils";

const GROUPS: { label: string; keys: (keyof ConfigStatus)[] }[] = [
  { label: "Modèles IA (script)", keys: ["groq", "mistral", "openai"] },
  { label: "Transcription", keys: ["assemblyai", "deepgram"] },
  { label: "Sources visuelles", keys: ["pexels", "pixabay"] },
  { label: "Voix & montage", keys: ["piper_exe", "piper_voice", "elevenlabs", "ffmpeg"] },
  { label: "Publication YouTube", keys: ["client_secret", "token"] },
];

const LABELS: Record<keyof ConfigStatus, string> = {
  groq: "Groq — Llama 3.3 (gratuit)",
  mistral: "Mistral — Large",
  openai: "ChatGPT — GPT-4o mini",
  pexels: "Pexels — vidéos libres",
  pixabay: "Pixabay — vidéos libres",
  assemblyai: "AssemblyAI — transcription",
  deepgram: "Deepgram — transcription",
  piper_exe: "Piper TTS installé",
  piper_voice: "Modèle de voix Piper",
  elevenlabs: "ElevenLabs — voix premium",
  ffmpeg: "FFmpeg détecté",
  client_secret: "OAuth YouTube configuré",
  token: "Connexion YouTube active",
};

function Row({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <span className="text-sm">{label}</span>
      <span
        className={cn(
          "inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.1em] px-2.5 py-1 rounded-full",
          ok ? "bg-[#edf3ec] pastel-green" : "bg-[#fdebec] pastel-red"
        )}
      >
        <span className={cn("w-1.5 h-1.5 rounded-full", ok ? "bg-[#346538]" : "bg-[#9f2f2d]")} />
        {ok ? "Connecté" : "Manquant"}
      </span>
    </div>
  );
}

export function Settings() {
  const [status, setStatus] = useState<ConfigStatus | null>(null);

  useEffect(() => {
    api.getConfigStatus().then(setStatus);
  }, []);

  return (
    <section className="max-w-xl">
      <PageHeader title="Réglages" intro="État des clés API et des dépendances locales." />

      <div className="space-y-8">
        {status &&
          GROUPS.map((group) => (
            <div key={group.label}>
              <SectionLabel>{group.label}</SectionLabel>
              <Card className="py-0 divide-y divide-border shadow-none overflow-hidden">
                {group.keys.map((key) => (
                  <Row key={key} label={LABELS[key]} ok={status[key]} />
                ))}
              </Card>
            </div>
          ))}
      </div>
    </section>
  );
}
