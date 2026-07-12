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

function parseRssEntries(xml) {
  const entries = xml.match(/<entry[^>]*>([\s\S]*?)<\/entry>/g) || [];
  return entries.map((entry) => {
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
  }).filter((video) => video.id);
}

function pickRandomVideos(videos, limit, previousIds = [], random = Math.random) {
  if (videos.length < limit) throw new Error('Not enough videos in feed');
  const previous = new Set(previousIds);
  const fresh = videos.filter((video) => !previous.has(video.id));
  const pool = (fresh.length >= limit ? fresh : videos).slice();
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [pool[index], pool[swap]] = [pool[swap], pool[index]];
  }
  return pool.slice(0, limit);
}

async function fetchRandomVideos(limit = 2, previousIds = []) {
  const xml = await get(RSS_URL);
  return pickRandomVideos(parseRssEntries(xml), limit, previousIds);
}

module.exports = { fetchRandomVideos, parseRssEntries, pickRandomVideos };
