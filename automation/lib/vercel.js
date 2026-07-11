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

async function triggerDeploy(deployHookUrl) {
  return request('POST', deployHookUrl, { Accept: 'application/json' });
}

async function waitForDeployment({ projectId, teamId, token, timeoutMs = 300000 }) {
  const start = Date.now();
  const base = `https://api.vercel.com/v6/deployments?projectId=${projectId}&target=production&limit=1`;
  const url = teamId ? `${base}&teamId=${teamId}` : base;
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
    if (d.state === 'ERROR' || d.state === 'CANCELED') {
      throw new Error(`Deployment ${d.state}: ${d.url}`);
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error('Timeout waiting for deployment');
}

module.exports = { request, triggerDeploy, waitForDeployment };
