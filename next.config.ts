import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async headers () {
    return [{
      source: '/',
      headers: [{
        key: 'Access-Control-Allow-Origin',
        value: '*'
      }]
    }]
  }
};

export default nextConfig;
