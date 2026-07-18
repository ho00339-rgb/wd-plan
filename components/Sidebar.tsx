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
