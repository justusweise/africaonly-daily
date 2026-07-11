const fs = require('fs');
const path = require('path');
const https = require('https');
const { fetchLatestVideos } = require('./scrape');

const OWNER = 'justusweise';
const REPO = 'africaonly-daily';
const FILE_PATH = 'public/videos.json';
const BRANCH = 'main';
const DEPLOY_HOOK_URL =
  'https://api.vercel.com/v1/integrations/deploy/prj_xfWLFNhthRF414gyV1GWk4lXRYid/Ds8ObMbU3Y';
const PROJECT_ID = 'prj_xfWLFNhthRF414gyV1GWk4lXRYid';
const TEAM_ID = 'team_yhgjL642i8k8ypFlVegrJuzG';

function request(method, url, headers, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method, headers }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null });
        } else {
          reject(new Error(`${method} ${url} -> ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function getFileSha(token) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(
    FILE_PATH
  )}?ref=${BRANCH}`;
  try {
    const res = await request('GET', url, {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'africaonly-daily-automation',
    });
    return res.body.sha;
  } catch (err) {
    if (err.message.includes('404')) return null;
    throw err;
  }
}

async function updateFile(token, content, sha) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(FILE_PATH)}`;
  const body = {
    message: `daily: update ${FILE_PATH} with latest 2 AfricaOnly videos`,
    content: Buffer.from(content).toString('base64'),
    branch: BRANCH,
  };
  if (sha) body.sha = sha;
  return request('PUT', url, {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'User-Agent': 'africaonly-daily-automation',
  }, body);
}

async function triggerDeploy() {
  return request('POST', DEPLOY_HOOK_URL, { Accept: 'application/json' });
}

async function waitForDeployment(token, timeoutMs = 300000) {
  const start = Date.now();
  const base = `https://api.vercel.com/v6/deployments?projectId=${PROJECT_ID}&target=production&limit=1`;
  const url = TEAM_ID ? `${base}&teamId=${TEAM_ID}` : base;
  while (Date.now() - start < timeoutMs) {
    const res = await request('GET', url, {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    });
    const d = res.body.deployments && res.body.deployments[0];
    if (!d) {
      await new Promise((r) => setTimeout(r, 5000));
      continue;
    }
    if (d.state === 'READY') return d;
    if (d.state === 'ERROR' || d.state === 'CANCELED') throw new Error(`Deployment ${d.state}: ${d.url}`);
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error('Timeout waiting for deployment');
}

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const vercelToken = process.env.VERCEL_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN is required');
  if (!vercelToken) throw new Error('VERCEL_TOKEN is required');

  const videos = await fetchLatestVideos(2);
  const store = {
    updatedAt: new Date().toISOString(),
    videos,
  };
  const content = JSON.stringify(store, null, 2) + '\n';

  const sha = await getFileSha(token);
  await updateFile(token, content, sha);
  console.log(`Updated ${FILE_PATH} on ${BRANCH}`);

  await triggerDeploy();
  console.log('Triggered Vercel production deploy');

  const deployment = await waitForDeployment(vercelToken);
  const result = {
    success: true,
    updatedAt: store.updatedAt,
    videos: videos.map((v) => ({ id: v.id, title: v.title })),
    deployment: {
      url: `https://${deployment.url}`,
      state: deployment.state,
      readyState: deployment.readyState,
    },
  };
  console.log(JSON.stringify(result, null, 2));
  return result;
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
