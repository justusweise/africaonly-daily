const https = require('https');

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

async function getLatestDeployment({ projectId, teamId, token }) {
  const base = `https://api.vercel.com/v6/deployments?projectId=${projectId}&target=production&limit=1`;
  const url = teamId ? `${base}&teamId=${teamId}` : base;
  const res = await request('GET', url, {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  });
  return res.body.deployments && res.body.deployments[0];
}

function createdAtMs(deployment) {
  const value = Number(deployment.created || deployment.createdAt || 0);
  return value > 0 && value < 1_000_000_000_000 ? value * 1000 : value;
}

async function waitForNewDeployment({
  projectId,
  teamId,
  token,
  previousUid,
  after,
  commitSha,
  timeoutMs = 300000,
}) {
  const start = Date.now();
  const base = `https://api.vercel.com/v6/deployments?projectId=${projectId}&target=production&limit=5`;
  const url = teamId ? `${base}&teamId=${teamId}` : base;
  while (Date.now() - start < timeoutMs) {
    const res = await request('GET', url, {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    });
    const deployments = res.body.deployments || [];
    const d = deployments.find((dep) => {
      if (dep.uid === previousUid || createdAtMs(dep) < after - 5000) return false;
      const deployedSha = dep.meta && dep.meta.githubCommitSha;
      return !commitSha || !deployedSha || deployedSha === commitSha;
    });
    if (!d) {
      await new Promise((r) => setTimeout(r, 5000));
      continue;
    }
    const state = d.readyState || d.state;
    if (state === 'READY') return d;
    if (state === 'ERROR' || state === 'CANCELED') {
      throw new Error(`Deployment ${state}: ${d.url}`);
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error('Timeout waiting for new deployment');
}

module.exports = { request, getLatestDeployment, waitForNewDeployment };
