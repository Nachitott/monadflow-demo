/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    // Optional peer deps pulled in by wagmi's coinbase/base connectors that we never use.
    config.resolve.alias = {
      ...config.resolve.alias,
      '@x402/evm$': false,
      '@x402/evm/upto/client$': false,
      '@x402/evm/exact/client$': false,
      '@x402/core/client$': false,
      '@x402/svm/exact/client$': false,
      '@react-native-async-storage/async-storage$': false,
    };
    return config;
  },
};

export default nextConfig;
