import { fetchLatestVideos } from '@/lib/scraper';
import type { Video } from '@/lib/types';

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export default async function Home() {
  const videos: Video[] = await fetchLatestVideos(2);
  const updatedAt = new Date().toISOString();

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 px-6 py-16">
      <div className="max-w-5xl mx-auto">
        <header className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">
            AfricaOnly Daily
          </h1>
          <p className="text-neutral-400">
            Die 2 neuesten Videos von{' '}
            <a
              href="https://africaonly.tv"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-white"
            >
              AfricaOnly.tv
            </a>
            {' '}auf YouTube
          </p>
          <p className="text-xs text-neutral-500 mt-4">
            Letztes Update: {formatDate(updatedAt)} · täglich um 10:00 Uhr (Europe/Berlin)
          </p>
        </header>

        {videos.length === 0 ? (
          <p className="text-center text-neutral-400">Noch keine Videos geladen.</p>
        ) : (
          <div className="grid gap-8 md:grid-cols-2">
            {videos.map((video) => (
              <article
                key={video.id}
                className="group rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800 hover:border-neutral-600 transition"
              >
                <a
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <div className="aspect-video overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  </div>
                  <div className="p-5">
                    <p className="text-xs text-neutral-500 mb-2">
                      {formatDate(video.publishedAt)}
                    </p>
                    <h2 className="text-lg font-semibold leading-snug mb-2 group-hover:text-emerald-400 transition">
                      {video.title}
                    </h2>
                    <p className="text-sm text-neutral-400 line-clamp-3">
                      {video.description || 'Keine Beschreibung verfügbar.'}
                    </p>
                  </div>
                </a>
              </article>
            ))}
          </div>
        )}

        <footer className="mt-16 text-center text-sm text-neutral-600">
          <p>
            Quelle: YouTube RSS Feed für{' '}
            <span className="font-mono">@africaonlytv</span>
          </p>
        </footer>
      </div>
    </main>
  );
}
