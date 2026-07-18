/** @type {import('next').NextConfig} */
const nextConfig = {
  // 위키 마크다운(.md)을 서버리스 함수(챗 API 등)에서 fs로 읽을 수 있게 번들에 포함
  outputFileTracingIncludes: {
    "/api/chat": ["./wiki/**/*.md"],
    "/wiki/**": ["./wiki/**/*.md"],
    "/": ["./wiki/**/*.md"],
  },
};

export default nextConfig;
