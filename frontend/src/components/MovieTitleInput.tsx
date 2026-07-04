import { useEffect, useRef, useState } from "react";
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
  const justPicked = useRef(false);

  useEffect(() => {
    if (justPicked.current) {
      justPicked.current = false;
      return;
    }
    const q = value.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const { suggestions } = await api.movieSuggest(q);
        setSuggestions(suggestions);
        setOpen(suggestions.length > 0);
      } catch {
        setSuggestions([]);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [value]);

  function pick(s: MovieSuggestion) {
    justPicked.current = true;
    onChange(s.year ? `${s.title} (${s.year})` : s.title);
    setOpen(false);
  }

  return (
    <div className="relative">
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => suggestions.length && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && suggestions.length > 0 && (
        <div className="absolute z-20 mt-1 w-full max-h-72 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
          {suggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
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
