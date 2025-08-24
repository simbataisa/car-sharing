import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'static.wixstatic.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'build.ford.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'vinfastdaklak-auto.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
