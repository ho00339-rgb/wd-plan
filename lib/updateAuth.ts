/**
 * 업데이트 기능 전용 인증.
 *
 * 위키 "읽기"는 누구나 할 수 있지만, 아래 엔드포인트들은 OpenAI 비용을 쓰고
 * GitHub 저장소에 커밋까지 하기 때문에 보호가 필요합니다.
 *
 * UPDATE_SECRET 이 설정되지 않으면 기능 자체가 꺼집니다 (fail-closed).
 * 실수로 비밀키를 안 넣었을 때 무방비로 열리는 쪽보다 꺼지는 쪽이 안전합니다.
 */

export const UPDATE_HEADER = "x-update-secret";

export type AuthFailure = { status: number; error: string };

export function checkUpdateSecret(req: Request): AuthFailure | null {
  const expected = process.env.UPDATE_SECRET;
  if (!expected) {
    return {
      status: 503,
      error:
        "업데이트 기능이 꺼져 있어요. Vercel 환경변수에 UPDATE_SECRET 을 설정하면 켜집니다.",
    };
  }
  const got = req.headers.get(UPDATE_HEADER) || "";
  if (got !== expected) {
    return { status: 401, error: "업데이트 비밀키가 맞지 않아요." };
  }
  return null;
}
