import { defineConfig } from "vite";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
const base = process.env.BASE_PATH || "/-the-last-extraction/";
export default defineConfig({
  base,
  build: { chunkSizeWarningLimit: 1600 },
  plugins: [
    {
      name: "offline",
      closeBundle() {
        const files = (d: string): string[] =>
          readdirSync(d, { withFileTypes: true }).flatMap((e) =>
            e.isDirectory() ? files(d + "/" + e.name) : [d + "/" + e.name],
          );
        const list = files("dist").filter((f) => !f.endsWith("sw.js"));
        const hash = createHash("sha256");
        list.forEach((f) => hash.update(readFileSync(f)));
        writeFileSync(
          "dist/sw.js",
          `const CACHE='tle-${hash.digest("hex").slice(0, 12)}';const FILES=${JSON.stringify(list.map((f) => base + f.slice(5)))};self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES))));self.addEventListener('message',e=>{if(e.data==='ACTIVATE')self.skipWaiting();if(e.data==='STATUS')e.waitUntil(caches.open(CACHE).then(async c=>{const ok=(await Promise.all(FILES.map(f=>c.match(f)))).every(Boolean);e.source?.postMessage({offline:ok});}));});self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('tle-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));self.addEventListener('fetch',e=>{if(e.request.method==='GET'&&new URL(e.request.url).origin===location.origin)e.respondWith(caches.open(CACHE).then(async c=>(await c.match(e.request,{ignoreVary:true}))||(e.request.mode==='navigate'?await c.match(new URL('index.html',self.registration.scope)):undefined)||fetch(e.request)));});`,
        );
      },
    },
  ],
});
