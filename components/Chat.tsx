"use client";

import { useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "우리 결혼식 어떻게 하기로 했지?",
  "신혼여행 계획 요약해줘",
  "지금 남은 할 일 뭐 있어?",
];

export default function Chat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  function scrollDown() {
    requestAnimationFrame(() => {
      if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    });
  }

  async function send(text: string) {
    const q = text.trim();
    if (!q || loading) return;
    const next = [...messages, { role: "user" as const, content: q }];
    setMessages(next);
    setInput("");
    setLoading(true);
    scrollDown();
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      const reply = res.ok
        ? data.text
        : data.error || "답변을 가져오지 못했어요.";
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "네트워크 오류가 났어요. 다시 시도해줘." },
      ]);
    } finally {
      setLoading(false);
      scrollDown();
    }
  }

  if (!open) {
    return (
      <button className="chat-fab" onClick={() => setOpen(true)} aria-label="도우미 열기">
        💬
      </button>
    );
  }

  return (
    <div className="chat-panel">
      <div className="chat-head">
        <span>💬 결혼 준비 도우미</span>
        <button onClick={() => setOpen(false)} aria-label="닫기">
          ×
        </button>
      </div>
      <div className="chat-body" ref={bodyRef}>
        {messages.length === 0 && (
          <div className="chat-hint">
            위키 내용을 바탕으로 답해줘요.
            <br />
            무엇이든 물어보세요.
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  style={{
                    background: "var(--accent-soft)",
                    border: "1px solid var(--border)",
                    borderRadius: 9,
                    padding: "7px 10px",
                    cursor: "pointer",
                    color: "var(--text)",
                    fontSize: 13,
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.role}`}>
            {m.content}
          </div>
        ))}
        {loading && <div className="chat-msg assistant">…</div>}
      </div>
      <form
        className="chat-form"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="질문을 입력하세요"
          autoFocus
        />
        <button type="submit" disabled={loading || !input.trim()}>
          전송
        </button>
      </form>
    </div>
  );
}
