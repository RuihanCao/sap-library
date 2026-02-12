/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  serverExternalPackages: ["@napi-rs/canvas", "canvas"],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push("@napi-rs/canvas", "canvas");
    }
    return config;
  }
};

module.exports = nextConfig;
