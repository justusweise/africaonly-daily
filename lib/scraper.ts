import { XMLParser } from 'fast-xml-parser';
import type { Video } from './types';

const CHANNEL_ID = 'UCDQDmuhwj7JQ5TWclh_-ygg';
const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;

interface RssEntry {
  id: string;
  'yt:videoId': string;
  title: string;
  link: { '@_href': string } | string;
  published: string;
  'media:group'?: {
    'media:description'?: string;
    'media:thumbnail'?: { '@_url': string };
  };
}

export async function fetchLatestVideos(limit = 2): Promise<Video[]> {
  const res = await fetch(RSS_URL, {
    headers: { Accept: 'application/rss+xml, application/xml' },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch RSS feed: ${res.status} ${res.statusText}`);
  }

  const xml = await res.text();
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  });
  const parsed = parser.parse(xml);
  const entries: RssEntry[] = parsed.feed?.entry ?? [];

  return entries.slice(0, limit).map((entry) => {
    const videoId = entry['yt:videoId'];
    const group = entry['media:group'];
    const linkHref =
      typeof entry.link === 'object' ? entry.link['@_href'] : `https://www.youtube.com/watch?v=${videoId}`;

    return {
      id: videoId,
      title: entry.title,
      description: group?.['media:description'] ?? '',
      thumbnail: group?.['media:thumbnail']?.['@_url'] ?? `https://i3.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      url: linkHref,
      publishedAt: entry.published,
    };
  });
}
