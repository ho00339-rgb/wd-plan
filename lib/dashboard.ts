import fs from "node:fs";
import path from "node:path";

/** AI 가 갱신하는 대시보드 상태 파일 */
export const DASHBOARD_PATH = "data/dashboard.json";

export type Status = "done" | "doing" | "todo" | "estimate";

export type Dashboard = {
  updatedAt: string;
  wedding: { date: string; confirmed: boolean; note: string };
  budget: {
    currency: string;
    target: number;
    planned: number;
    items: { label: string; amount: number; status: Status }[];
  };
  progress: { label: string; status: Status; note: string }[];
  todos: { text: string; done: boolean; due: string }[];
};

export const EMPTY_DASHBOARD: Dashboard = {
  updatedAt: "",
  wedding: { date: "", confirmed: false, note: "" },
  budget: { currency: "KRW", target: 0, planned: 0, items: [] },
  progress: [],
  todos: [],
};

export function getDashboard(): Dashboard {
  try {
    const raw = fs.readFileSync(
      path.join(process.cwd(), DASHBOARD_PATH),
      "utf8"
    );
    return { ...EMPTY_DASHBOARD, ...JSON.parse(raw) } as Dashboard;
  } catch {
    return EMPTY_DASHBOARD;
  }
}

/** "1,300만원" 처럼 한국식으로 읽기 좋게 */
export function won(amount: number): string {
  if (!amount) return "0원";
  const man = Math.round(amount / 10000);
  return `${man.toLocaleString("ko-KR")}만원`;
}

/** 예식일까지 남은 일수. 날짜가 없으면 null */
export function daysUntil(date: string, from = new Date()): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const target = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(target.getTime())) return null;
  const today = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  return Math.round((target.getTime() - today) / 86400000);
}
