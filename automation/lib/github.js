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

function contentUrl(owner, repo, path) {
  if (!path) throw new Error('GitHub path is required');
  return `https://api.github.com/repos/${owner}/${repo}/contents/${path
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`;
}

async function getFile({ owner, repo, path, branch, token }) {
  const res = await request('GET', `${contentUrl(owner, repo, path)}?ref=${branch}`, {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'africaonly-daily-automation',
  });
  return {
    sha: res.body.sha,
    content: Buffer.from(res.body.content.replace(/\s/g, ''), 'base64').toString('utf8'),
  };
}

async function updateFile({ owner, repo, path, branch, token, content, message, sha }) {
  const url = contentUrl(owner, repo, path);
  const body = {
    message,
    content: Buffer.from(content).toString('base64'),
    branch,
  };
  if (sha) body.sha = sha;
  return request('PUT', url, {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'User-Agent': 'africaonly-daily-automation',
  }, body);
}

module.exports = { request, getFile, updateFile };
