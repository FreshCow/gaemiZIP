import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // EC2 배포 시 node_modules 없이 단독 실행 가능한 빌드 산출물 생성
  output: "standalone",
};

export default nextConfig;
