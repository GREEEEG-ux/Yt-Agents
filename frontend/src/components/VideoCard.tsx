import type { ReactNode } from "react";

// Vignette locale (frame réelle de la vidéo) en priorité ; repli sur YouTube.
export function thumbUrl(videoId: string) {
  return `/thumbs/${videoId}.jpg`;
}

function onThumbError(e: React.SyntheticEvent<HTMLImageElement>, videoId: string) {
  const img = e.currentTarget;
  const yt = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  if (img.src !== yt) img.src = yt;
}

export function VideoCard({
  videoId,
  title,
  subtitle,
}: {
  videoId: string;
  title: string;
  subtitle: string;
}) {
  return (
    <a
      href={`https://youtu.be/${videoId}`}
      target="_blank"
      rel="noreferrer"
      className="group block w-60 shrink-0"
    >
      <div className="relative aspect-video rounded-xl overflow-hidden border border-border bg-muted">
        <img
          src={thumbUrl(videoId)}
          alt={title}
          loading="lazy"
          onError={(e) => onThumbError(e, videoId)}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-300">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-white text-black px-2.5 py-1 rounded-md">
            <svg viewBox="0 0 24 24" className="size-3" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
            Lire
          </span>
        </div>
      </div>
      <div className="mt-2.5">
        <div className="text-[13px] font-medium truncate">{title}</div>
        <div className="text-[11px] text-muted-foreground truncate mt-0.5">{subtitle}</div>
      </div>
    </a>
  );
}

export function Rail({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-[15px] font-semibold mb-3.5">{title}</h2>
      <div className="flex gap-4 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">{children}</div>
    </div>
  );
}
