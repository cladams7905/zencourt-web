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
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude ffmpeg/ffprobe binaries from being processed
      config.externals = config.externals || [];
      config.externals.push({
        'fluent-ffmpeg': 'commonjs fluent-ffmpeg',
        '@ffmpeg-installer/ffmpeg': 'commonjs @ffmpeg-installer/ffmpeg',
        '@ffprobe-installer/ffprobe': 'commonjs @ffprobe-installer/ffprobe',
      });

      // Ignore binary files in ffmpeg/ffprobe installer packages
      config.module = config.module || {};
      config.module.rules = config.module.rules || [];
      config.module.rules.push({
        test: /node_modules\/@ffmpeg-installer\/.*\/ffmpeg$/,
        use: 'ignore-loader',
      });
      config.module.rules.push({
        test: /node_modules\/@ffprobe-installer\/.*\/ffprobe$/,
        use: 'ignore-loader',
      });
    }
    return config;
  },
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
