const { fetchLatestVideos } = require('./lib/scrape');
const { getFileSha, updateFile } = require('./lib/github');
const { getLatestDeployment, waitForNewDeployment } = require('./lib/vercel');

const CONFIG = {
  owner: 'justusweise',
  repo: 'africaonly-daily',
  filePath: 'public/videos.json',
  branch: 'main',
  projectId: 'prj_xfWLFNhthRF414gyV1GWk4lXRYid',
  teamId: 'team_yhgjL642i8k8ypFlVegrJuzG',
};

async function run() {
  const githubToken = process.env.GITHUB_TOKEN;
  const vercelToken = process.env.VERCEL_TOKEN;

  if (!githubToken) throw new Error('GITHUB_TOKEN is required');
  if (!vercelToken) throw new Error('VERCEL_TOKEN is required');

  const previousDeployment = await getLatestDeployment({
    projectId: CONFIG.projectId,
    teamId: CONFIG.teamId,
    token: vercelToken,
  });
  const previousUid = previousDeployment ? previousDeployment.uid : null;

  const videos = await fetchLatestVideos(2);
  const store = {
    updatedAt: new Date().toISOString(),
    videos,
  };
  const content = JSON.stringify(store, null, 2) + '\n';

  const sha = await getFileSha({ ...CONFIG, token: githubToken });
  await updateFile({
    ...CONFIG,
    token: githubToken,
    content,
    message: `daily: update ${CONFIG.filePath} with latest 2 AfricaOnly videos`,
    sha,
  });

  console.log(`Updated ${CONFIG.filePath} on ${CONFIG.branch}; waiting for Git-triggered Vercel deploy...`);

  const deployment = await waitForNewDeployment({
    projectId: CONFIG.projectId,
    teamId: CONFIG.teamId,
    token: vercelToken,
    previousUid,
    timeoutMs: 300000,
  });

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

run().catch((err) => {
  const errorResult = { success: false, error: err.message };
  console.error(JSON.stringify(errorResult));
  process.exit(1);
});
