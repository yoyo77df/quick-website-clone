#!/usr/bin/env node
// Transforms Nitro's `dist/` (vercel preset) into Vercel Build Output API v3 (`.vercel/output/`).
import { cp, mkdir, rm, writeFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

const root = process.cwd();
const dist = resolve(root, "dist");
const out = resolve(root, ".vercel/output");

async function exists(p) {
  try { await stat(p); return true; } catch { return false; }
}

async function main() {
  if (!(await exists(dist))) {
    throw new Error(`dist/ not found at ${dist} — did vite build run?`);
  }

  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  await mkdir(join(out, "static"), { recursive: true });
  await mkdir(join(out, "functions", "__server.func"), { recursive: true });

  // Locate client + server output (nitro vercel preset layout can vary).
  const candidates = await readdir(dist, { withFileTypes: true });
  const names = candidates.map((d) => d.name);

  // Client assets
  const clientDir = ["client", "public", "static"].map((n) => join(dist, n)).find((p) => existsSync(p));
  if (clientDir) {
    await cp(clientDir, join(out, "static"), { recursive: true });
  }

  // Server bundle
  const serverDir = ["server", "_server", "ssr"].map((n) => join(dist, n)).find((p) => existsSync(p));
  if (!serverDir) {
    throw new Error(`Could not locate server bundle in dist/. Saw: ${names.join(", ")}`);
  }
  await cp(serverDir, join(out, "functions", "__server.func"), { recursive: true });

  // Ensure entry file name `index.mjs` exists in the function dir.
  const fnDir = join(out, "functions", "__server.func");
  const fnEntries = await readdir(fnDir);
  const hasIndex = fnEntries.includes("index.mjs");
  if (!hasIndex) {
    const guess = fnEntries.find((f) => /^(index|server|entry)\.(m?js)$/.test(f));
    if (guess) {
      await writeFile(
        join(fnDir, "index.mjs"),
        `export { default } from "./${guess}";\n`,
      );
    } else {
      throw new Error(`No server entry found in ${fnDir}. Files: ${fnEntries.join(", ")}`);
    }
  }

  await writeFile(
    join(fnDir, ".vc-config.json"),
    JSON.stringify(
      {
        runtime: "nodejs22.x",
        handler: "index.mjs",
        launcherType: "Nodejs",
        supportsResponseStreaming: true,
      },
      null,
      2,
    ),
  );

  const config = {
    version: 3,
    routes: [
      { handle: "filesystem" },
      { src: "/(.*)", dest: "/__server" },
    ],
  };
  await writeFile(join(out, "config.json"), JSON.stringify(config, null, 2));

  console.log("✓ Vercel Build Output prepared at .vercel/output/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
