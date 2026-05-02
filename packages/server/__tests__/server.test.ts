import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../src/index.js";

const validFeed = {
  title: "Test Feed",
  author: "tester",
  updated: new Date().toISOString(),
  entries: [
    { name: "my-tool", version: "1.0.0", description: "A test tool", author: "tester", install: "npm i my-tool", tags: ["test"], category: "dev" },
  ],
};

describe("appfeed-server", () => {
  let app: ReturnType<typeof createApp>["app"];

  beforeEach(() => {
    ({ app } = createApp());
  });

  it("POST /publish accepts valid feed", async () => {
    const res = await app.request("/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validFeed),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("POST /publish rejects invalid feed", async () => {
    const res = await app.request("/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bad: true }),
    });
    expect(res.status).toBe(400);
  });

  it("GET /search returns published entries", async () => {
    await app.request("/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validFeed),
    });
    const res = await app.request("/search?q=my-tool");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe("my-tool");
  });

  it("GET /browse returns all entries", async () => {
    await app.request("/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validFeed),
    });
    const res = await app.request("/browse");
    const data = await res.json();
    expect(data.length).toBeGreaterThan(0);
  });

  it("GET /trending returns entries", async () => {
    await app.request("/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validFeed),
    });
    const res = await app.request("/trending");
    const data = await res.json();
    expect(data.length).toBeGreaterThan(0);
  });

  it("GET /authors/:name returns author + entries", async () => {
    await app.request("/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validFeed),
    });
    const res = await app.request("/authors/tester");
    const data = await res.json();
    expect(data.author).toBeDefined();
    expect(data.entries).toHaveLength(1);
  });

  it("GET /authors/:name/feed.xml returns RSS", async () => {
    await app.request("/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validFeed),
    });
    const res = await app.request("/authors/tester/feed.xml");
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("<rss");
    expect(text).toContain("my-tool");
  });
});
