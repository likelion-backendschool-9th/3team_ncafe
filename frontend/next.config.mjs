/** @type {import('next').NextConfig} */
const nextConfig = {
  // 개발 서버를 사설망 IP로 접속할 때 발생하는 cross-origin 차단 경고를 허용합니다.
  allowedDevOrigins: ["172.31.224.1"],
};

export default nextConfig;
