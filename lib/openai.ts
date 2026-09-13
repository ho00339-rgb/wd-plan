/**
 * OpenAI 호출 래퍼.
 *
 * 모델 ID는 전부 환경변수로 뺐습니다. OpenAI 쪽 모델 이름이 바뀌어도
 * Vercel 환경변수 값만 고치면 되고 코드는 건드릴 필요가 없습니다.
 */

const API_BASE = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

/** 위키 수정안을 만드는 모델 */
export const CHAT_MODEL = process.env.OPENAI_MODEL || "gpt-5.6-luna";
/** 오디오 → 텍스트 변환 모델 */
export const TRANSCRIBE_MODEL =
  process.env.OPENAI_TRANSCRIBE_MODEL || "whisper-1";

export class OpenAIError extends Error {}

function apiKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new OpenAIError(
      "OPENAI_API_KEY 가 설정되지 않았어요. (Vercel 환경변수를 확인해주세요)"
    );
  }
  return key;
}

/** 모델이 코드펜스로 감싼 JSON을 돌려주는 경우가 있어 벗겨냅니다. */
function stripFence(text: string): string {
  const fenced = text.match(/^\s*```(?:json)?\s*\n([\s\S]*?)\n?\s*```\s*$/);
  return (fenced ? fenced[1] : text).trim();
}

/** JSON 응답을 요구하는 채팅 호출. 파싱까지 끝난 객체를 돌려줍니다. */
export async function chatJSON<T>(
  system: string,
  user: string
): Promise<T> {
  const res = await fetch(`${API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey()}`,
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  const raw = await res.text();
  if (!res.ok) {
    throw new OpenAIError(
      `OpenAI 호출 실패 (${res.status}) — 모델 ID(${CHAT_MODEL})와 API 키를 확인해주세요. ${raw.slice(0, 300)}`
    );
  }

  let text: string;
  try {
    const body = JSON.parse(raw);
    text = body?.choices?.[0]?.message?.content ?? "";
  } catch {
    throw new OpenAIError("OpenAI 응답을 읽지 못했어요.");
  }
  if (!text.trim()) throw new OpenAIError("OpenAI 가 빈 응답을 보냈어요.");

  try {
    return JSON.parse(stripFence(text)) as T;
  } catch {
    throw new OpenAIError(
      `OpenAI 응답이 JSON 형식이 아니에요: ${text.slice(0, 300)}`
    );
  }
}

/** 오디오 파일을 텍스트로 변환합니다. */
export async function transcribe(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  form.append("model", TRANSCRIBE_MODEL);
  // 한국어 대화 녹음이 대부분이라 힌트를 줍니다.
  form.append("language", "ko");

  const res = await fetch(`${API_BASE}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey()}` },
    body: form,
  });

  const raw = await res.text();
  if (!res.ok) {
    throw new OpenAIError(
      `음성 변환 실패 (${res.status}) — 모델 ID(${TRANSCRIBE_MODEL})를 확인해주세요. ${raw.slice(0, 300)}`
    );
  }

  try {
    const body = JSON.parse(raw);
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    if (!text) throw new Error();
    return text;
  } catch {
    throw new OpenAIError("음성에서 텍스트를 뽑아내지 못했어요.");
  }
}
