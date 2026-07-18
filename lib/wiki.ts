import fs from "node:fs";
import path from "node:path";

const WIKI_DIR = path.join(process.cwd(), "wiki");

export type WikiPage = {
  slug: string; // 파일명(확장자 제외). 예: "01-결혼식", "README"
  title: string; // 문서 첫 번째 # 제목
  content: string; // 원본 마크다운
  isIndex: boolean; // README 여부
};

function titleFromMarkdown(md: string, fallback: string): string {
  const m = md.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : fallback;
}

function readPage(file: string): WikiPage {
  const slug = file.replace(/\.md$/i, "");
  const content = fs.readFileSync(path.join(WIKI_DIR, file), "utf8");
  return {
    slug,
    title: titleFromMarkdown(content, slug),
    content,
    isIndex: /^readme$/i.test(slug),
  };
}

/** README 를 제외한 목차용 페이지들 (파일명 순) */
export function getNavPages(): WikiPage[] {
  return listFiles()
    .map(readPage)
    .filter((p) => !p.isIndex)
    .sort((a, b) => a.slug.localeCompare(b.slug, "ko"));
}

export function getIndexPage(): WikiPage | null {
  const files = listFiles();
  const readme = files.find((f) => /^readme\.md$/i.test(f));
  return readme ? readPage(readme) : null;
}

export function getPage(slug: string): WikiPage | null {
  const file = listFiles().find((f) => f.replace(/\.md$/i, "") === slug);
  return file ? readPage(file) : null;
}

/** 모든 페이지를 하나의 문자열로 (LLM 컨텍스트용) */
export function getWikiContext(): string {
  const index = getIndexPage();
  const pages = getNavPages();
  const all = [index, ...pages].filter(Boolean) as WikiPage[];
  return all
    .map((p) => `### 파일: ${p.slug}.md\n\n${p.content}`)
    .join("\n\n---\n\n");
}

function listFiles(): string[] {
  try {
    return fs.readdirSync(WIKI_DIR).filter((f) => f.endsWith(".md"));
  } catch {
    return [];
  }
}
