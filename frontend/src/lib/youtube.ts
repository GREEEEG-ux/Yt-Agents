// Extrait l'ID vidéo depuis n'importe quelle forme d'URL YouTube
// (youtu.be/ID, watch?v=ID, shorts/ID, embed/ID) ou un ID brut.
export function extractYoutubeId(input: string): string | null {
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;

  try {
    const url = new URL(s);
    if (url.hostname.includes("youtu.be")) {
      return url.pathname.slice(1).split("/")[0] || null;
    }
    if (url.hostname.includes("youtube.com")) {
      if (url.searchParams.get("v")) return url.searchParams.get("v");
      const match = url.pathname.match(/\/(shorts|embed)\/([\w-]{11})/);
      if (match) return match[2];
    }
  } catch {
    // not a valid URL
  }
  return null;
}
