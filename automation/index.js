const { fetchRandomVideos } = require('./lib/scrape');
const { getFile, updateFile } = require('./lib/github');
const { getLatestDeployment, waitForNewDeployment } = require('./lib/vercel');

const CONFIG = {
  owner: 'justusweise',
  repo: 'africaonly-daily',
  path: 'public/videos.json',
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
  const currentFile = await getFile({ ...CONFIG, token: githubToken });
  let previousIds = [];
  try {
    previousIds = JSON.parse(currentFile.content).videos.map((video) => video.id);
  } catch {}

  const videos = await fetchRandomVideos(2, previousIds);
  const store = {
    updatedAt: new Date().toISOString(),
    videos,
  };
  const content = JSON.stringify(store, null, 2) + '\n';

  const deploymentAfter = Date.now();
  const update = await updateFile({
    ...CONFIG,
    token: githubToken,
    content,
    message: 'daily: rotate 2 random AfricaOnly videos',
    sha: currentFile.sha,
  });
  const commitSha = update.body?.commit?.sha || '';

  console.log(`Updated ${CONFIG.path} on ${CONFIG.branch}; waiting for Git-triggered Vercel deploy...`);

  const deployment = await waitForNewDeployment({
    projectId: CONFIG.projectId,
    teamId: CONFIG.teamId,
    token: vercelToken,
    previousUid: previousDeployment ? previousDeployment.uid : null,
    after: deploymentAfter,
    commitSha,
    timeoutMs: 300000,
  });

  const result = {
    success: true,
    updatedAt: store.updatedAt,
    videos: videos.map((v) => ({ id: v.id, title: v.title })),
    commitSha,
    siteUrl: 'https://africaonly-daily.vercel.app',
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
