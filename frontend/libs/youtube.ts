// YouTube links of Open Courses and program videos (the server checks the same shapes)

/** watch?v=, youtu.be/, shorts/ and embed/ links → the 11-character video id */
const YOUTUBE_ID = /^https:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})(?:[?&#/]|$)/;

export const youtubeId = (url: string): string | null => YOUTUBE_ID.exec(url.trim())?.[1] ?? null;

/** The video's picture: no API key needed */
export const youtubeThumb = (id: string, size: 'mq' | 'hq' = 'mq') => `https://img.youtube.com/vi/${id}/${size}default.jpg`;

export const youtubeWatch = (id: string) => `https://www.youtube.com/watch?v=${id}`;

/** 522 → "8:42", 3723 → "1:02:03" */
export function clock(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = String(sec % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

/** 8040 → "2h 14m" (a course's total) */
export const totalText = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return [h ? `${h}h` : '', m || !h ? `${m}m` : ''].filter(Boolean).join(' ');
};

/** "8:42" / "1:02:03" → seconds; null when it is not a clock */
export function toSeconds(text: string): number | null {
  if (!/^(\d{1,2}:)?\d{1,2}:\d{2}$/.test(text.trim())) return null;
  return text
    .trim()
    .split(':')
    .map(Number)
    .reduce((total, part) => total * 60 + part, 0);
}
