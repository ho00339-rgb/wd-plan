import Shell from "@/components/Shell";
import DashboardView from "@/components/DashboardView";
import { getNavPages } from "@/lib/wiki";
import { getDashboard } from "@/lib/dashboard";

export const dynamic = "force-static";

export const metadata = { title: "대시보드" };

export default function DashboardPage() {
  const nav = getNavPages().map((p) => ({ slug: p.slug, title: p.title }));
  return (
    <Shell nav={nav}>
      <DashboardView data={getDashboard()} />
    </Shell>
  );
}
