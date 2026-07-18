import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "결혼 준비 · 호연 ♥ 예준",
  description: "우리 둘의 결혼 준비 위키",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
