import { useState } from "react";
import { cn } from "@/lib/utils";
import { JobProvider, useJob } from "@/lib/JobContext";
import { ProgressDock } from "@/components/ProgressDock";
import { PreviewModal, PublishingOverlay } from "@/components/PreviewModal";
import { Home } from "@/views/Home";
import { Create } from "@/views/Create";
import { SeoTool } from "@/views/SeoTool";
import { OptimizerView } from "@/views/OptimizerView";
import { Library } from "@/views/Library";
import { Performances } from "@/views/Performances";
import { Settings } from "@/views/Settings";
import { LayoutGrid, Wand2, Hash, LineChart, Film, TrendingUp, Settings2 } from "lucide-react";

type View = "home" | "create" | "seo" | "optimizer" | "library" | "performances" | "settings";

const NAV: { id: View; label: string; icon: typeof LayoutGrid; group: string }[] = [
  { id: "home", label: "Accueil", icon: LayoutGrid, group: "Studio" },
  { id: "create", label: "Créer", icon: Wand2, group: "Studio" },
  { id: "seo", label: "SEO", icon: Hash, group: "Studio" },
  { id: "optimizer", label: "Optimizer", icon: LineChart, group: "Studio" },
  { id: "library", label: "Bibliothèque", icon: Film, group: "Contenu" },
  { id: "performances", label: "Performances", icon: TrendingUp, group: "Contenu" },
  { id: "settings", label: "Réglages", icon: Settings2, group: "Système" },
];

function Sidebar({ view, setView }: { view: View; setView: (v: View) => void }) {
  const groups = [...new Set(NAV.map((n) => n.group))];
  return (
    <aside className="w-60 shrink-0 bg-sidebar border-r border-border flex flex-col h-screen sticky top-0">
      <div className="px-4 py-4 flex items-center gap-3 border-b border-border">
        <div className="size-8 rounded-lg bg-primary/15 text-primary grid place-items-center font-semibold text-[13px]">
          GC
        </div>
        <div className="min-w-0">
          <div className="text-[13px] font-medium truncate">Greg Chery</div>
          <div className="text-[11px] text-muted-foreground">Plan gratuit</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {groups.map((group) => (
          <div key={group}>
            <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground px-2 mb-2">
              {group}
            </div>
            <div className="space-y-0.5">
              {NAV.filter((n) => n.group === group).map((item) => {
                const Icon = item.icon;
                const active = view === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setView(item.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-[13px] transition-colors",
                      active
                        ? "bg-elevated text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-elevated/50"
                    )}
                  >
                    <Icon className={cn("size-4", active && "text-primary")} strokeWidth={2} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3">
        <div className="rounded-xl border border-border bg-elevated/50 p-3.5">
          <div className="text-[12px] font-medium mb-1">yt-shorts-agent</div>
          <div className="text-[11px] text-muted-foreground leading-relaxed">
            Génère, prévisualise et publie des Shorts assistés par IA.
          </div>
        </div>
      </div>
    </aside>
  );
}

function AppShell() {
  const [view, setView] = useState<View>("home");
  const { status, percent } = useJob();
  const current = NAV.find((n) => n.id === view);

  return (
    <div className="min-h-screen flex text-[13px]">
      <Sidebar view={view} setView={setView} />

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 border-b border-border sticky top-0 z-10 bg-background/80 backdrop-blur-md flex items-center px-8">
          <span className="text-sm font-medium">{current?.label}</span>
          {status === "running" && (
            <span className="ml-3 text-[11px] font-mono text-primary">génération · {percent}%</span>
          )}
        </header>
        {status === "running" && (
          <div className="h-px bg-border">
            <div className="h-full bg-primary transition-all duration-500" style={{ width: `${percent}%` }} />
          </div>
        )}

        <main className="flex-1 px-8 py-8 max-w-6xl w-full">
          {view === "home" && <Home onCreate={() => setView("create")} />}
          {view === "create" && <Create />}
          {view === "seo" && <SeoTool />}
          {view === "optimizer" && <OptimizerView />}
          {view === "library" && <Library />}
          {view === "performances" && <Performances />}
          {view === "settings" && <Settings />}
        </main>
      </div>

      <ProgressDock />
      <PreviewModal />
      <PublishingOverlay />
    </div>
  );
}

export default function App() {
  return (
    <JobProvider>
      <AppShell />
    </JobProvider>
  );
}
