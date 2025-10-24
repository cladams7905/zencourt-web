import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  serverExternalPackages: [
    'fluent-ffmpeg',
    '@ffmpeg-installer/ffmpeg',
    '@ffmpeg-installer/darwin-arm64',
    '@ffmpeg-installer/darwin-x64',
    '@ffmpeg-installer/linux-arm64',
    '@ffmpeg-installer/linux-x64',
    '@ffmpeg-installer/win32-x64',
    '@ffprobe-installer/ffprobe',
    '@ffprobe-installer/darwin-arm64',
    '@ffprobe-installer/darwin-x64',
    '@ffprobe-installer/linux-arm64',
    '@ffprobe-installer/linux-x64',
    '@ffprobe-installer/win32-x64'
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.public.blob.vercel-storage.com",
        pathname: "/**"
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**"
      }
    ]
  }
};

export default nextConfig;
