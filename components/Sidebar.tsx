"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { slug: string; title: string };

export default function Sidebar({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <aside className="sidebar">
      <nav>
        <Link href="/" className={pathname === "/" ? "active" : ""}>
          🏠 홈 · 개요
        </Link>
        <Link
          href="/dashboard"
          className={pathname === "/dashboard" ? "active" : ""}
        >
          📊 대시보드
        </Link>
        <Link href="/update" className={pathname === "/update" ? "active" : ""}>
          ✏️ 업데이트
        </Link>
        <div className="sidebar-sep" />
        {items.map((it) => {
          const href = `/wiki/${it.slug}`;
          const active = decodeURIComponent(pathname) === href;
          return (
            <Link key={it.slug} href={href} className={active ? "active" : ""}>
              {it.title}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
