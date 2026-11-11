/**
 * Claude API 호출 래퍼 (위키 수정안 생성용).
 *
 * 모델 ID는 환경변수(ANTHROPIC_MODEL)로 뺐습니다. 모델 이름이 바뀌어도
 * Vercel 환경변수 값만 고치면 되고 코드는 건드릴 필요가 없습니다.
 */
import Anthropic from "@anthropic-ai/sdk";

const DEFAULT_MODEL = "claude-sonnet-5-5";

/** 위키 수정안을 만드는 모델. claude 로 시작하지 않는 값(예전 gpt-… 설정)은 무시합니다. */
export const CHAT_MODEL = (() => {
  const v = (process.env.ANTHROPIC_MODEL || "").trim();
  return v.startsWith("claude") ? v : DEFAULT_MODEL;
})();

export class ClaudeError extends Error {}

/** propose 라우트의 maxDuration(120초) 안에 끝나도록 잡은 요청 제한 시간(ms) */
const TIMEOUT_MS = 110_000;
/** 파일 전체 내용을 여러 개 돌려받으므로 넉넉하게 잡습니다. */
const MAX_TOKENS = 32_000;

function apiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new ClaudeError(
      "ANTHROPIC_API_KEY 가 설정되지 않았어요. (Vercel 환경변수를 확인해주세요)"
    );
  }
  return key;
}

/** 모델이 코드펜스로 감싼 JSON을 돌려주는 경우가 있어 벗겨냅니다. */
function stripFence(text: string): string {
  const fenced = text.match(/^\s*```(?:json)?\s*\n([\s\S]*?)\n?\s*```\s*$/);
  return (fenced ? fenced[1] : text).trim();
}

/**
 * JSON 응답을 요구하는 채팅 호출. 파싱까지 끝난 객체를 돌려줍니다.
 *
 * schema 는 응답 형식을 강제하는 JSON 스키마입니다
 * (모든 object 에 additionalProperties: false 와 전체 required 가 필요).
 */
export async function chatJSON<T>(
  system: string,
  user: string,
  schema: Record<string, unknown>
): Promise<T> {
  const client = new Anthropic({
    apiKey: apiKey(),
    maxRetries: 0,
    timeout: TIMEOUT_MS,
  });

  let msg: Anthropic.Beta.BetaMessage;
  try {
    msg = await client.beta.messages.create({
      model: CHAT_MODEL,
      max_tokens: MAX_TOKENS,
      system,
      messages: [{ role: "user", content: user }],
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema },
      },
    });
  } catch (e: unknown) {
    if (e instanceof Anthropic.APIConnectionTimeoutError) {
      throw new ClaudeError("Claude 응답이 너무 오래 걸려서 중단했어요. 잠시 뒤 다시 시도해주세요.");
    }
    if (e instanceof Anthropic.APIConnectionError) {
      throw new ClaudeError("Claude 서버에 연결하지 못했어요. 잠시 뒤 다시 시도해주세요.");
    }
    if (e instanceof Anthropic.APIError) {
      throw new ClaudeError(
        `Claude 호출 실패 (${e.status}) — 모델 ID(${CHAT_MODEL})와 API 키를 확인해주세요. ${String(e.message).slice(0, 300)}`
      );
    }
    throw e;
  }

  if (msg.stop_reason === "refusal") {
    throw new ClaudeError("Claude 가 이 요청에 대한 응답을 거절했어요.");
  }
  if (msg.stop_reason === "max_tokens") {
    throw new ClaudeError(
      "Claude 응답이 너무 길어서 중간에 잘렸어요. 반영할 내용을 나눠서 다시 시도해주세요."
    );
  }

  const text = msg.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  if (!text.trim()) throw new ClaudeError("Claude 가 빈 응답을 보냈어요.");

  try {
    return JSON.parse(stripFence(text)) as T;
  } catch {
    throw new ClaudeError(
      `Claude 응답이 JSON 형식이 아니에요: ${text.slice(0, 300)}`
    );
  }
}
