import { NextResponse } from 'next/server';
import { fetchLatestVideos } from '@/lib/scraper';

const CRON_SECRET = process.env.CRON_SECRET;
const DEPLOY_HOOK = process.env.DEPLOY_HOOK;

export async function GET(request: Request) {
  if (CRON_SECRET) {
    const auth = request.headers.get('authorization') ?? '';
    if (!auth.startsWith('Bearer ') || auth.slice(7) !== CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const latestVideos = await fetchLatestVideos(2);

    if (!DEPLOY_HOOK) {
      return NextResponse.json(
        { ok: false, error: 'DEPLOY_HOOK not configured' },
        { status: 500 }
      );
    }

    const deployRes = await fetch(DEPLOY_HOOK, { method: 'POST' });
    if (!deployRes.ok) {
      throw new Error(`Deploy hook failed: ${deployRes.status} ${deployRes.statusText}`);
    }

    return NextResponse.json({
      ok: true,
      videos: latestVideos,
      deployedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Cron automation failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
