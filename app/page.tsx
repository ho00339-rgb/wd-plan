import Shell from "@/components/Shell";
import MarkdownView from "@/components/MarkdownView";
import { getIndexPage, getNavPages } from "@/lib/wiki";

export const dynamic = "force-static";

export default function Home() {
  const index = getIndexPage();
  const nav = getNavPages().map((p) => ({ slug: p.slug, title: p.title }));
  return (
    <Shell nav={nav}>
      {index ? (
        <MarkdownView>{index.content}</MarkdownView>
      ) : (
        <p>위키 내용이 아직 없어요. <code>wiki/README.md</code> 를 확인해주세요.</p>
      )}
    </Shell>
  );
}
