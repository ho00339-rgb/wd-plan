import { commitFiles, GitHubError } from "@/lib/github";
import { DASHBOARD_PATH } from "@/lib/dashboard";
import { checkUpdateSecret } from "@/lib/updateAuth";

export const runtime = "nodejs";
export const maxDuration = 60;

/** propose 와 같은 화이트리스트. 클라이언트가 보낸 값을 그대로 믿지 않습니다. */
function isAllowedPath(p: string): boolean {
  if (p.includes("..") || p.startsWith("/")) return false;
  return /^wiki\/[^/]+\.md$/.test(p) || p === DASHBOARD_PATH;
}

export async function POST(req: Request) {
  const denied = checkUpdateSecret(req);
  if (denied) {
    return Response.json({ error: denied.error }, { status: denied.status });
  }

  let changes: { path: string; content: string }[] = [];
  let summary = "";
  try {
    const body = await req.json();
    changes = Array.isArray(body?.changes) ? body.changes : [];
    summary = typeof body?.summary === "string" ? body.summary.trim() : "";
  } catch {
    return Response.json({ error: "요청 형식이 올바르지 않아요." }, { status: 400 });
  }

  const clean = changes.filter(
    (c) =>
      c &&
      typeof c.path === "string" &&
      typeof c.content === "string" &&
      c.content.length > 0 &&
      isAllowedPath(c.path)
  );
  if (clean.length === 0) {
    return Response.json({ error: "반영할 변경이 없어요." }, { status: 400 });
  }

  // dashboard.json 은 깨진 JSON 이 올라가면 대시보드가 통째로 빈 화면이 되므로 미리 검사합니다.
  const dash = clean.find((c) => c.path === DASHBOARD_PATH);
  if (dash) {
    try {
      JSON.parse(dash.content);
    } catch {
      return Response.json(
        { error: "대시보드 JSON 형식이 깨져 있어서 반영하지 않았어요." },
        { status: 422 }
      );
    }
  }

  const title = summary.split("\n")[0].slice(0, 72) || "위키 업데이트";
  const message = [
    `docs(wiki): ${title}`,
    "",
    summary,
    "",
    `변경 파일: ${clean.map((c) => c.path).join(", ")}`,
    "",
    "Updated via AI 업데이트 기능",
  ].join("\n");

  try {
    const commit = await commitFiles(clean, message);
    return Response.json({
      ok: true,
      sha: commit.sha.slice(0, 7),
      url: commit.url,
      files: clean.map((c) => c.path),
    });
  } catch (e: unknown) {
    const msg =
      e instanceof GitHubError ? e.message : "커밋 중 오류가 났어요.";
    return Response.json({ error: msg }, { status: 502 });
  }
}
