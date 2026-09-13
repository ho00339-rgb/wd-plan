import { transcribe, OpenAIError } from "@/lib/openai";
import { checkUpdateSecret } from "@/lib/updateAuth";

export const runtime = "nodejs";
export const maxDuration = 60;

/** 25MB — OpenAI 오디오 업로드 상한과 맞춥니다. */
const MAX_BYTES = 25 * 1024 * 1024;

export async function POST(req: Request) {
  const denied = checkUpdateSecret(req);
  if (denied) {
    return Response.json({ error: denied.error }, { status: denied.status });
  }

  let file: File | null = null;
  try {
    const form = await req.formData();
    const value = form.get("audio");
    if (value instanceof File) file = value;
  } catch {
    return Response.json({ error: "요청 형식이 올바르지 않아요." }, { status: 400 });
  }

  if (!file || file.size === 0) {
    return Response.json({ error: "오디오 파일이 비어 있어요." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json(
      { error: "오디오가 25MB를 넘어요. 나눠서 올려주세요." },
      { status: 413 }
    );
  }

  try {
    const text = await transcribe(file);
    return Response.json({ text });
  } catch (e: unknown) {
    const msg =
      e instanceof OpenAIError ? e.message : "음성 변환 중 오류가 났어요.";
    return Response.json({ error: msg }, { status: 502 });
  }
}
