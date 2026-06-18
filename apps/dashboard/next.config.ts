import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@shiplocal/shared'],
  // Required when the dashboard is reached via app.shiplocal.cloud (not localhost).
  // Also covers accidental `next dev` behind Caddy during early deploys.
  allowedDevOrigins: ['app.shiplocal.cloud', '*.shiplocal.cloud', 'localhost', '127.0.0.1'],
};

export default nextConfig;
