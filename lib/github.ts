/**
 * GitHub 저장소에 파일 여러 개를 커밋 하나로 반영합니다.
 *
 * Contents API 는 파일당 커밋이 하나씩 생겨서, 여기서는 Git Data API
 * (blob → tree → commit → ref) 를 써서 한 번에 묶습니다.
 */

const API = "https://api.github.com";

export class GitHubError extends Error {}

export type FileChange = { path: string; content: string };

type RepoConfig = { owner: string; repo: string; branch: string; token: string };

function config(): RepoConfig {
  const token = process.env.GITHUB_TOKEN;
  const slug = process.env.GITHUB_REPO; // "owner/repo"
  if (!token) {
    throw new GitHubError(
      "GITHUB_TOKEN 이 설정되지 않았어요. (Vercel 환경변수를 확인해주세요)"
    );
  }
  if (!slug || !slug.includes("/")) {
    throw new GitHubError(
      'GITHUB_REPO 를 "owner/repo" 형식으로 설정해주세요. (예: ho00339-rgb/wd-plan)'
    );
  }
  const [owner, repo] = slug.split("/", 2);
  return {
    owner,
    repo,
    branch: process.env.GITHUB_BRANCH || "main",
    token,
  };
}

async function gh<T>(
  cfg: RepoConfig,
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${cfg.token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const raw = await res.text();
  if (!res.ok) {
    throw new GitHubError(
      `GitHub API 실패 (${res.status} ${path}): ${raw.slice(0, 300)}`
    );
  }
  return raw ? (JSON.parse(raw) as T) : ({} as T);
}

/**
 * 변경된 파일들을 커밋 하나로 푸시하고 커밋 URL 을 돌려줍니다.
 * 푸시가 끝나면 Vercel 이 재배포를 자동으로 시작합니다.
 */
export async function commitFiles(
  changes: FileChange[],
  message: string
): Promise<{ sha: string; url: string }> {
  if (changes.length === 0) throw new GitHubError("커밋할 변경이 없어요.");
  const cfg = config();
  const base = `/repos/${cfg.owner}/${cfg.repo}`;

  // 1) 현재 브랜치 끝 커밋
  const ref = await gh<{ object: { sha: string } }>(
    cfg,
    `${base}/git/ref/heads/${cfg.branch}`
  );
  const headSha = ref.object.sha;

  const headCommit = await gh<{ tree: { sha: string } }>(
    cfg,
    `${base}/git/commits/${headSha}`
  );

  // 2) 파일마다 blob 생성 (한글이 있으니 base64 로 올립니다)
  const blobs = await Promise.all(
    changes.map(async (c) => {
      const blob = await gh<{ sha: string }>(cfg, `${base}/git/blobs`, {
        method: "POST",
        body: JSON.stringify({
          content: Buffer.from(c.content, "utf8").toString("base64"),
          encoding: "base64",
        }),
      });
      return { path: c.path, sha: blob.sha };
    })
  );

  // 3) 기존 트리 위에 얹은 새 트리
  const tree = await gh<{ sha: string }>(cfg, `${base}/git/trees`, {
    method: "POST",
    body: JSON.stringify({
      base_tree: headCommit.tree.sha,
      tree: blobs.map((b) => ({
        path: b.path,
        mode: "100644",
        type: "blob",
        sha: b.sha,
      })),
    }),
  });

  // 4) 커밋
  const commit = await gh<{ sha: string; html_url: string }>(
    cfg,
    `${base}/git/commits`,
    {
      method: "POST",
      body: JSON.stringify({
        message,
        tree: tree.sha,
        parents: [headSha],
      }),
    }
  );

  // 5) 브랜치 끝을 새 커밋으로 이동
  await gh(cfg, `${base}/git/refs/heads/${cfg.branch}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: commit.sha, force: false }),
  });

  return { sha: commit.sha, url: commit.html_url };
}
