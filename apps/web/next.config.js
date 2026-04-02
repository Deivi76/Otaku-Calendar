/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.animeschedule.net',
      },
      {
        protocol: 'https',
        hostname: 'cdn.myanimelist.net',
      },
      {
        protocol: 'https',
        hostname: 'media.discordapp.net',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Exclude node-specific packages from client bundle
    config.externals = [...(config.externals || []), 'cheerio', 'undici', 'rss-parser'];
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
