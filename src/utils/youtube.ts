const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

export function getYouTubeEmbedUrl(value?: string): string | undefined {
  if (!value) return undefined;

  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    let videoId: string | undefined;

    if (host === 'youtu.be') {
      videoId = url.pathname.split('/').filter(Boolean)[0];
    } else if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (url.pathname === '/watch') videoId = url.searchParams.get('v') ?? undefined;
      else if (/^\/(embed|shorts|live)\//.test(url.pathname)) videoId = url.pathname.split('/').filter(Boolean)[1];
    }

    if (!videoId || !YOUTUBE_ID.test(videoId)) return undefined;
    return `https://www.youtube-nocookie.com/embed/${videoId}`;
  } catch {
    return undefined;
  }
}
