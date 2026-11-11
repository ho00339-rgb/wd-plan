/**
 * OpenAI 호출 래퍼 — 음성 → 텍스트 변환 전용.
 *
 * 위키 수정안 생성(채팅)은 Claude 로 옮겼습니다 (lib/claude.ts).
 * Claude API 에는 음성 인식이 없어서 변환만 OpenAI 를 계속 씁니다.
 *
 * 모델 ID는 환경변수로 뺐습니다. OpenAI 쪽 모델 이름이 바뀌어도
 * Vercel 환경변수 값만 고치면 되고 코드는 건드릴 필요가 없습니다.
 */

const API_BASE = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

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
