/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "file2.nocutnews.co.kr" },
      { protocol: "https", hostname: "i.ytimg.com" },
    ],
  },
};
export default nextConfig;
