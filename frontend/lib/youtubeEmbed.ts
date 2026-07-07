/** YouTube ბმულიდან video ID — watch, youtu.be, shorts, embed */
export function extractYouTubeVideoId(input: string): string | null {
  const raw = (input || '').trim();
  if (!raw) return null;

  let url = raw;
  if (raw.includes('<iframe') && raw.includes('src=')) {
    const srcMatch = raw.match(/src=["']([^"']+)["']/);
    if (srcMatch?.[1]) url = srcMatch[1];
  }

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();

    if (host === 'youtu.be') {
      const id = parsed.pathname.replace(/^\//, '').split(/[/?#]/)[0];
      return id || null;
    }

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (parsed.pathname === '/watch' || parsed.pathname.startsWith('/watch/')) {
        return parsed.searchParams.get('v');
      }
      const parts = parsed.pathname.split('/').filter(Boolean);
      if (parts[0] === 'shorts' && parts[1]) return parts[1].split(/[?#]/)[0];
      if (parts[0] === 'embed' && parts[1]) return parts[1].split(/[?#]/)[0];
      if (parts[0] === 'v' && parts[1]) return parts[1].split(/[?#]/)[0];
    }
  } catch {
    // fall through to regex
  }

  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/
  );
  return match?.[1] ?? null;
}

/** ჩვეულებრივი ვიდეო, Shorts, youtu.be → embed URL */
export function toYouTubeEmbedUrl(input: string): string | null {
  const videoId = extractYouTubeVideoId(input);
  if (!videoId) return null;
  return `https://www.youtube.com/embed/${videoId}`;
}
