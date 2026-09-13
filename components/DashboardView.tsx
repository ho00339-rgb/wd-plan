import type { Dashboard, Status } from "@/lib/dashboard";
import { won, daysUntil } from "@/lib/dashboard";

const DOT: Record<Status, string> = {
  done: "✅",
  doing: "🟡",
  todo: "🔴",
  estimate: "🟡",
};

const STATUS_LABEL: Record<Status, string> = {
  done: "정해짐",
  doing: "논의 중",
  todo: "아직",
  estimate: "추정",
};

export default function DashboardView({ data }: { data: Dashboard }) {
  const dday = daysUntil(data.wedding.date);
  const { target, planned } = data.budget;
  const over = planned - target;
  // 막대는 목표 대비 비율. 초과해도 100%를 넘지 않게 잘라서 그립니다.
  const filled = target > 0 ? Math.min(100, Math.round((planned / target) * 100)) : 0;
  const doneTodos = data.todos.filter((t) => t.done).length;

  return (
    <div className="dash">
      <div className="dash-top">
        <section className="dash-card dash-dday">
          <h2>예식까지</h2>
          {dday === null ? (
            <p className="dash-big">미정</p>
          ) : (
            <p className="dash-big">
              {dday > 0 ? `D-${dday}` : dday === 0 ? "D-day" : `D+${-dday}`}
            </p>
          )}
          <p className="dash-sub">
            {data.wedding.date || "날짜 미정"}
            {data.wedding.confirmed ? " · 확정" : " · 잠정"}
          </p>
          {data.wedding.note && <p className="dash-note">{data.wedding.note}</p>}
        </section>

        <section className="dash-card">
          <h2>예산</h2>
          <p className="dash-big">{won(planned)}</p>
          <p className="dash-sub">목표 {won(target)}</p>
          <div className="dash-bar">
            <span style={{ width: `${filled}%` }} data-over={over > 0} />
          </div>
          <p className={over > 0 ? "dash-note over" : "dash-note"}>
            {over > 0
              ? `목표보다 ${won(over)} 초과`
              : over < 0
                ? `목표보다 ${won(-over)} 여유`
                : "목표와 동일"}
          </p>
        </section>

        <section className="dash-card">
          <h2>할 일</h2>
          <p className="dash-big">
            {doneTodos}
            <span className="dash-of"> / {data.todos.length}</span>
          </p>
          <p className="dash-sub">완료한 항목</p>
          {data.updatedAt && (
            <p className="dash-note">마지막 갱신 {data.updatedAt}</p>
          )}
        </section>
      </div>

      <section className="dash-card">
        <h2>항목별 예산</h2>
        <ul className="dash-list">
          {data.budget.items.map((it, i) => (
            <li key={`${it.label}-${i}`}>
              <span className="dash-dot">{DOT[it.status] ?? "🟡"}</span>
              <span className="dash-label">{it.label}</span>
              <span className="dash-amount">{won(it.amount)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="dash-card">
        <h2>진행 상황</h2>
        <ul className="dash-list">
          {data.progress.map((p, i) => (
            <li key={`${p.label}-${i}`}>
              <span className="dash-dot">{DOT[p.status] ?? "🟡"}</span>
              <span className="dash-label">{p.label}</span>
              <span className="dash-meta">
                {STATUS_LABEL[p.status] ?? ""}
                {p.note ? ` · ${p.note}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="dash-card">
        <h2>다음 할 일</h2>
        <ul className="dash-list">
          {data.todos.map((t, i) => (
            <li key={`${t.text}-${i}`}>
              <span className="dash-dot">{t.done ? "☑️" : "⬜"}</span>
              <span className={t.done ? "dash-label done" : "dash-label"}>
                {t.text}
              </span>
              {t.due && <span className="dash-meta">{t.due}</span>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
