import Shell from "@/components/Shell";
import UpdatePanel from "@/components/UpdatePanel";
import { getNavPages } from "@/lib/wiki";

export const dynamic = "force-static";

export const metadata = { title: "위키 업데이트" };

export default function UpdatePage() {
  const nav = getNavPages().map((p) => ({ slug: p.slug, title: p.title }));
  return (
    <Shell nav={nav}>
      <UpdatePanel />
    </Shell>
  );
}
