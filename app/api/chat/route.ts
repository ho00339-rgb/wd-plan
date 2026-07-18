import Anthropic from "@anthropic-ai/sdk";
import { getWikiContext } from "@/lib/wiki";

export const runtime = "nodejs";

type Msg = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY 가 설정되지 않았어요. (배포 환경변수를 확인해주세요)" },
      { status: 500 }
    );
  }

  let messages: Msg[] = [];
  try {
    const body = await req.json();
    messages = Array.isArray(body?.messages) ? body.messages : [];
  } catch {
    return Response.json({ error: "요청 형식이 올바르지 않아요." }, { status: 400 });
  }
  // 안전장치: 마지막 20개만, user/assistant 만
  const clean = messages
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-20);
  if (clean.length === 0) {
    return Response.json({ error: "질문 내용이 비어 있어요." }, { status: 400 });
  }

  const context = getWikiContext();
  const system = [
    "너는 호연과 예준의 결혼 준비를 돕는 다정하고 간결한 도우미야.",
    "반드시 아래 <위키> 내용을 근거로만 답해. 위키에 없는 내용은 추측하지 말고 '아직 위키에 정리 안 된 내용'이라고 솔직히 말해.",
    "한국어로, 핵심만 짧고 명확하게. 필요하면 목록으로.",
    "'결정됨 / 논의 중 / 서칭 필요' 상태를 구분해서 알려주면 좋아.",
    "",
    "<위키>",
    context,
    "</위키>",
  ].join("\n");

  try {
    const client = new Anthropic({ apiKey });
    const resp = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
      max_tokens: 1024,
      system,
      messages: clean.map((m) => ({ role: m.role, content: m.content })),
    });
    const text = resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    return Response.json({ text: text || "(빈 응답이 왔어요)" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "알 수 없는 오류";
    return Response.json({ error: `LLM 호출 실패: ${msg}` }, { status: 502 });
  }
}
