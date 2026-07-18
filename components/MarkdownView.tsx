"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";

/** 위키 문서 내 상대 링크(01-결혼식.md)를 앱 라우트(/wiki/01-결혼식)로 변환 */
function toHref(href?: string): { href: string; internal: boolean } {
  if (!href) return { href: "#", internal: false };
  if (/^https?:\/\//.test(href)) return { href, internal: false };
  const m = href.match(/^([^#?]+?)\.md(#.*)?$/i);
  if (m) {
    const slug = m[1].replace(/^\.\//, "");
    if (/^readme$/i.test(slug)) return { href: "/", internal: true };
    return { href: `/wiki/${slug}`, internal: true };
  }
  return { href, internal: false };
}

export default function MarkdownView({ children }: { children: string }) {
  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a({ href, children }) {
            const { href: resolved, internal } = toHref(href);
            if (internal) return <Link href={resolved}>{children}</Link>;
            return (
              <a href={resolved} target="_blank" rel="noreferrer">
                {children}
              </a>
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
