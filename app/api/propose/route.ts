import { getIndexPage, getNavPages } from "@/lib/wiki";
import { getDashboard, DASHBOARD_PATH } from "@/lib/dashboard";
import { chatJSON, OpenAIError, CHAT_MODEL } from "@/lib/openai";
import { checkUpdateSecret } from "@/lib/updateAuth";

export const runtime = "nodejs";
export const maxDuration = 120;

export type Proposal = {
  summary: string;
  changes: { path: string; content: string; reason: string }[];
};

/** 이 경로들만 AI 가 고칠 수 있습니다. */
function isAllowedPath(p: string): boolean {
  if (p.includes("..") || p.startsWith("/")) return false;
  return /^wiki\/[^/]+\.md$/.test(p) || p === DASHBOARD_PATH;
}

const SYSTEM = [
  "너는 호연과 예준의 결혼 준비 위키를 관리하는 편집자야.",
  "사용자가 새로 나눈 대화나 메모를 주면, 그 내용을 반영해서 어떤 파일을 어떻게 고쳐야 하는지 판단해.",
  "",
  "규칙:",
  "1. 실제로 바뀌어야 하는 파일만 고쳐. 내용이 그대로면 그 파일은 changes 에 넣지 마.",
  "2. 각 change 의 content 에는 그 파일의 '전체 새 내용'을 넣어. 일부만 넣거나 diff 를 쓰면 안 돼.",
  "3. 기존 문서의 말투·구조·이모지 상태 표기(✅ 🟡 🔴)를 그대로 유지해. 필요한 줄만 고쳐.",
  "4. 새 주제가 생기면 wiki/ 아래에 'NN-제목.md' 형식으로 새 파일을 만들어도 돼. 번호는 기존 것 다음 번호로.",
  "5. 새 문서를 만들면 wiki/README.md 의 목차 표에도 행을 추가해.",
  "6. 메모에 없는 사실을 지어내지 마. 애매하면 기존 내용을 그대로 두고 summary 에 확인이 필요하다고 적어.",
  `7. ${DASHBOARD_PATH} 는 대시보드 데이터야. 예산 금액, 진행 상태, 할 일, 예식 날짜가 바뀌면 여기도 같이 갱신해. JSON 구조(키 이름과 타입)는 절대 바꾸지 마.`,
  "8. status 값은 done / doing / todo / estimate 중 하나만 써.",
  `9. ${DASHBOARD_PATH} 를 고칠 때는 updatedAt 을 오늘 날짜(YYYY-MM-DD)로 바꿔.`,
  "",
  "반드시 아래 JSON 형식으로만 답해:",
  '{"summary": "무엇을 왜 바꿨는지 2~3문장 한국어 요약", "changes": [{"path": "wiki/01-결혼식.md", "content": "파일 전체 내용", "reason": "이 파일을 고친 이유 한 줄"}]}',
  "바꿀 게 없으면 changes 를 빈 배열로 두고 summary 에 이유를 적어.",
].join("\n");

export async function POST(req: Request) {
  const denied = checkUpdateSecret(req);
  if (denied) {
    return Response.json({ error: denied.error }, { status: denied.status });
  }

  let note = "";
  try {
    const body = await req.json();
    note = typeof body?.note === "string" ? body.note.trim() : "";
  } catch {
    return Response.json({ error: "요청 형식이 올바르지 않아요." }, { status: 400 });
  }
  if (!note) {
    return Response.json({ error: "반영할 내용이 비어 있어요." }, { status: 400 });
  }

  const index = getIndexPage();
  const pages = [...(index ? [index] : []), ...getNavPages()];
  const current = pages
    .map((p) => `--- 파일: wiki/${p.slug}.md ---\n${p.content}`)
    .join("\n\n");

  const user = [
    "# 현재 위키 전체",
    current,
    "",
    `--- 파일: ${DASHBOARD_PATH} ---`,
    JSON.stringify(getDashboard(), null, 2),
    "",
    "# 오늘 날짜",
    new Date().toISOString().slice(0, 10),
    "",
    "# 새로 반영할 내용 (대화 녹취 또는 메모)",
    note,
  ].join("\n");

  let proposal: Proposal;
  try {
    proposal = await chatJSON<Proposal>(SYSTEM, user);
  } catch (e: unknown) {
    const msg =
      e instanceof OpenAIError ? e.message : "수정안을 만드는 중 오류가 났어요.";
    return Response.json({ error: msg }, { status: 502 });
  }

  const changes = Array.isArray(proposal?.changes) ? proposal.changes : [];
  const clean = changes.filter(
    (c) =>
      c &&
      typeof c.path === "string" &&
      typeof c.content === "string" &&
      c.content.length > 0 &&
      isAllowedPath(c.path)
  );
  const rejected = changes.length - clean.length;

  return Response.json({
    summary: typeof proposal?.summary === "string" ? proposal.summary : "",
    changes: clean.map((c) => ({
      path: c.path,
      content: c.content,
      reason: typeof c.reason === "string" ? c.reason : "",
    })),
    model: CHAT_MODEL,
    // 허용되지 않은 경로를 모델이 제안했다면 조용히 버리지 않고 알려줍니다.
    rejected,
  });
}
