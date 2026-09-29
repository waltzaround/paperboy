// Minimal GitHub REST helpers for reading repo files and committing several
// files in a single commit. Uses only fetch, so it runs in Node and Workers.

function githubHeaders(token) {
  return {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Paperboy-Scraper',
    'Content-Type': 'application/json'
  };
}

async function githubRequest({ token, repo }, pathname, init = {}) {
  const response = await fetch(`https://api.github.com/repos/${repo}${pathname}`, {
    ...init,
    headers: githubHeaders(token)
  });
  if (!response.ok) {
    throw new Error(`GitHub ${init.method || 'GET'} ${pathname} failed: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

// Read a text file from the branch, or null if it does not exist
export async function readRepoFile(config, filePath, branch = 'main') {
  const response = await fetch(
    `https://api.github.com/repos/${config.repo}/contents/${filePath}?ref=${branch}`,
    { headers: { ...githubHeaders(config.token), 'Accept': 'application/vnd.github.raw' } }
  );
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`GitHub read ${filePath} failed: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

// Commit files ([{ path, content }], content as a UTF-8 string) on top of the
// branch head and fast-forward the branch. Returns the new commit SHA.
export async function commitFiles(config, files, message, branch = 'main') {
  const ref = await githubRequest(config, `/git/ref/heads/${branch}`);
  const latestCommitSha = ref.object.sha;
  const latestCommit = await githubRequest(config, `/git/commits/${latestCommitSha}`);

  const tree = [];
  for (const file of files) {
    const blob = await githubRequest(config, '/git/blobs', {
      method: 'POST',
      body: JSON.stringify({ content: file.content, encoding: 'utf-8' })
    });
    tree.push({ path: file.path, mode: '100644', type: 'blob', sha: blob.sha });
  }

  const newTree = await githubRequest(config, '/git/trees', {
    method: 'POST',
    body: JSON.stringify({ base_tree: latestCommit.tree.sha, tree })
  });

  const newCommit = await githubRequest(config, '/git/commits', {
    method: 'POST',
    body: JSON.stringify({ message, tree: newTree.sha, parents: [latestCommitSha] })
  });

  await githubRequest(config, `/git/refs/heads/${branch}`, {
    method: 'PATCH',
    body: JSON.stringify({ sha: newCommit.sha })
  });

  return newCommit.sha;
}
