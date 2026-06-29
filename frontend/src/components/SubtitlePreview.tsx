import type { SubtitleMode, VideoFormat } from "@/lib/api";

type Props = {
  size: number; // taille définie pour 1080 px de large
  color: string;
  mode: SubtitleMode;
  maxWords: number;
  format: VideoFormat;
  sample?: string;
};

const PREVIEW_WIDTH = 220;

export function SubtitlePreview({
  size,
  color,
  mode,
  maxWords,
  format,
  sample = "Voici un exemple de sous-titre affiché à l'écran",
}: Props) {
  const height = format === "short" ? PREVIEW_WIDTH * (16 / 9) : PREVIEW_WIDTH * (9 / 16);
  // La taille est définie pour une vidéo de 1080 px de large → on l'adapte à l'aperçu.
  const fontPx = Math.max(7, (size * PREVIEW_WIDTH) / 1080);

  const words = sample.split(" ");
  const text =
    mode === "word"
      ? words[Math.min(3, words.length - 1)]
      : words.slice(0, Math.max(1, maxWords)).join(" ");

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="relative rounded-md overflow-hidden border border-border bg-gradient-to-br from-zinc-700 to-zinc-900"
        style={{ width: PREVIEW_WIDTH, height }}
      >
        <div
          className="absolute left-0 right-0 px-3 text-center"
          style={{ top: "78%", transform: "translateY(-50%)" }}
        >
          <span
            style={{
              fontFamily: "Arial, sans-serif",
              fontWeight: 700,
              fontSize: `${fontPx}px`,
              lineHeight: 1.15,
              color,
              textShadow:
                "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 0 2px #000",
            }}
          >
            {text}
          </span>
        </div>
      </div>
      <span className="text-[10px] text-muted-foreground">Aperçu</span>
    </div>
  );
}
