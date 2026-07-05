import { useState } from "react";
import { Input } from "@/components/ui/input";
import { api, type MovieSuggestion } from "@/lib/api";

export function MovieTitleInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [suggestions, setSuggestions] = useState<MovieSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");

  async function search() {
    const q = value.trim();
    if (q.length < 2) return;
    setLoading(true);
    setNote("");
    try {
      const { suggestions } = await api.movieSuggest(q);
      setSuggestions(suggestions);
      setOpen(suggestions.length > 0);
      if (!suggestions.length) setNote("Aucun résultat (ou clé IMDb absente).");
    } catch {
      setNote("Recherche IMDb indisponible.");
    } finally {
      setLoading(false);
    }
  }

  function pick(s: MovieSuggestion) {
    onChange(s.year ? `${s.title} (${s.year})` : s.title);
    setOpen(false);
  }

  return (
    <div className="relative">
      <div className="flex gap-2">
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), search())}
        />
        <button
          type="button"
          onClick={search}
          disabled={loading || value.trim().length < 2}
          className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border bg-elevated/60 hover:bg-elevated text-xs transition-colors disabled:opacity-50"
          title="Rechercher sur IMDb"
        >
          <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
          </svg>
          {loading ? "..." : "IMDb"}
        </button>
      </div>

      {note && <p className="text-[11px] text-muted-foreground mt-1">{note}</p>}

      {open && suggestions.length > 0 && (
        <div className="absolute z-20 mt-1 w-full max-h-72 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
          {suggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => pick(s)}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-accent text-left"
            >
              {s.image ? (
                <img src={s.image} alt="" className="w-8 h-11 object-cover rounded shrink-0" />
              ) : (
                <div className="w-8 h-11 rounded bg-muted shrink-0" />
              )}
              <div className="min-w-0">
                <div className="text-[13px] font-medium truncate">{s.title}</div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {[s.year, s.description].filter(Boolean).join(" · ")}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
