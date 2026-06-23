/** @type {import('next').NextConfig} */
// Static export so it can ship to GitHub Pages with no server. Prices are fetched
// client-side from EnergyZero (open CORS), so a static page still shows live data.
const repo = "energypuls"; // GitHub Pages project path: tutai-tran.github.io/energypuls
const nextConfig = {
  output: "export",
  reactStrictMode: true,
  basePath: `/${repo}`,
  assetPrefix: `/${repo}/`,
  images: { unoptimized: true },
  trailingSlash: true,
};
export default nextConfig;
