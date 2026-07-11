import type { Video } from './types';

const CHANNEL_ID = 'UCDQDmuhwj7JQ5TWclh_-ygg';
const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;

export async function fetchLatestVideos(limit = 2): Promise<Video[]> {
  const res = await fetch(RSS_URL, {
    headers: { Accept: 'application/rss+xml, application/xml' },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch RSS feed: ${res.status} ${res.statusText}`);
  }

  const xml = await res.text();
  return parseRssEntries(xml, limit);
}

export function parseRssEntries(xml: string, limit = 2): Video[] {
  const entries = xml.match(/<entry[^>]*>([\s\S]*?)<\/entry>/g) ?? [];

  return entries.slice(0, limit).map((entry) => {
    const videoId = extract(entry, /<yt:videoId>([^<]*)<\/yt:videoId>/);
    const title = extract(entry, /<title>([^<]*)<\/title>/);
    const publishedAt = extract(entry, /<published>([^<]*)<\/published>/);
    const description = extract(
      entry,
      /<media:description>([\s\S]*?)<\/media:description>/
    );
    const thumbnail =
      extract(entry, /<media:thumbnail[^>]*url="([^"]+)"/) ||
      `https://i3.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    const url =
      extract(entry, /<link[^>]*rel="alternate"[^>]*href="([^"]+)"/) ||
      extract(entry, /<link[^>]*href="([^"]+)"[^>]*rel="alternate"/) ||
      `https://www.youtube.com/watch?v=${videoId}`;

    return {
      id: videoId,
      title,
      description: description.trim(),
      thumbnail,
      url,
      publishedAt,
    };
  });
}

function extract(xml: string, re: RegExp): string {
  const match = xml.match(re);
  return match ? match[1] : '';
}
