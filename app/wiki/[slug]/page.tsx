import { notFound } from "next/navigation";
import Shell from "@/components/Shell";
import MarkdownView from "@/components/MarkdownView";
import { getNavPages, getPage } from "@/lib/wiki";

export function generateStaticParams() {
  return getNavPages().map((p) => ({ slug: p.slug }));
}

export default async function WikiPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);
  const page = getPage(decoded);
  if (!page) notFound();

  const nav = getNavPages().map((p) => ({ slug: p.slug, title: p.title }));
  return (
    <Shell nav={nav}>
      <MarkdownView>{page.content}</MarkdownView>
    </Shell>
  );
}
