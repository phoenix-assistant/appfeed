#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

interface Entry {
  name: string;
  version: string;
  description: string;
  author: string;
  tags?: string;
  category?: string;
  homepage?: string;
  repository?: string;
  install: string;
  platforms?: string;
}

interface Author {
  name: string;
  feed_title?: string;
  feed_description?: string;
}

interface RegistryData {
  entries: Entry[];
  authors: Author[];
}

const CSS = `
:root { --bg: #0a0a0a; --fg: #e0e0e0; --accent: #4fc3f7; --card: #1a1a1a; --border: #333; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: var(--bg); color: var(--fg); line-height: 1.6; max-width: 960px; margin: 0 auto; padding: 2rem 1rem; }
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }
h1 { font-size: 2rem; margin-bottom: 0.5rem; }
h2 { font-size: 1.4rem; margin: 1.5rem 0 0.5rem; border-bottom: 1px solid var(--border); padding-bottom: 0.3rem; }
.subtitle { color: #888; margin-bottom: 2rem; }
.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
.card { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 1rem; }
.card h3 { font-size: 1.1rem; margin-bottom: 0.3rem; }
.card .meta { font-size: 0.8rem; color: #888; }
.card .desc { margin: 0.5rem 0; }
.tag { display: inline-block; background: #222; border-radius: 4px; padding: 0.1rem 0.4rem; font-size: 0.75rem; margin-right: 0.3rem; color: var(--accent); }
.install { font-family: monospace; background: #111; padding: 0.3rem 0.5rem; border-radius: 4px; font-size: 0.85rem; display: block; margin-top: 0.5rem; }
nav { margin-bottom: 2rem; }
nav a { margin-right: 1rem; }
.search { width: 100%; padding: 0.5rem; background: var(--card); border: 1px solid var(--border); border-radius: 6px; color: var(--fg); font-size: 1rem; margin-bottom: 1.5rem; }
`;

function html(title: string, body: string, breadcrumb?: string): string {
  const nav = breadcrumb ?? `<nav><a href="index.html">Home</a> <a href="categories.html">Categories</a> <a href="authors.html">Authors</a></nav>`;
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} — AppFeed</title><style>${CSS}</style></head>
<body>${nav}<h1>${esc(title)}</h1>${body}</body></html>`;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function entryCard(e: Entry): string {
  const tags = parseTags(e.tags);
  return `<div class="card">
  <h3><a href="tool-${esc(e.name)}.html">${esc(e.name)}</a> <span class="meta">v${esc(e.version)}</span></h3>
  <div class="meta">by <a href="author-${esc(e.author)}.html">${esc(e.author)}</a> · ${esc(e.category ?? "uncategorized")}</div>
  <p class="desc">${esc(e.description)}</p>
  <div>${tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>
  <code class="install">${esc(e.install)}</code>
</div>`;
}

function parseTags(t?: string): string[] {
  if (!t) return [];
  try { return JSON.parse(t); } catch { return []; }
}

export function generateSite(data: RegistryData, outDir: string): void {
  mkdirSync(outDir, { recursive: true });

  // Index
  writeFileSync(join(outDir, "index.html"), html("AppFeed Registry",
    `<p class="subtitle">Discover micro-apps, tools, and skills</p>
    <input class="search" placeholder="Search tools..." id="search" oninput="filter()" />
    <div class="cards" id="cards">${data.entries.map(entryCard).join("")}</div>
    <script>function filter(){const q=document.getElementById('search').value.toLowerCase();document.querySelectorAll('.card').forEach(c=>{c.style.display=c.textContent.toLowerCase().includes(q)?'':'none'})}</script>`
  ));

  // Tool detail pages
  for (const e of data.entries) {
    const tags = parseTags(e.tags);
    const platforms = parseTags(e.platforms);
    writeFileSync(join(outDir, `tool-${e.name}.html`), html(e.name,
      `<p class="meta">v${esc(e.version)} by <a href="author-${esc(e.author)}.html">${esc(e.author)}</a></p>
      <p>${esc(e.description)}</p>
      <h2>Install</h2><code class="install">${esc(e.install)}</code>
      <h2>Details</h2>
      <p>Category: ${esc(e.category ?? "uncategorized")}</p>
      <p>Platforms: ${platforms.join(", ") || "any"}</p>
      <p>Tags: ${tags.map((t) => `<span class="tag">${esc(t)}</span>`).join(" ") || "none"}</p>
      ${e.homepage ? `<p><a href="${esc(e.homepage)}">Homepage</a></p>` : ""}
      ${e.repository ? `<p><a href="${esc(e.repository)}">Repository</a></p>` : ""}`
    ));
  }

  // Categories
  const cats = new Map<string, Entry[]>();
  for (const e of data.entries) {
    const cat = e.category ?? "uncategorized";
    if (!cats.has(cat)) cats.set(cat, []);
    cats.get(cat)!.push(e);
  }
  writeFileSync(join(outDir, "categories.html"), html("Categories",
    Array.from(cats.entries()).map(([cat, entries]) =>
      `<h2>${esc(cat)}</h2><div class="cards">${entries.map(entryCard).join("")}</div>`
    ).join("")
  ));

  // Authors
  writeFileSync(join(outDir, "authors.html"), html("Authors",
    `<div class="cards">${data.authors.map((a) =>
      `<div class="card"><h3><a href="author-${esc(a.name)}.html">${esc(a.name)}</a></h3><p>${esc(a.feed_description ?? "")}</p></div>`
    ).join("")}</div>`
  ));

  // Author detail pages
  for (const a of data.authors) {
    const entries = data.entries.filter((e) => e.author === a.name);
    writeFileSync(join(outDir, `author-${a.name}.html`), html(a.name,
      `<p class="subtitle">${esc(a.feed_description ?? "")}</p>
      <div class="cards">${entries.map(entryCard).join("")}</div>`
    ));
  }
}

// CLI entry
if (process.argv[1]?.endsWith("index.js") || process.argv[1]?.endsWith("index.ts")) {
  const registryUrl = process.argv[2] ?? "http://localhost:3456";
  const outDir = process.argv[3] ?? "site";

  console.log(`Fetching from ${registryUrl}...`);

  const [browseRes, authorsRes] = await Promise.all([
    fetch(`${registryUrl}/browse`),
    fetch(`${registryUrl}/browse`), // authors come from entries
  ]);
  const entries = (await browseRes.json()) as Entry[];
  const authorNames = [...new Set(entries.map((e) => e.author))];
  const authors: Author[] = authorNames.map((name) => ({ name }));

  generateSite({ entries, authors }, outDir);
  console.log(`✅ Site generated in ${outDir}/`);
}
