import { mkdir, copyFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const dist = resolve(root, 'dist');
const serverDir = resolve(dist, 'server');

await mkdir(serverDir, { recursive: true });
await mkdir(resolve(dist, '.openai'), { recursive: true });
await copyFile(resolve(root, '.openai', 'hosting.json'), resolve(dist, '.openai', 'hosting.json'));

await writeFile(
  resolve(serverDir, 'index.js'),
  `const INDEX_PATHS = new Set(["/", "/index.html"]);

function withIndexFallback(request) {
  const url = new URL(request.url);
  if (url.pathname.includes(".") || INDEX_PATHS.has(url.pathname)) return request;
  url.pathname = "/index.html";
  return new Request(url, request);
}

export default {
  async fetch(request, env) {
    const assets = env && (env.ASSETS || env.__STATIC_CONTENT);
    if (!assets || typeof assets.fetch !== "function") {
      return new Response("Static asset binding is unavailable.", { status: 500 });
    }

    const response = await assets.fetch(request);
    if (response.status !== 404) return response;
    return assets.fetch(withIndexFallback(request));
  },
};
`,
  'utf8'
);
