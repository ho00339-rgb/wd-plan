"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        router.push("/");
        router.refresh();
      } else {
        setErr(data.error || "로그인 실패");
      }
    } catch {
      setErr("네트워크 오류");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1>💍 결혼 준비</h1>
        <p>호연 ♥ 예준 · 둘만의 공간</p>
        <form onSubmit={submit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            autoFocus
          />
          <div className="err">{err}</div>
          <button type="submit" disabled={loading || !password}>
            {loading ? "확인 중…" : "들어가기"}
          </button>
        </form>
      </div>
    </div>
  );
}
