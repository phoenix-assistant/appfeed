import { Hono } from "hono";
import type Database from "better-sqlite3";
import { validateFeed, type AppFeed } from "@phoenixaihub/appfeed-spec";
import { createDb } from "./db.js";

export function createApp(db?: Database.Database): { app: Hono; db: Database.Database } {
  const d = db ?? createDb();
  const app = new Hono();

  // --- Publish ---
  app.post("/publish", async (c) => {
    const body = await c.req.json<unknown>();
    const result = validateFeed(body);
    if (!result.valid) {
      return c.json({ error: "Invalid feed", details: result.errors }, 400);
    }
    const feed = body as AppFeed;

    const upsertAuthor = d.prepare(
      `INSERT INTO authors (name, feed_title, feed_description, icon, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'))
       ON CONFLICT(name) DO UPDATE SET feed_title=excluded.feed_title, feed_description=excluded.feed_description, icon=excluded.icon, updated_at=excluded.updated_at`
    );
    upsertAuthor.run(feed.author, feed.title, feed.description ?? "", feed.icon ?? null);

    const upsertEntry = d.prepare(
      `INSERT INTO entries (name, version, description, author, tags, install, homepage, repository, changelog, platforms, category)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(name, version) DO UPDATE SET description=excluded.description, tags=excluded.tags, install=excluded.install, homepage=excluded.homepage, repository=excluded.repository, changelog=excluded.changelog, platforms=excluded.platforms, category=excluded.category`
    );

    for (const e of feed.entries) {
      upsertEntry.run(
        e.name, e.version, e.description, e.author,
        JSON.stringify(e.tags ?? []), e.install,
        e.homepage ?? null, e.repository ?? null, e.changelog ?? null,
        JSON.stringify(e.platforms ?? ["any"]), e.category ?? "uncategorized"
      );
    }

    return c.json({ ok: true, entries: feed.entries.length });
  });

  // --- Search ---
  app.get("/search", (c) => {
    const q = c.req.query("q") ?? "";
    const rows = d.prepare(
      `SELECT * FROM entries WHERE name LIKE ? OR description LIKE ? OR tags LIKE ? ORDER BY published_at DESC LIMIT 50`
    ).all(`%${q}%`, `%${q}%`, `%${q}%`);
    return c.json(rows);
  });

  // --- Browse ---
  app.get("/browse", (c) => {
    const cat = c.req.query("category");
    const rows = cat
      ? d.prepare(`SELECT * FROM entries WHERE category = ? ORDER BY published_at DESC LIMIT 100`).all(cat)
      : d.prepare(`SELECT * FROM entries ORDER BY published_at DESC LIMIT 100`).all();
    return c.json(rows);
  });

  // --- Trending ---
  app.get("/trending", (c) => {
    // Time-decayed score: installs / (hours_since_publish + 2)^1.5
    const rows = d.prepare(`
      SELECT *, (installs * 1.0) / POWER((julianday('now') - julianday(published_at)) * 24 + 2, 1.5) AS score
      FROM entries ORDER BY score DESC LIMIT 20
    `).all();
    return c.json(rows);
  });

  // --- Author detail ---
  app.get("/authors/:name", (c) => {
    const name = c.req.param("name");
    const author = d.prepare(`SELECT * FROM authors WHERE name = ?`).get(name);
    if (!author) return c.json({ error: "Author not found" }, 404);
    const entries = d.prepare(`SELECT * FROM entries WHERE author = ? ORDER BY published_at DESC`).all(name);
    return c.json({ author, entries });
  });

  // --- RSS/Atom feed ---
  app.get("/authors/:name/feed.xml", (c) => {
    const name = c.req.param("name");
    const author = d.prepare(`SELECT * FROM authors WHERE name = ?`).get(name) as Record<string, string> | undefined;
    if (!author) return c.text("Author not found", 404);
    const entries = d.prepare(`SELECT * FROM entries WHERE author = ? ORDER BY published_at DESC LIMIT 50`).all(name) as Array<Record<string, string>>;

    const items = entries.map((e) => `
    <item>
      <title>${escapeXml(e.name)} v${escapeXml(e.version)}</title>
      <description>${escapeXml(e.description)}</description>
      <pubDate>${new Date(e.published_at).toUTCString()}</pubDate>
      <guid>${escapeXml(e.name)}-${escapeXml(e.version)}</guid>
    </item>`).join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(author.feed_title ?? name)}</title>
    <description>${escapeXml(author.feed_description ?? "")}</description>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${items}
  </channel>
</rss>`;
    return c.text(xml, 200, { "Content-Type": "application/rss+xml" });
  });

  return { app, db: d };
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
