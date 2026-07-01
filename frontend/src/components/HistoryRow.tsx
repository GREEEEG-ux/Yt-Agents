import type { ReactNode } from "react";

export function HistoryRow({
  title,
  subtitle,
  videoId,
  actions,
}: {
  title: string;
  subtitle: string;
  videoId?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-4 hover:bg-accent/50 transition-colors">
      <div className="min-w-0">
        <div className="font-medium truncate">{title}</div>
        <div className="text-muted-foreground text-[11px] font-mono truncate mt-0.5">{subtitle}</div>
      </div>
      <div className="flex items-center gap-2.5 shrink-0 ml-4">
        {videoId && (
          <a
            href={`https://youtu.be/${videoId}`}
            target="_blank"
            rel="noreferrer"
            className="text-foreground/70 hover:text-foreground underline underline-offset-4 decoration-border text-xs"
          >
            Voir
          </a>
        )}
        {actions}
      </div>
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="px-5 py-12 text-muted-foreground text-center text-sm">{children}</div>
  );
}
