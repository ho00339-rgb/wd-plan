"use client";

import { useRef, useState } from "react";

type Change = { path: string; content: string; reason: string };
type Proposal = { summary: string; changes: Change[]; model?: string; rejected?: number };
type Applied = { sha: string; url: string; files: string[] };

const SECRET_KEY = "wd_update_secret";

function loadSecret(): string {
  try {
    return localStorage.getItem(SECRET_KEY) || "";
  } catch {
    return "";
  }
}

export default function UpdatePanel() {
  const [secret, setSecret] = useState("");
  const [secretReady, setSecretReady] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"" | "transcribe" | "propose" | "apply">("");
  const [recording, setRecording] = useState(false);
  const [err, setErr] = useState("");
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [openFile, setOpenFile] = useState<string | null>(null);
  const [applied, setApplied] = useState<Applied | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  // 첫 렌더에서 저장된 비밀키를 한 번만 읽어옵니다.
  if (!secretReady) {
    const saved = loadSecret();
    setSecret(saved);
    setSecretReady(true);
  }

  function headers(json = true): HeadersInit {
    return {
      ...(json ? { "Content-Type": "application/json" } : {}),
      "x-update-secret": secret,
    };
  }

  function rememberSecret(value: string) {
    setSecret(value);
    try {
      localStorage.setItem(SECRET_KEY, value);
    } catch {
      /* 시크릿 모드 등에서 저장이 막혀도 이번 세션에는 동작합니다 */
    }
  }

  async function sendAudio(blob: Blob, filename: string) {
    setErr("");
    setBusy("transcribe");
    try {
      const form = new FormData();
      form.append("audio", new File([blob], filename, { type: blob.type }));
      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: headers(false),
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "음성 변환 실패");
      setNote((prev) => (prev ? `${prev}\n\n${data.text}` : data.text));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "음성 변환 실패");
    } finally {
      setBusy("");
    }
  }

  async function toggleRecording() {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    setErr("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const blob = new Blob(chunksRef.current, {
          type: rec.mimeType || "audio/webm",
        });
        if (blob.size > 0) void sendAudio(blob, "recording.webm");
      };
      rec.start();
      recorderRef.current = rec;
      setRecording(true);
    } catch {
      setErr("마이크를 쓸 수 없어요. 아래에서 오디오 파일을 올려주세요.");
    }
  }

  async function propose() {
    setErr("");
    setApplied(null);
    setProposal(null);
    setBusy("propose");
    try {
      const res = await fetch("/api/propose", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "수정안 생성 실패");
      setProposal(data);
      const all: Record<string, boolean> = {};
      for (const c of data.changes as Change[]) all[c.path] = true;
      setPicked(all);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "수정안 생성 실패");
    } finally {
      setBusy("");
    }
  }

  async function apply() {
    if (!proposal) return;
    const changes = proposal.changes.filter((c) => picked[c.path]);
    if (changes.length === 0) {
      setErr("반영할 파일을 하나 이상 선택해주세요.");
      return;
    }
    setErr("");
    setBusy("apply");
    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ changes, summary: proposal.summary }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "반영 실패");
      setApplied(data);
      setProposal(null);
      setNote("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "반영 실패");
    } finally {
      setBusy("");
    }
  }

  const working = busy !== "";

  return (
    <div className="upd">
      <h1>위키 업데이트</h1>
      <p className="upd-intro">
        새로 나눈 대화를 텍스트로 적거나 녹음해서 올리면, AI 가 어떤 문서를 어떻게
        고쳐야 할지 판단해 수정안을 만듭니다. 확인하고 승인하면 저장소에 커밋되고
        사이트가 자동으로 다시 배포됩니다.
      </p>

      <section className="upd-card">
        <label className="upd-label" htmlFor="secret">
          업데이트 비밀키
        </label>
        <input
          id="secret"
          type="password"
          value={secret}
          onChange={(e) => rememberSecret(e.target.value)}
          placeholder="UPDATE_SECRET 값"
          autoComplete="off"
        />
        <p className="upd-hint">
          이 브라우저에만 저장됩니다. 서버로는 요청할 때마다 헤더로만 보냅니다.
        </p>
      </section>

      <section className="upd-card">
        <label className="upd-label" htmlFor="note">
          반영할 내용
        </label>
        <textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={10}
          placeholder="예) 오늘 예식장 세 곳 문의했는데 A홀이 대관료 45만원에 주말 5월 15일 가능하대. 스냅 작가는 60만원으로 견적 받았어."
          disabled={working}
        />

        <div className="upd-audio">
          <button
            type="button"
            onClick={toggleRecording}
            disabled={working && busy !== "transcribe"}
            className={recording ? "rec" : ""}
          >
            {recording ? "⏹ 녹음 중지" : "🎙 녹음하기"}
          </button>

          <label className="upd-file">
            📁 오디오 파일
            <input
              type="file"
              accept="audio/*"
              disabled={working}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void sendAudio(f, f.name);
                e.target.value = "";
              }}
            />
          </label>

          {busy === "transcribe" && <span className="upd-status">음성 변환 중…</span>}
        </div>

        <button
          type="button"
          className="upd-primary"
          onClick={propose}
          disabled={working || !note.trim() || !secret}
        >
          {busy === "propose" ? "AI 가 판단 중…" : "수정안 만들기"}
        </button>
      </section>

      {err && <p className="upd-err">{err}</p>}

      {applied && (
        <section className="upd-card upd-ok">
          <h2>반영 완료</h2>
          <p>
            {applied.files.join(", ")} 을(를) 고쳐 커밋{" "}
            <a href={applied.url} target="_blank" rel="noreferrer">
              {applied.sha}
            </a>{" "}
            로 올렸습니다. 1분쯤 뒤 사이트에 반영됩니다.
          </p>
        </section>
      )}

      {proposal && (
        <section className="upd-card">
          <h2>수정안</h2>
          <p className="upd-summary">{proposal.summary}</p>
          {proposal.model && (
            <p className="upd-hint">모델: {proposal.model}</p>
          )}
          {!!proposal.rejected && (
            <p className="upd-err">
              허용되지 않은 경로 {proposal.rejected}건은 제외했습니다.
            </p>
          )}

          {proposal.changes.length === 0 ? (
            <p className="upd-hint">고칠 내용이 없다고 판단했습니다.</p>
          ) : (
            <>
              <ul className="upd-changes">
                {proposal.changes.map((c) => (
                  <li key={c.path}>
                    <label>
                      <input
                        type="checkbox"
                        checked={!!picked[c.path]}
                        onChange={(e) =>
                          setPicked((p) => ({ ...p, [c.path]: e.target.checked }))
                        }
                      />
                      <code>{c.path}</code>
                    </label>
                    {c.reason && <p className="upd-reason">{c.reason}</p>}
                    <button
                      type="button"
                      className="upd-link"
                      onClick={() =>
                        setOpenFile(openFile === c.path ? null : c.path)
                      }
                    >
                      {openFile === c.path ? "내용 접기" : "바뀐 전체 내용 보기"}
                    </button>
                    {openFile === c.path && <pre>{c.content}</pre>}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                className="upd-primary"
                onClick={apply}
                disabled={working}
              >
                {busy === "apply" ? "커밋 중…" : "선택한 파일 반영하기"}
              </button>
            </>
          )}
        </section>
      )}
    </div>
  );
}
