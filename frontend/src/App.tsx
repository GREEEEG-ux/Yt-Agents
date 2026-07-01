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

type View = "home" | "create" | "seo" | "optimizer" | "library" | "performances" | "settings";

const TABS: { id: View; label: string }[] = [
  { id: "home", label: "Accueil" },
  { id: "create", label: "Créer" },
  { id: "seo", label: "SEO" },
  { id: "optimizer", label: "Optimizer" },
  { id: "library", label: "Bibliothèque" },
  { id: "performances", label: "Performances" },
  { id: "settings", label: "Réglages" },
];

function AppShell() {
  const [view, setView] = useState<View>("home");
  const { status, percent } = useJob();

  return (
    <div className="min-h-screen text-[13px]">
      <header className="border-b border-border sticky top-0 z-10 bg-background/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 bg-primary" />
            <span className="font-medium tracking-tight text-[14px]">
              Shorts<span className="text-muted-foreground"> Studio</span>
            </span>
          </div>
          <nav className="flex items-center gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setView(tab.id)}
                className={cn(
                  "px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5",
                  view === tab.id
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
                {tab.id === "create" && status === "running" && (
                  <span className="text-[10px] font-mono text-muted-foreground">{percent}%</span>
                )}
              </button>
            ))}
          </nav>
        </div>
        {status === "running" && (
          <div className="h-px bg-border">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
        )}
      </header>

      <main className="max-w-5xl mx-auto px-8 py-14">
        {view === "home" && <Home onCreate={() => setView("create")} />}
        {view === "create" && <Create />}
        {view === "seo" && <SeoTool />}
        {view === "optimizer" && <OptimizerView />}
        {view === "library" && <Library />}
        {view === "performances" && <Performances />}
        {view === "settings" && <Settings />}
      </main>

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
