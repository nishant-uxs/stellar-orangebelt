/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.externals.push({
      "utf-8-validate": "commonjs utf-8-validate",
      bufferutil: "commonjs bufferutil",
      "sodium-native": "commonjs sodium-native",
      "require-addon": "commonjs require-addon",
    });
    return config;
  },
};

export default nextConfig;
