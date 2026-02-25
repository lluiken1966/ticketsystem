/**
 * Bitbucket REST API v2 client.
 * Uses a personal access token for authentication.
 */

const BASE = "https://api.bitbucket.org/2.0";

function getConfig() {
  const token = process.env.BITBUCKET_TOKEN;
  const workspace = process.env.BITBUCKET_WORKSPACE;
  const repo = process.env.BITBUCKET_REPO;
  if (!token || !workspace || !repo) {
    throw new Error(
      "Missing Bitbucket env vars: BITBUCKET_TOKEN, BITBUCKET_WORKSPACE, BITBUCKET_REPO"
    );
  }
  return { token, workspace, repo };
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
}

/**
 * Encode each path segment individually so that "/" separators are preserved
 * while special characters within segment names are safely encoded.
 * e.g. "src/auth/login feature.ts" → "src/auth/login%20feature.ts"
 */
function encodePath(filePath: string): string {
  return filePath
    .split("/")
    .map(encodeURIComponent)
    .join("/");
}

/**
 * List all files in the repo (flat, paginated).
 * Returns at most maxFiles paths.
 */
export async function listRepoFiles(maxFiles = 500): Promise<string[]> {
  const { token, workspace, repo } = getConfig();
  const files: string[] = [];
  let url: string = `${BASE}/repositories/${workspace}/${repo}/src?pagelen=100`;

  while (url && files.length < maxFiles) {
    const res = await fetch(url, { headers: authHeaders(token) });
    if (!res.ok) {
      throw new Error(`Bitbucket API error: ${res.status} ${await res.text()}`);
    }
    const data = await res.json();

    for (const item of data.values || []) {
      if (item.type === "commit_file") {
        files.push(item.path);
      }
    }

    url = data.next || "";
  }

  return files;
}

/**
 * Filter a pre-fetched file list by keyword (substring match on path).
 * Accepts an already-fetched file list to avoid redundant API calls.
 */
export function filterFilesByKeyword(files: string[], keyword: string): string[] {
  const kw = keyword.toLowerCase();
  return files.filter((f) => f.toLowerCase().includes(kw));
}

/**
 * Fetch the raw content of a file from the default branch (HEAD).
 */
export async function getFileContent(filePath: string): Promise<string> {
  const { token, workspace, repo } = getConfig();
  const url = `${BASE}/repositories/${workspace}/${repo}/src/HEAD/${encodePath(filePath)}`;
  const res = await fetch(url, { headers: authHeaders(token) });
  if (!res.ok) {
    throw new Error(`Cannot fetch file ${filePath}: ${res.status}`);
  }
  return res.text();
}

/**
 * Build a Bitbucket deep-link to a specific file and line range.
 */
export function buildDeepLink(
  workspace: string,
  repo: string,
  filePath: string,
  startLine: number,
  endLine: number
): string {
  return `https://bitbucket.org/${workspace}/${repo}/src/HEAD/${encodePath(filePath)}#lines-${startLine}:${endLine}`;
}
