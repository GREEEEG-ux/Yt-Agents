import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { api, type ConfigStatus } from "@/lib/api";
import { cn } from "@/lib/utils";

const LABELS: Record<keyof ConfigStatus, string> = {
  groq: "Clé Groq (script IA)",
  pexels: "Clé Pexels (vidéos libres)",
  pixabay: "Clé Pixabay (vidéos libres)",
  piper_exe: "Piper TTS installé",
  piper_voice: "Modèle de voix Piper",
  ffmpeg: "FFmpeg détecté",
  client_secret: "OAuth YouTube configuré",
  token: "Connexion YouTube active",
};

export function Settings() {
  const [status, setStatus] = useState<ConfigStatus | null>(null);

  useEffect(() => {
    api.getConfigStatus().then(setStatus);
  }, []);

  return (
    <section className="max-w-lg">
      <h1 className="text-lg font-semibold tracking-tight mb-6">Réglages</h1>
      <Card className="py-0 divide-y divide-border">
        {status &&
          (Object.keys(LABELS) as (keyof ConfigStatus)[]).map((key) => (
            <div key={key} className="flex items-center justify-between px-4 py-3">
              <span>{LABELS[key]}</span>
              <span
                className={cn(
                  "flex items-center gap-2 text-xs",
                  status[key] ? "text-emerald-400" : "text-red-400"
                )}
              >
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    status[key] ? "bg-emerald-400" : "bg-red-400"
                  )}
                />
                {status[key] ? "Connecté" : "Manquant"}
              </span>
            </div>
          ))}
      </Card>
    </section>
  );
}
