const https = require('https');

const CHANNEL_ID = 'UCDQDmuhwj7JQ5TWclh_-ygg';
const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;

function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { Accept: 'application/rss+xml, application/xml' } }, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      })
      .on('error', reject);
  });
}

function extract(xml, re) {
  const match = xml.match(re);
  return match ? match[1] : '';
}

function parseRssEntries(xml, limit = 2) {
  const entries = xml.match(/<entry[^>]*>([\s\S]*?)<\/entry>/g) || [];
  return entries.slice(0, limit).map((entry) => {
    const id = extract(entry, /<yt:videoId>([^<]*)<\/yt:videoId>/);
    const title = extract(entry, /<title>([^<]*)<\/title>/);
    const publishedAt = extract(entry, /<published>([^<]*)<\/published>/);
    const description = extract(entry, /<media:description>([\s\S]*?)<\/media:description>/).trim();
    const thumbnail =
      extract(entry, /<media:thumbnail[^>]*url="([^"]+)"/) ||
      `https://i3.ytimg.com/vi/${id}/hqdefault.jpg`;
    const url =
      extract(entry, /<link[^>]*rel="alternate"[^>]*href="([^"]+)"/) ||
      extract(entry, /<link[^>]*href="([^"]+)"[^>]*rel="alternate"/) ||
      `https://www.youtube.com/watch?v=${id}`;
    return { id, title, publishedAt, description, thumbnail, url };
  });
}

async function fetchLatestVideos(limit = 2) {
  const xml = await get(RSS_URL);
  return parseRssEntries(xml, limit);
}

module.exports = { fetchLatestVideos, parseRssEntries };
