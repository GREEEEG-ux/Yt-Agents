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
    <div className="flex items-center justify-between px-4 py-3 hover:bg-accent/40 transition-colors">
      <div className="min-w-0">
        <div className="font-medium truncate">{title}</div>
        <div className="text-muted-foreground text-xs truncate">{subtitle}</div>
      </div>
      <div className="flex items-center gap-3 shrink-0 ml-4">
        {videoId && (
          <a
            href={`https://youtu.be/${videoId}`}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline text-xs"
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
  return <div className="px-4 py-8 text-muted-foreground text-center text-sm">{children}</div>;
}
