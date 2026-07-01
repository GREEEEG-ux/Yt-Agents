import type { ReactNode } from "react";

export function PageHeader({
  title,
  intro,
  action,
}: {
  title: string;
  intro?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-10 flex items-end justify-between gap-6">
      <div>
        <h1 className="font-display text-[26px] leading-none">{title}</h1>
        {intro && <p className="text-muted-foreground text-sm mt-2 max-w-md">{intro}</p>}
      </div>
      {action}
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-3">
      {children}
    </div>
  );
}
