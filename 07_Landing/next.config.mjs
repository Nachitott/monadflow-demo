/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Export estático: la landing se sirve como HTML/CSS/JS puro, sin servidor.
  output: 'export',
  images: { unoptimized: true },
};

export default nextConfig;