import { describe, it, expect } from "vitest";
import { generateSite } from "../src/index.js";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const OUT = join(import.meta.dirname, "test-site");

describe("appfeed-web", () => {
  it("generates a static site", () => {
    if (existsSync(OUT)) rmSync(OUT, { recursive: true });
    generateSite({
      entries: [
        { name: "test-tool", version: "1.0.0", description: "A test", author: "phoenix", install: "npm i test-tool", tags: '["cli"]', category: "dev" },
      ],
      authors: [{ name: "phoenix", feed_title: "Phoenix Tools", feed_description: "Cool stuff" }],
    }, OUT);

    expect(existsSync(join(OUT, "index.html"))).toBe(true);
    expect(existsSync(join(OUT, "tool-test-tool.html"))).toBe(true);
    expect(existsSync(join(OUT, "author-phoenix.html"))).toBe(true);
    expect(existsSync(join(OUT, "categories.html"))).toBe(true);
    expect(existsSync(join(OUT, "authors.html"))).toBe(true);

    const index = readFileSync(join(OUT, "index.html"), "utf-8");
    expect(index).toContain("test-tool");
    expect(index).toContain("AppFeed");

    rmSync(OUT, { recursive: true });
  });
});
