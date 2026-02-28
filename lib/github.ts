/**
 * GitHub REST API v3 client.
 * Uses a personal access token for authentication.
 */

const BASE = "https://api.github.com";

function getConfig() {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  if (!token || !owner || !repo) {
    throw new Error(
      "Missing GitHub env vars: GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO"
    );
  }
  return { token, owner, repo };
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

/**
 * List all files in the repo using the Git Trees API (recursive).
 * Returns at most maxFiles paths.
 */
export async function listRepoFiles(maxFiles = 500): Promise<string[]> {
  const { token, owner, repo } = getConfig();
  const url = `${BASE}/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`;
  const res = await fetch(url, { headers: authHeaders(token) });
  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return (data.tree as { path: string; type: string }[])
    .filter((item) => item.type === "blob")
    .map((item) => item.path)
    .slice(0, maxFiles);
}

/**
 * Filter a pre-fetched file list by keyword (substring match on path).
 */
export function filterFilesByKeyword(files: string[], keyword: string): string[] {
  const kw = keyword.toLowerCase();
  return files.filter((f) => f.toLowerCase().includes(kw));
}

/**
 * Fetch the raw content of a file from the default branch (HEAD).
 */
export async function getFileContent(filePath: string): Promise<string> {
  const { token, owner, repo } = getConfig();
  const url = `${BASE}/repos/${owner}/${repo}/contents/${filePath}`;
  const res = await fetch(url, { headers: authHeaders(token) });
  if (!res.ok) {
    throw new Error(`Cannot fetch file ${filePath}: ${res.status}`);
  }
  const data = await res.json();
  // GitHub returns file content as base64-encoded string
  return Buffer.from(data.content, "base64").toString("utf-8");
}

/**
 * Build a GitHub deep-link to a specific file and line range.
 */
export function buildDeepLink(
  owner: string,
  repo: string,
  filePath: string,
  startLine: number,
  endLine: number
): string {
  return `https://github.com/${owner}/${repo}/blob/main/${filePath}#L${startLine}-L${endLine}`;
}
