import { useState } from "react";
import { cn } from "@/lib/utils";
import { JobProvider, useJob } from "@/lib/JobContext";
import { ProgressDock } from "@/components/ProgressDock";
import { Home } from "@/views/Home";
import { Create } from "@/views/Create";
import { Library } from "@/views/Library";
import { Performances } from "@/views/Performances";
import { Settings } from "@/views/Settings";

type View = "home" | "create" | "library" | "performances" | "settings";

const TABS: { id: View; label: string }[] = [
  { id: "home", label: "Accueil" },
  { id: "create", label: "Créer" },
  { id: "library", label: "Bibliothèque" },
  { id: "performances", label: "Performances" },
  { id: "settings", label: "Réglages" },
];

function AppShell() {
  const [view, setView] = useState<View>("home");
  const { status, percent } = useJob();

  return (
    <div className="min-h-screen text-[13px]">
      <header className="border-b sticky top-0 z-10 bg-background/95 backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-sm bg-primary" />
            <span className="font-semibold tracking-tight text-[15px]">yt-shorts-agent</span>
          </div>
          <nav className="flex items-center gap-6">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setView(tab.id)}
                className={cn(
                  "py-1 px-1 border-b-2 transition-colors flex items-center gap-1.5",
                  view === tab.id
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
                {tab.id === "create" && status === "running" && (
                  <span className="text-[10px] font-mono text-primary">{percent}%</span>
                )}
              </button>
            ))}
          </nav>
        </div>
        {status === "running" && (
          <div className="h-0.5 bg-muted">
            <div className="h-full bg-primary transition-all duration-500" style={{ width: `${percent}%` }} />
          </div>
        )}
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {view === "home" && <Home onCreate={() => setView("create")} />}
        {view === "create" && <Create />}
        {view === "library" && <Library />}
        {view === "performances" && <Performances />}
        {view === "settings" && <Settings />}
      </main>

      <ProgressDock />
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
