import type { ReactNode } from "react";

export function StepShell({
  eyebrow,
  title,
  subtitle,
  badge,
  onBack,
  backLabel,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  badge?: string;
  onBack?: () => void;
  backLabel?: string;
  children: ReactNode;
}) {
  return (
    <div className="wizard-step max-w-xl mx-auto text-center">
      {eyebrow && (
        <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-2">{eyebrow}</div>
      )}
      <h1 className="font-display text-2xl mb-1.5">{title}</h1>
      {subtitle && <p className="text-muted-foreground text-sm mb-5">{subtitle}</p>}
      {badge && (
        <div className="inline-block px-3 py-1.5 rounded-full border border-border bg-card text-[12px] mb-6">
          {badge}
        </div>
      )}

      <div className="text-left">{children}</div>

      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="mt-8 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
        >
          ← {backLabel ?? "Retour"}
        </button>
      )}
    </div>
  );
}

export function OptionGrid({ children, cols = 3 }: { children: ReactNode; cols?: 2 | 3 }) {
  return (
    <div className={`grid gap-3 ${cols === 2 ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-3"}`}>{children}</div>
  );
}

export function OptionCard({
  icon,
  title,
  subtitle,
  selected,
  onClick,
}: {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  selected?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`option-card p-4 text-left ${selected ? "selected" : ""}`}
    >
      {icon && <div className="text-muted-foreground mb-2.5">{icon}</div>}
      <div className="font-medium text-[13px] mb-1">{title}</div>
      {subtitle && <div className="text-[11px] text-muted-foreground leading-snug">{subtitle}</div>}
    </button>
  );
}
